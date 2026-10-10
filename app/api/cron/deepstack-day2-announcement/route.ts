import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { publishDeepstackDay2Announcements } from "@/lib/deepstackDay2";

function hasValidCronSecret(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * GET /api/cron/deepstack-day2-announcement — appelé par le planificateur
 * (voir vercel.json, chaque lundi matin). Publie dans Actualités la liste
 * des joueurs qualifiés pour le Day 2 de chaque Deepstack dont le Day 1 a
 * eu lieu la semaine précédente, avec leur stack — voir
 * lib/deepstackDay2.ts, publishDeepstackDay2Announcements pour le détail.
 */
export async function GET(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const result = await publishDeepstackDay2Announcements();
  return NextResponse.json(result);
}

/**
 * POST /api/cron/deepstack-day2-announcement — déclenchement manuel
 * (session BUREAU/ADMIN), pour tester sans attendre le lundi, ou via le
 * même secret que ci-dessus si appelé par un autre outil.
 */
export async function POST(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }
  }
  const result = await publishDeepstackDay2Announcements();
  return NextResponse.json(result);
}
