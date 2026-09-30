import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isForumMuted, muteMessage } from "@/lib/forumModeration";

const replySchema = z.object({ body: z.string().min(1).max(5000) });

/**
 * POST /api/forum/:id/replies — publie une réponse sur un sujet. Sur le
 * forum du bureau (area="BUREAU"), réservé aux rôles RESPONSABLE/BUREAU/
 * ADMIN. Sur le forum commun, refusé à un compte suspendu.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié. Le forum est réservé aux membres." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  const topic = await prisma.forumTopic.findUnique({ where: { id: params.id } });
  if (!topic) {
    return NextResponse.json({ error: "Sujet introuvable" }, { status: 404 });
  }

  if (topic.area === "BUREAU") {
    if (!hasRole(role, "RESPONSABLE")) {
      return NextResponse.json({ error: "Forum réservé au bureau." }, { status: 403 });
    }
  } else {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { forumMutedUntil: true, forumMutedPermanent: true },
    });
    if (me && isForumMuted(me)) {
      return NextResponse.json({ error: muteMessage(me) }, { status: 403 });
    }
  }

  const parsed = replySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  const reply = await prisma.forumReply.create({
    data: { topicId: params.id, authorId: userId, body: parsed.data.body },
  });

  return NextResponse.json(reply, { status: 201 });
}
