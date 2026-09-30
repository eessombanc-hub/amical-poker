import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/member/notifications/urgent — messages urgents non lus du membre
 * connecté (voir /admin/message-urgent). Interrogé régulièrement par
 * components/UrgentMessagePopup.tsx (voir POLL_INTERVAL_MS) pour afficher un
 * nouveau message quasi instantanément à un membre déjà connecté sur le
 * site, sans attendre qu'il change de page.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json([], { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const notifications = await prisma.notification.findMany({
    where: { userId, type: "URGENT", read: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true, createdAt: true },
  });

  return NextResponse.json(notifications);
}
