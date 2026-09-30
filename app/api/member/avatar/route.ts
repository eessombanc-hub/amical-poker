import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Accepte soit un lien http(s) classique, soit une image importée depuis
// l'appareil et encodée en data URI (recadrée/compressée côté navigateur,
// cf. AvatarForm) — plafonnée à ~1,5 Mo pour rester raisonnable en base.
const MAX_PHOTO_LENGTH = 1_500_000;
const photoUrlValue = z
  .string()
  .max(MAX_PHOTO_LENGTH, "Image trop volumineuse.")
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v),
    { message: "Lien ou image invalide." }
  );

const bodySchema = z.object({
  photoUrl: photoUrlValue.optional().or(z.literal("")).nullable(),
});

/**
 * PATCH /api/member/avatar — permet à un membre connecté de définir ou
 * retirer sa propre photo de profil (avatar affiché dans la navigation
 * du site une fois connecté).
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Lien d'image invalide." }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) {
    return NextResponse.json({ error: "Aucune fiche membre associée à ce compte." }, { status: 403 });
  }

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: { photoUrl: parsed.data.photoUrl || null },
  });

  return NextResponse.json({ photoUrl: updated.photoUrl });
}
