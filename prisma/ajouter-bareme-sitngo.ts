import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script à usage unique : (ré)écrit l'entrée "SITNGO" du barème de points de
 * TOUTES les saisons ayant déjà un RankingConfig (pas seulement la saison
 * active), SANS toucher aux entrées MTT/DEEPSTACK/CFEPA déjà en place — voir
 * lib/ranking.ts, pointsForPosition, et prisma/schema.prisma pour la forme
 * exacte de pointsTable : { "<format>": { "<nb participants>": { "<place>": points } } }.
 *
 * Barème officiel du club ci-dessous (SITNGO_TABLE, sit&go de 3 à 11
 * joueurs), transcrit du document de référence (remplace l'ancien barème
 * provisoire). Idempotent : remplace uniquement la clé "SITNGO", sûr à
 * relancer autant de fois que nécessaire.
 *
 * Ne corrige QUE le barème stocké (RankingConfig.pointsTable) — les Result
 * déjà enregistrés gardent leurs anciens points tant que
 * prisma/recalculer-classements-existants.ts n'a pas été relancé ensuite
 * (voir ce script : il redérive position/points/bonusPoints/kills de tous
 * les Sit&Go déjà joués à partir du journal de busts, avec le barème ici
 * mis à jour).
 *
 * Usage : npx tsx prisma/ajouter-bareme-sitngo.ts
 */

const SITNGO_TABLE: Record<string, Record<string, number>> = {
  "3": { "1": 13, "2": 9, "3": 5 },
  "4": { "1": 14, "2": 10, "3": 6, "4": 2 },
  "5": { "1": 15, "2": 11, "3": 7, "4": 3, "5": 1 },
  "6": { "1": 16, "2": 12, "3": 8, "4": 4, "5": 2, "6": 1 },
  "7": { "1": 17, "2": 13, "3": 9, "4": 5, "5": 3, "6": 2, "7": 1 },
  "8": { "1": 18, "2": 14, "3": 10, "4": 6, "5": 4, "6": 3, "7": 2, "8": 1 },
  "9": { "1": 19, "2": 15, "3": 11, "4": 7, "5": 5, "6": 4, "7": 3, "8": 2, "9": 1 },
  "10": { "1": 20, "2": 16, "3": 12, "4": 8, "5": 6, "6": 5, "7": 4, "8": 3, "9": 2, "10": 1 },
  "11": { "1": 21, "2": 17, "3": 13, "4": 9, "5": 7, "6": 6, "7": 5, "8": 4, "9": 3, "10": 2, "11": 1 },
};

async function main() {
  const seasons = await prisma.season.findMany({ select: { id: true, label: true } });
  if (seasons.length === 0) {
    console.log("❌ Aucune saison trouvée.");
    return;
  }

  let updated = 0;
  for (const season of seasons) {
    const config = await prisma.rankingConfig.findUnique({ where: { seasonId: season.id } });
    if (!config) {
      console.log(`⏭️  Saison ${season.label} : pas de RankingConfig, ignorée.`);
      continue;
    }

    const currentTable = (config.pointsTable as Record<string, unknown>) ?? {};
    const updatedTable = { ...currentTable, SITNGO: SITNGO_TABLE };

    await prisma.rankingConfig.update({
      where: { seasonId: season.id },
      data: { pointsTable: updatedTable as any },
    });

    console.log(`✅ Barème SITNGO enregistré pour la saison ${season.label} (formats existants inchangés).`);
    updated++;
  }

  console.log(`\n🎉 ${updated} saison(s) mise(s) à jour. Pensez à relancer prisma/recalculer-classements-existants.ts pour répercuter ce barème sur les Sit&Go déjà joués.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
