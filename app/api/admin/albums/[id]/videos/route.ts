import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPlausibleVideoUrl } from "@/lib/media";

// Lien YouTube/Vimeo ou fichier vidéo direct uniquement — voir lib/media.ts.
// Pas d'import depuis l'appareil (contrairement aux photos) : aucune
// infrastructure d'hébergement vidéo sur le site.
const videoUrlValue = z
  .string()
  .min(1)
  .max(2000)
  .refine((v) => isPlausibleVideoUrl(v), {
    message: "Lien vidéo invalide (YouTube, Vimeo ou fichier .mp4 attendu).",
  });

const createSchema = z.object({
  videoUrl: videoUrlValue,
  caption: z.string().max(200).optional(),
});

/**
 * POST /api/admin/albums/:id/videos — ajoute une vidéo à un album vidéo.
 * Réservé RESPONSABLE+. Refuse d'ajouter une vidéo à un album de type PHOTO
 * (et réciproquement, voir /api/admin/albums/:id/photos) : un album est de
 * l'un ou l'autre, jamais les deux (voir prisma/schema.prisma, Album.type).
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
  if (album.type !== "VIDEO") {
    return NextResponse.json({ error: "Cet album n'est pas un album vidéo." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const video = await prisma.video.create({
    data: {
      albumId: params.id,
      videoUrl: parsed.data.videoUrl,
      caption: parsed.data.caption || null,
    },
  });
  return NextResponse.json(video, { status: 201 });
}
