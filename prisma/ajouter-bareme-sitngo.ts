import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script à usage unique : ajoute une entrée "SITNGO" au barème de points de
 * la saison active (RankingConfig.pointsTable), SANS toucher aux entrées
 * MTT/DEEPSTACK/CFEPA déjà en place — voir lib/ranking.ts,
 * pointsForPosition, et prisma/schema.prisma pour la forme exacte de
 * pointsTable : { "<format>": { "<nb participants>": { "<place>": points } } }.
 *
 * Barème provisoire ci-dessous (SITNGO_TABLE), pour des sit&go de 2 à 9
 * joueurs — à ajuster librement avec le bureau, puis relancer ce script
 * (idempotent : remplace uniquement la clé "SITNGO", sûr à relancer autant
 * de fois que nécessaire pour affiner les valeurs).
 *
 * Sans cette étape, un sit&go joué reste valable (busts, places, classement
 * Sit&Go dédié) mais chaque joueur y gagne 0 point tant qu'aucun barème
 * SITNGO n'est configuré (voir lib/ranking.ts, pointsForPosition).
 *
 * Usage : npx tsx prisma/ajouter-bareme-sitngo.ts
 */

const SITNGO_TABLE: Record<string, Record<string, number>> = {
  "2": { "1": 10 },
  "3": { "1": 15, "2": 5 },
  "4": { "1": 20, "2": 8, "3": 3 },
  "5": { "1": 25, "2": 10, "3": 5 },
  "6": { "1": 30, "2": 12, "3": 6 },
  "7": { "1": 35, "2": 15, "3": 8, "4": 3 },
  "8": { "1": 40, "2": 18, "3": 10, "4": 5 },
  "9": { "1": 45, "2": 20, "3": 12, "4": 6, "5": 3 },
};

async function main() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) {
    console.log("❌ Aucune saison active trouvée.");
    return;
  }

  const config = await prisma.rankingConfig.findUnique({ where: { seasonId: season.id } });
  if (!config) {
    console.log(
      "❌ Aucun RankingConfig pour cette saison — lancez d'abord le script qui configure le barème MTT/Deepstack (ex. prisma/completer-saison-2026-2027.ts)."
    );
    return;
  }

  const currentTable = (config.pointsTable as Record<string, unknown>) ?? {};
  const updatedTable = { ...currentTable, SITNGO: SITNGO_TABLE };

  await prisma.rankingConfig.update({
    where: { seasonId: season.id },
    data: { pointsTable: updatedTable as any },
  });

  console.log(`✅ Barème SITNGO enregistré pour la saison ${season.label} (formats existants inchangés).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
