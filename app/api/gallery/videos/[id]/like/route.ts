import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/gallery/videos/:id/like — même principe que
 * /api/gallery/photos/:id/like, pour une vidéo de la Galerie.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Connectez-vous pour aimer une vidéo." }, { status: 401 });
  }

  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!video) {
    return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
  }

  const existing = await prisma.videoLike.findUnique({
    where: { videoId_userId: { videoId: params.id, userId } },
  });

  if (existing) {
    await prisma.videoLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.videoLike.create({ data: { videoId: params.id, userId } });
  }

  const count = await prisma.videoLike.count({ where: { videoId: params.id } });
  return NextResponse.json({ liked: !existing, count });
}
