import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPlaceholderMember } from "@/lib/placeholderMembers";
import { isRateLimited, extractIp } from "@/lib/rateLimit";

const createSchema = z.object({
  type: z.enum(["ADHESION", "INVITE_FORUM"]).default("ADHESION"),
  // Uniquement demandés (et vérifiés) pour une adhésion complète — un accès
  // invité n'a pas de fiche membre, donc pas besoin d'état civil.
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  nickname: z.string().min(2, "Le nom ou pseudo doit contenir au moins 2 caractères.").max(40),
  email: z.string().email("Adresse e-mail invalide."),
  // Uniquement demandée (et vérifiée) pour une adhésion complète — le forum
  // n'étant pas lié aux tournois d'argent réel, un accès invité n'en a pas besoin.
  birthDate: z.string().optional(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

/** Âge en années révolues à la date du jour. */
function getAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

/**
 * POST /api/membership-requests — formulaire public "Devenir membre".
 * Enregistre une demande d'adhésion (pseudo, e-mail, mot de passe) mais ne
 * crée aucun compte : seule la validation par un admin ou un responsable,
 * depuis /admin/demandes-adhesion, crée réellement l'espace membre.
 */
export async function POST(req: NextRequest) {
  // Anti-abus : une demande légitime est un événement rare pour une même
  // adresse — au-delà de 5 par heure et par IP, on considère que c'est du
  // spam ou une tentative automatisée.
  const ip = extractIp(req.headers);
  if (isRateLimited(`membership-requests:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Trop de demandes envoyées depuis cette adresse. Réessayez plus tard." },
      { status: 429 }
    );
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }
  const type = parsed.data.type;
  const nickname = parsed.data.nickname.trim();
  const email = parsed.data.email.toLowerCase().trim();

  let firstName: string | null = null;
  let lastName: string | null = null;
  let birthDate: Date | null = null;
  if (type === "ADHESION") {
    if (!parsed.data.firstName?.trim() || !parsed.data.lastName?.trim()) {
      return NextResponse.json({ error: "Merci d'indiquer votre prénom et votre nom." }, { status: 400 });
    }
    firstName = parsed.data.firstName.trim();
    lastName = parsed.data.lastName.trim();

    if (!parsed.data.birthDate || Number.isNaN(Date.parse(parsed.data.birthDate))) {
      return NextResponse.json({ error: "Date de naissance invalide." }, { status: 400 });
    }
    birthDate = new Date(parsed.data.birthDate);
    // Le club organise des tournois d'argent réel : 18 ans est l'âge légal
    // minimum en France pour les jeux d'argent.
    if (getAge(birthDate) < 18) {
      return NextResponse.json(
        { error: "Le club est réservé aux personnes majeures (18 ans minimum)." },
        { status: 400 }
      );
    }
  }

  // Un compte existe déjà avec cet e-mail.
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  // Le pseudo n'a de sens à réserver que pour une adhésion complète — un
  // accès invité n'a pas de fiche Member, donc pas de conflit possible.
  //
  // Exception : une fiche "placeholder historique" (créée automatiquement
  // pour un joueur retrouvé dans les résultats d'une ancienne manche
  // synchronisée depuis le site historique, mais qui n'a encore jamais créé
  // son propre compte — voir prisma/completer-saison-2026-2027.ts) ne doit
  // pas bloquer la vraie personne qui demande à rejoindre avec ce même
  // pseudo : sa demande est acceptée normalement, et c'est la validation
  // (PATCH /api/admin/membership-requests/[id]) qui rattachera son compte à
  // cette fiche existante au lieu d'en créer une nouvelle — voir isPlaceholderMember.
  if (type === "ADHESION") {
    const existingNickname = await prisma.member.findFirst({
      where: { nickname: { equals: nickname, mode: "insensitive" } },
      include: { user: { select: { email: true } } },
    });
    if (existingNickname && !isPlaceholderMember(existingNickname)) {
      return NextResponse.json({ error: "Ce pseudo est déjà utilisé par un autre membre." }, { status: 409 });
    }
  }

  // Une demande est déjà en attente pour cet e-mail.
  const pendingConflict = await prisma.membershipRequest.findFirst({
    where: { status: "EN_ATTENTE", email },
  });
  if (pendingConflict) {
    return NextResponse.json(
      { error: "Une demande est déjà en attente avec cet e-mail." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.membershipRequest.create({
    data: { type, firstName, lastName, nickname, email, birthDate, passwordHash },
  });

  return NextResponse.json({
    message:
      type === "INVITE_FORUM"
        ? "Votre demande d'accès invité a bien été transmise au bureau."
        : "Votre demande d'adhésion a bien été transmise au bureau.",
  });
}
