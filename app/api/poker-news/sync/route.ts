import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { syncPokerNews } from "@/lib/pokerNewsSync";
import { pruneOldPublishedPokerNews } from "@/lib/contentPruning";

function hasValidCronSecret(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * GET /api/poker-news/sync — appelé par le planificateur (Vercel Cron envoie
 * une requête GET avec l'en-tête `Authorization: Bearer <CRON_SECRET>`,
 * ajouté automatiquement dès que la variable d'environnement CRON_SECRET est
 * définie sur le projet). Voir vercel.json pour la fréquence. Importe les
 * nouvelles actus puis ne garde que les 15 publiées les plus récentes (voir
 * lib/contentPruning.ts).
 */
export async function GET(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const results = await syncPokerNews();
  const deletedCount = await pruneOldPublishedPokerNews();
  return NextResponse.json({ results, deletedCount });
}

/**
 * POST /api/poker-news/sync — déclenchement manuel depuis le bouton
 * "Synchroniser maintenant" de /admin/poker-news (session BUREAU/ADMIN),
 * ou via le même secret que ci-dessus si appelé par un autre outil. Importe
 * les nouvelles actus puis ne garde que les 15 publiées les plus récentes
 * (voir lib/contentPruning.ts).
 */
export async function POST(req: NextRequest) {
  if (!hasValidCronSecret(req)) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }
  }
  const results = await syncPokerNews();
  const deletedCount = await pruneOldPublishedPokerNews();
  return NextResponse.json({ results, deletedCount });
}
