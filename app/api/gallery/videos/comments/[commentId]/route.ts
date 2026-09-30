import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/gallery/videos/comments/:commentId — même principe que
 * /api/gallery/photos/comments/:commentId, pour un commentaire sur une
 * vidéo de la Galerie. Réservé RESPONSABLE+.
 */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ commentId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const comment = await prisma.videoComment.findUnique({ where: { id: params.commentId } });
  if (!comment) {
    return NextResponse.json({ error: "Commentaire introuvable" }, { status: 404 });
  }

  await prisma.videoComment.delete({ where: { id: params.commentId } });
  return NextResponse.json({ ok: true });
}
