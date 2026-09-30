import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  seasonId: z.string().optional().nullable(),
});

/**
 * PATCH /api/admin/albums/:id — renomme un album ou change sa saison.
 * DELETE /api/admin/albums/:id — supprime un album et toutes ses photos.
 * Réservé RESPONSABLE+.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const album = await prisma.album.update({
    where: { id: params.id },
    data: parsed.data,
    include: { photos: true, videos: true },
  });
  return NextResponse.json(album);
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  // Les photos/vidéos référencent leur album sans suppression en cascade
  // côté base (relation obligatoire) : on efface donc d'abord les
  // photos/vidéos (leurs likes/commentaires suivent en cascade, voir
  // prisma/schema.prisma), puis l'album, dans une même transaction.
  await prisma.$transaction([
    prisma.photo.deleteMany({ where: { albumId: params.id } }),
    prisma.video.deleteMany({ where: { albumId: params.id } }),
    prisma.album.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
