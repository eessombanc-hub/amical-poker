import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  caption: z.string().max(200).optional().nullable(),
});

/**
 * PATCH /api/admin/videos/:id — modifie la légende d'une vidéo.
 * DELETE /api/admin/videos/:id — supprime une vidéo (et ses likes/commentaires,
 * en cascade — voir prisma/schema.prisma, VideoLike/VideoComment).
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

  const video = await prisma.video.update({
    where: { id: params.id },
    data: { caption: parsed.data.caption ?? null },
  });
  return NextResponse.json(video);
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  await prisma.video.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
