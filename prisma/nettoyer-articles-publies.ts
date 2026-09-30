import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ménage ponctuel : pour les Actualités du club et la Gazette Poker, ne
 * conserve que les KEEP publications les plus récentes (statut PUBLIE) et
 * supprime les autres. Les brouillons / dépubliés / rejetés ne sont pas
 * comptés et ne sont jamais touchés. Script à usage unique, relançable sans
 * risque (redevient un no-op une fois qu'il reste ≤ KEEP publications).
 */

const KEEP = 15;

async function nettoyerActualites() {
  const publiees = await prisma.news.findMany({
    where: { status: "PUBLIE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });

  console.log(`\n📰 Actualités du club : ${publiees.length} publiée(s).`);

  if (publiees.length <= KEEP) {
    console.log(`   Rien à supprimer (≤ ${KEEP}).`);
    return;
  }

  const aSupprimer = publiees.slice(KEEP);
  console.log(`   Conservées (${KEEP} plus récentes) : jusqu'au ${publiees[KEEP - 1].createdAt.toLocaleDateString("fr-FR")} (« ${publiees[KEEP - 1].title} »).`);
  console.log(`   À supprimer (${aSupprimer.length}) :`);
  for (const a of aSupprimer) {
    console.log(`     - ${a.createdAt.toLocaleDateString("fr-FR")} · ${a.title}`);
  }

  const { count } = await prisma.news.deleteMany({
    where: { id: { in: aSupprimer.map((a) => a.id) } },
  });
  console.log(`   ✅ ${count} actualité(s) supprimée(s).`);
}

async function nettoyerGazettePoker() {
  const publiees = await prisma.pokerNewsItem.findMany({
    where: { status: "PUBLIE" },
    orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
    select: { id: true, title: true, publishedAt: true },
  });

  console.log(`\n♠️ Gazette Poker : ${publiees.length} publiée(s).`);

  if (publiees.length <= KEEP) {
    console.log(`   Rien à supprimer (≤ ${KEEP}).`);
    return;
  }

  const aSupprimer = publiees.slice(KEEP);
  const seuil = publiees[KEEP - 1];
  console.log(
    `   Conservées (${KEEP} plus récentes) : jusqu'au ${seuil.publishedAt ? seuil.publishedAt.toLocaleDateString("fr-FR") : "date inconnue"} (« ${seuil.title} »).`
  );
  console.log(`   À supprimer (${aSupprimer.length}) :`);
  for (const a of aSupprimer) {
    console.log(`     - ${a.publishedAt ? a.publishedAt.toLocaleDateString("fr-FR") : "date inconnue"} · ${a.title}`);
  }

  const { count } = await prisma.pokerNewsItem.deleteMany({
    where: { id: { in: aSupprimer.map((a) => a.id) } },
  });
  console.log(`   ✅ ${count} actu(s) Gazette Poker supprimée(s).`);
}

async function main() {
  await nettoyerActualites();
  await nettoyerGazettePoker();
  console.log("\nTerminé.");
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
