import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Accepte soit un lien http(s) classique, soit une image importée depuis
// l'appareil et encodée en data URI (redimensionnée/compressée côté
// navigateur, cf. GalerieAdminPanel) — même principe que l'avatar membre
// (voir app/api/member/avatar/route.ts), avec un plafond plus large car les
// photos de galerie ne sont pas recadrées en petite vignette carrée.
const MAX_PHOTO_LENGTH = 3_000_000;
const photoUrlValue = z
  .string()
  .min(1)
  .max(MAX_PHOTO_LENGTH, "Image trop volumineuse.")
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v),
    { message: "Lien ou image invalide." }
  );

const createSchema = z.object({
  photoUrl: photoUrlValue,
  caption: z.string().max(200).optional(),
});

/**
 * POST /api/admin/albums/:id/photos — ajoute une photo à un album.
 * Réservé RESPONSABLE+.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const album = await prisma.album.findUnique({ where: { id: params.id } });
  if (!album) {
    return NextResponse.json({ error: "Album introuvable." }, { status: 404 });
  }
  if (album.type !== "PHOTO") {
    return NextResponse.json({ error: "Cet album n'est pas un album photo." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const photo = await prisma.photo.create({
    data: {
      albumId: params.id,
      photoUrl: parsed.data.photoUrl,
      caption: parsed.data.caption || null,
    },
  });
  return NextResponse.json(photo, { status: 201 });
}
