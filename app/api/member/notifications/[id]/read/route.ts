import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/member/notifications/[id]/read — acquitte une notification
 * (utilisé notamment par components/UrgentMessagePopup.tsx quand le membre
 * clique « J'ai compris »). Ne touche qu'une notification appartenant au
 * membre connecté.
 */
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const notification = await prisma.notification.findUnique({ where: { id: params.id } });
  if (!notification || notification.userId !== userId) {
    return NextResponse.json({ error: "Notification introuvable." }, { status: 404 });
  }

  await prisma.notification.update({ where: { id: params.id }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
