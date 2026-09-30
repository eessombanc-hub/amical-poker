import { prisma } from "@/lib/prisma";

/**
 * Ménage automatique du contenu publié : ne conserve que les
 * KEEP_PUBLISHED_COUNT publications les plus récentes (statut PUBLIE) pour
 * les Actualités du club et la Gazette Poker, et supprime les plus
 * anciennes au-delà de ce nombre. Les brouillons, dépubliés ou rejetés ne
 * sont jamais comptés ni supprimés — seul le contenu déjà en ligne l'est.
 *
 * Appelé à chaque publication :
 * - app/api/news/[id]/route.ts (bascule d'une actu en PUBLIE)
 * - app/api/poker-news/route.ts (publication directe par le bureau)
 * - app/api/poker-news/[id]/route.ts (validation d'une actu en attente)
 * - lib/pokerNewsSync.ts (synchronisation RSS automatique, cron)
 */
export const KEEP_PUBLISHED_COUNT = 15;

/** Supprime les Actualités du club publiées au-delà des `keep` plus récentes. */
export async function pruneOldPublishedNews(keep = KEEP_PUBLISHED_COUNT): Promise<number> {
  const aSupprimer = await prisma.news.findMany({
    where: { status: "PUBLIE" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: keep,
  });
  if (aSupprimer.length === 0) return 0;

  const { count } = await prisma.news.deleteMany({
    where: { id: { in: aSupprimer.map((n) => n.id) } },
  });
  return count;
}

/** Supprime les actus Gazette Poker publiées au-delà des `keep` plus récentes. */
export async function pruneOldPublishedPokerNews(keep = KEEP_PUBLISHED_COUNT): Promise<number> {
  const aSupprimer = await prisma.pokerNewsItem.findMany({
    where: { status: "PUBLIE" },
    orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
    select: { id: true },
    skip: keep,
  });
  if (aSupprimer.length === 0) return 0;

  const { count } = await prisma.pokerNewsItem.deleteMany({
    where: { id: { in: aSupprimer.map((n) => n.id) } },
  });
  return count;
}
