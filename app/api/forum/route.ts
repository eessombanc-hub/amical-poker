import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isForumMuted, muteMessage } from "@/lib/forumModeration";

const topicSchema = z.object({
  title: z.string().min(3).max(140),
  category: z.string().min(1),
  body: z.string().min(1).max(5000),
  // "BUREAU" pour un sujet du forum interne (réservé RESPONSABLE/BUREAU/ADMIN) —
  // absent ou "COMMUN" pour le forum ouvert à tous.
  area: z.enum(["COMMUN", "BUREAU"]).optional(),
});

/**
 * GET /api/forum — sujets du forum commun (visible de tous, y compris hors
 * connexion) ou, avec ?area=BUREAU, sujets du forum interne du bureau
 * (réservé aux rôles RESPONSABLE/BUREAU/ADMIN).
 */
export async function GET(req: NextRequest) {
  const area = req.nextUrl.searchParams.get("area") === "BUREAU" ? "BUREAU" : "COMMUN";

  if (area === "BUREAU") {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
      return NextResponse.json({ error: "Forum réservé au bureau." }, { status: 403 });
    }
  }

  const topics = await prisma.forumTopic.findMany({
    where: { area },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { include: { member: true } },
      _count: { select: { replies: true } },
    },
  });
  return NextResponse.json(topics);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié. Le forum est réservé aux membres." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  const parsed = topicSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const area = parsed.data.area === "BUREAU" ? "BUREAU" : "COMMUN";

  if (area === "BUREAU") {
    if (!hasRole(role, "RESPONSABLE")) {
      return NextResponse.json({ error: "Forum réservé au bureau." }, { status: 403 });
    }
  } else {
    // Le forum commun refuse toute publication d'un compte suspendu.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { forumMutedUntil: true, forumMutedPermanent: true },
    });
    if (me && isForumMuted(me)) {
      return NextResponse.json({ error: muteMessage(me) }, { status: 403 });
    }
  }

  const topic = await prisma.forumTopic.create({
    data: { title: parsed.data.title, category: parsed.data.category, body: parsed.data.body, area, authorId: userId },
  });

  return NextResponse.json(topic, { status: 201 });
}
