import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  // Membre (fiche Member) : firstName/lastName/nickname obligatoires,
  // birthDate optionnelle (modifiable, mais pas exigée à chaque enregistrement
  // — une fiche déjà complète peut aussi n'ajuster que le pseudo, par ex.).
  // Invité (rôle INVITE, pas de fiche Member) : uniquement displayName, son
  // seul élément de profil.
  firstName: z.string().trim().min(1, "Prénom requis.").max(60).optional(),
  lastName: z.string().trim().min(1, "Nom requis.").max(60).optional(),
  nickname: z.string().trim().min(2, "Pseudo trop court.").max(40).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de naissance invalide.").optional(),
  // RGPD : autorisation du membre à publier ses résultats (classement,
  // points, kills) — voir Member.publicResults, déjà utilisé partout côté
  // affichage. Non concerné pour un accès invité (pas de fiche Member).
  publicResults: z.boolean().optional(),
  displayName: z.string().trim().min(1, "Nom affiché requis.").max(60).optional(),
});

/**
 * PATCH /api/member/profile — permet à un compte connecté de modifier ses
 * propres éléments de profil : prénom, nom, pseudo et date de naissance pour
 * un membre (fiche Member), ou nom affiché sur le forum pour un accès
 * invité (rôle INVITE, qui n'a pas de fiche Member).
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const member = await prisma.member.findUnique({ where: { userId } });

  if (member) {
    if (!data.firstName || !data.lastName || !data.nickname) {
      return NextResponse.json(
        { error: "Prénom, nom et pseudo sont obligatoires." },
        { status: 400 }
      );
    }

    // Le club affilie des tournois d'argent réel : 18 ans est l'âge légal
    // minimum en France (même contrôle que sur la demande d'adhésion et sur
    // /api/member/birthdate).
    if (data.birthDate) {
      const maxBirthDate = new Date();
      maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);
      if (data.birthDate > maxBirthDate.toISOString().slice(0, 10)) {
        return NextResponse.json(
          { error: "Le club est réservé aux personnes majeures (18 ans minimum)." },
          { status: 400 }
        );
      }
    }

    const existingNickname = await prisma.member.findFirst({
      where: {
        nickname: { equals: data.nickname, mode: "insensitive" },
        id: { not: member.id },
      },
    });
    if (existingNickname) {
      return NextResponse.json(
        { error: "Ce pseudo est déjà utilisé par un autre membre." },
        { status: 409 }
      );
    }

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname,
        ...(data.birthDate !== undefined ? { birthDate: new Date(data.birthDate) } : {}),
        ...(data.publicResults !== undefined ? { publicResults: data.publicResults } : {}),
      },
    });
    return NextResponse.json({
      firstName: updated.firstName,
      lastName: updated.lastName,
      nickname: updated.nickname,
      birthDate: updated.birthDate,
      publicResults: updated.publicResults,
    });
  }

  // Pas de fiche membre : compte à accès invité (rôle INVITE) — seul le nom
  // affiché (utilisé sur le forum) peut être modifié, c'est son seul élément
  // de profil.
  if (!data.displayName) {
    return NextResponse.json({ error: "Le nom affiché est obligatoire." }, { status: 400 });
  }
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { displayName: data.displayName },
  });
  return NextResponse.json({ displayName: updatedUser.displayName });
}
