import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
});

/**
 * PATCH /api/member/birthdate — permet à un membre connecté de renseigner
 * lui-même sa date de naissance lorsque sa fiche ne l'a pas encore (comptes
 * créés avant l'ajout de ce champ, ou créés directement par un
 * administrateur). Sert à vérifier la majorité et à afficher le popup
 * d'anniversaire sur l'accueil — voir components/BirthdayPopup.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  // Le club affilie des tournois d'argent réel : 18 ans est l'âge légal
  // minimum en France pour les jeux d'argent (même contrôle que sur le
  // formulaire de demande d'adhésion).
  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);
  if (parsed.data.birthDate > maxBirthDate.toISOString().slice(0, 10)) {
    return NextResponse.json(
      { error: "Le club est réservé aux personnes majeures (18 ans minimum)." },
      { status: 400 }
    );
  }

  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) {
    return NextResponse.json({ error: "Aucune fiche membre associée à ce compte." }, { status: 403 });
  }

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: { birthDate: new Date(parsed.data.birthDate) },
  });

  return NextResponse.json({ birthDate: updated.birthDate });
}
