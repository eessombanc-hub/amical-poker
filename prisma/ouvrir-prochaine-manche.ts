import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Script à lancer manuellement (une fois par manche) pour :
//  1) clôturer automatiquement les manches passées dont la date est dépassée
//     (statut → TERMINEE), qu'elles aient été ouvertes ou non,
//  2) ouvrir les inscriptions de la prochaine manche à venir (statut → INSCRIPTIONS_OUVERTES).
//
// Usage : npx tsx prisma/ouvrir-prochaine-manche.ts

async function main() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) {
    console.log("❌ Aucune saison active trouvée.");
    return;
  }

  const startOfToday = new Date(new Date().toDateString());

  // 1) Clôturer les manches passées encore marquées comme actives.
  const closed = await prisma.round.updateMany({
    where: {
      seasonId: season.id,
      date: { lt: startOfToday },
      status: { in: ["A_VENIR", "INSCRIPTIONS_OUVERTES", "COMPLET", "EN_COURS"] },
    },
    data: { status: "TERMINEE" },
  });
  if (closed.count > 0) {
    console.log(`✅ ${closed.count} manche(s) passée(s) marquée(s) comme terminée(s).`);
  }

  // 2) Ouvrir les inscriptions de la prochaine manche à venir.
  const next = await prisma.round.findFirst({
    where: {
      seasonId: season.id,
      date: { gte: startOfToday },
      status: "A_VENIR",
    },
    orderBy: { date: "asc" },
  });

  if (!next) {
    console.log("ℹ️ Aucune manche à venir avec le statut 'A_VENIR' à ouvrir (déjà ouverte, ou calendrier à compléter).");
    return;
  }

  await prisma.round.update({
    where: { id: next.id },
    data: { status: "INSCRIPTIONS_OUVERTES" },
  });

  console.log(
    `✅ Inscriptions ouvertes pour la manche ${next.number} du ${next.date.toLocaleDateString("fr-FR")}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
