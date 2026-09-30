import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isForumMuted, muteMessage } from "@/lib/forumModeration";

const commentSchema = z.object({ body: z.string().min(1).max(1000) });

/**
 * POST /api/gallery/videos/:id/comments — même principe que
 * /api/gallery/photos/:id/comments, pour une vidéo de la Galerie.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Connectez-vous pour commenter." }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { forumMutedUntil: true, forumMutedPermanent: true },
  });
  if (me && isForumMuted(me)) {
    return NextResponse.json({ error: muteMessage(me) }, { status: 403 });
  }

  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!video) {
    return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
  }

  const parsed = commentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Commentaire invalide." }, { status: 400 });
  }

  const comment = await prisma.videoComment.create({
    data: { videoId: params.id, authorId: userId, body: parsed.data.body },
    include: { author: { include: { member: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
