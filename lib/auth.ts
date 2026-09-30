import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRateLimited, extractIp } from "@/lib/rateLimit";

// Hiérarchie des rôles — du moins au plus élevé. INVITE est le niveau le
// plus bas : un accès invité (personne hors club, autorisée sur le forum
// uniquement, sans fiche Member).
const ROLE_ORDER = ["INVITE", "MEMBRE", "RESPONSABLE", "BUREAU", "ADMIN"] as const;
export type AppRole = (typeof ROLE_ORDER)[number];

/** Vrai si `role` a un niveau >= `required` dans la hiérarchie du club. */
export function hasRole(role: string | undefined | null, required: AppRole): boolean {
  if (!role) return false;
  const roleIdx = ROLE_ORDER.indexOf(role as AppRole);
  const requiredIdx = ROLE_ORDER.indexOf(required);
  if (roleIdx === -1 || requiredIdx === -1) return false;
  return roleIdx >= requiredIdx;
}

// Compte "propriétaire" du site — le seul autorisé à accorder ou retirer le
// rôle ADMIN à un autre compte. Les autres admins peuvent valider les
// membres et changer leur statut, mais jamais créer/désigner un autre admin.
// Configurable via la variable d'environnement SUPER_ADMIN_EMAIL si besoin
// (ex. changement de propriétaire), avec l'adresse d'Emeric par défaut.
export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "eessomba.nc@gmail.com")
  .toLowerCase()
  .trim();

/** Vrai si cette adresse e-mail est celle du propriétaire du site. */
export function isSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
}

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    // Déconnexion automatique après 8h d'inactivité (voir aussi
    // components/IdleLogout.tsx, qui déconnecte activement côté navigateur
    // même si l'onglet reste ouvert sans qu'aucune requête ne soit faite) :
    // maxAge fixe la durée de validité du cookie de session, updateAge le
    // renouvelle à chaque activité dans cette fenêtre — sans activité
    // pendant 8h, le cookie expire de lui-même et la session suivante
    // redemande une connexion.
    maxAge: 8 * 60 * 60, // 8 heures
    updateAge: 60 * 60, // renouvelé au plus toutes les heures
  },
  pages: {
    signIn: "/connexion",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        identifier: { label: "Email ou pseudo", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, req) {
        const identifier = credentials?.identifier?.trim();
        if (!identifier || !credentials?.password) return null;

        // Anti force-brute : au-delà de 5 tentatives en 5 minutes pour ce
        // couple IP + identifiant, on bloque avant même de vérifier le mot
        // de passe (voir lib/rateLimit.ts).
        const ip = extractIp(req?.headers as any);
        if (isRateLimited(`login:${ip}:${identifier.toLowerCase()}`, 5, 5 * 60 * 1000)) {
          throw new Error("Trop de tentatives de connexion. Réessayez dans quelques minutes.");
        }

        // Connexion possible par e-mail (compte) ou par pseudo (fiche membre) —
        // on essaie l'e-mail d'abord, puis le pseudo en repli.
        let user = await prisma.user.findUnique({
          where: { email: identifier.toLowerCase() },
          include: { member: true },
        });

        if (!user) {
          const member = await prisma.member.findFirst({
            where: { nickname: { equals: identifier, mode: "insensitive" } },
            include: { user: true },
          });
          if (member) {
            user = { ...member.user, member } as any;
          }
        }

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // Horodatage de connexion — sert au compteur "connectés (24h)" de
        // l'accueil (voir app/page.tsx, getRecentLogins). Ne bloque jamais la
        // connexion si l'écriture échoue.
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.member
            ? `${user.member.firstName} ${user.member.lastName}`
            : (user as any).displayName || user.email,
          nickname: user.member?.nickname ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.nickname = (user as any).nickname;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).nickname = token.nickname;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
