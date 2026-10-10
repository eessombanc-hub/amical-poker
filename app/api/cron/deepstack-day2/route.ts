import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { autoRegisterDeepstackDay2 } from "@/lib/deepstackDay2";

function hasValidCronSecret(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * GET /api/cron/deepstack-day2 — appelé par le planificateur (voir
 * vercel.json, déclenché vers 3h du matin heure de Paris). Inscrit
 * automatiquement au Day 2 d'un Deepstack groupé tout joueur inscrit au
 * Day 1 de la veille et non éliminé — voir lib/deepstackDay2.ts pour le
 * détail de la règle et les garanties d'idempotence
 * (Round.day2AutoRegisteredAt).
 */
export async function GET(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const result = await autoRegisterDeepstackDay2();
  return NextResponse.json(result);
}

/**
 * POST /api/cron/deepstack-day2 — déclenchement manuel (session BUREAU/
 * ADMIN), pour tester sans attendre 3h du matin, ou via le même secret que
 * ci-dessus si appelé par un autre outil.
 */
export async function POST(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }
  }
  const result = await autoRegisterDeepstackDay2();
  return NextResponse.json(result);
}
