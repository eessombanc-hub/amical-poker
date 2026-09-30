import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/forum/:id — un sujet et ses réponses. Un sujet du forum du
 * bureau (area="BUREAU") n'est renvoyé qu'aux rôles RESPONSABLE/BUREAU/ADMIN.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const topic = await prisma.forumTopic.findUnique({
    where: { id: params.id },
    include: {
      author: { include: { member: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { include: { member: true } } },
      },
    },
  });
  if (!topic) {
    return NextResponse.json({ error: "Sujet introuvable" }, { status: 404 });
  }

  if (topic.area === "BUREAU") {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
      return NextResponse.json({ error: "Forum réservé au bureau." }, { status: 403 });
    }
  }

  return NextResponse.json(topic);
}

/**
 * DELETE /api/forum/:id — supprime un sujet et ses réponses. Réservé aux
 * rôles RESPONSABLE/BUREAU/ADMIN (le bureau peut modérer le forum commun
 * comme le sien).
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const topic = await prisma.forumTopic.findUnique({ where: { id: params.id } });
  if (!topic) {
    return NextResponse.json({ error: "Sujet introuvable" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.forumReply.deleteMany({ where: { topicId: params.id } }),
    prisma.forumTopic.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
