import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { syncJimdoSite } from "@/lib/jimdoSync";

function hasValidCronSecret(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * GET /api/sync/jimdo — appelé par le planificateur (voir vercel.json).
 * Synchronise les annonces, partenaires, calendrier et photos depuis
 * amicalpokerclub.jimdofree.com (le site historique du club).
 */
export async function GET(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const results = await syncJimdoSite();
  return NextResponse.json({ results });
}

/**
 * POST /api/sync/jimdo — déclenchement manuel depuis le bouton
 * "Synchroniser maintenant" de /admin/site-historique (session BUREAU/ADMIN).
 */
export async function POST(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }
  }
  const results = await syncJimdoSite();
  return NextResponse.json({ results });
}
