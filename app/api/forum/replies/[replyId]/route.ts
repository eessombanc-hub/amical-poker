import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/forum/replies/:replyId — supprime une réponse. Réservé aux
 * rôles RESPONSABLE/BUREAU/ADMIN.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ replyId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const reply = await prisma.forumReply.findUnique({ where: { id: params.replyId } });
  if (!reply) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }

  await prisma.forumReply.delete({ where: { id: params.replyId } });
  return NextResponse.json({ ok: true });
}
