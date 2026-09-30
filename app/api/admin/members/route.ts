import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions, hasRole, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTempPassword } from "@/lib/tempPassword";

const ROLES = ["INVITE", "MEMBRE", "RESPONSABLE", "BUREAU", "ADMIN"] as const;
const STATUSES = ["ACTIF", "EN_ATTENTE", "INACTIF"] as const;

const createSchema = z.object({
  email: z.string().email(),
  // Facultatifs pour un compte INVITE (pas de fiche membre) — obligatoires
  // sinon, vérifié plus bas selon le rôle choisi.
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nickname: z.string().optional(),
  role: z.enum(ROLES).default("MEMBRE"),
  membershipStatus: z.enum(STATUSES).default("ACTIF"),
  publicResults: z.boolean().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  password: z.string().min(8).optional(),
});

/**
 * GET /api/admin/members — liste tous les comptes (membres + admins).
 * Réservé aux administrateurs : la création de comptes, y compris
 * d'autres comptes admin, est une action sensible.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "ADMIN")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: { member: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    isSuperAdmin: isSuperAdmin((session.user as any).email),
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      displayName: u.displayName,
      createdAt: u.createdAt,
      member: u.member
        ? {
            id: u.member.id,
            firstName: u.member.firstName,
            lastName: u.member.lastName,
            nickname: u.member.nickname,
            membershipStatus: u.member.membershipStatus,
            publicResults: u.member.publicResults,
            birthDate: u.member.birthDate,
            legacyRankingPlace: u.member.legacyRankingPlace,
          }
        : null,
    })),
  });
}

/**
 * POST /api/admin/members — crée un nouveau compte (membre ou admin).
 * Un mot de passe temporaire est généré si aucun n'est fourni ; il est
 * renvoyé une seule fois dans la réponse pour être transmis au membre.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "ADMIN")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Seul le propriétaire du site peut créer un compte avec le rôle ADMIN —
  // les autres admins peuvent créer/valider des membres, jamais des admins.
  if (data.role === "ADMIN" && !isSuperAdmin((session.user as any).email)) {
    return NextResponse.json(
      { error: "Seul le propriétaire du site peut créer un compte administrateur." },
      { status: 403 }
    );
  }

  const email = data.email.toLowerCase().trim();
  const isInvite = data.role === "INVITE";

  if (!isInvite && (!data.firstName?.trim() || !data.lastName?.trim() || !data.nickname?.trim())) {
    return NextResponse.json(
      { error: "Prénom, nom et pseudo sont obligatoires pour ce rôle." },
      { status: 400 }
    );
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }
  if (!isInvite) {
    const existingNickname = await prisma.member.findUnique({ where: { nickname: data.nickname! } });
    if (existingNickname) {
      return NextResponse.json({ error: "Ce pseudo est déjà utilisé par un autre membre." }, { status: 409 });
    }
  }

  const plainPassword = data.password ?? generateTempPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: data.role,
      ...(isInvite
        ? { displayName: data.firstName?.trim() || data.nickname?.trim() || null }
        : {
            member: {
              create: {
                firstName: data.firstName!.trim(),
                lastName: data.lastName!.trim(),
                nickname: data.nickname!.trim(),
                membershipStatus: data.membershipStatus,
                publicResults: data.publicResults ?? false,
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
              },
            },
          }),
    },
    include: { member: true },
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role, member: user.member },
    // Renvoyé une seule fois : le mot de passe n'est jamais stocké en clair côté serveur.
    generatedPassword: data.password ? null : plainPassword,
  });
}
