import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Corrige les manches déjà jouées (un vainqueur — Result.position === 1 —
 * a bien été enregistré) mais jamais marquées "Terminée" en base, faute
 * d'automatisme à l'époque où leurs résultats ont été saisis (voir
 * lib/ranking.ts, syncPositionsFromBusts, qui gère désormais ce passage en
 * TERMINEE automatiquement pour toute nouvelle manche dont le vainqueur
 * vient d'être déterminé).
 *
 * Conséquence concrète corrigée par ce script : la rubrique "Performances
 * du club" (accueil + /poker-news) ne regarde QUE les manches au statut
 * TERMINEE pour choisir la "dernière manche" à afficher — tant qu'une
 * manche plus récente que Manche 1 n'était pas marquée Terminée, la
 * rubrique restait bloquée sur Manche 1 même si d'autres manches avaient
 * déjà été jouées et leurs résultats saisis depuis.
 *
 * Pour chaque manche groupée (Day 1/Day 2), la manche canonique ET ses
 * manches sœurs sont marquées Terminée ensemble (même logique que
 * syncPositionsFromBusts).
 *
 * Ne touche JAMAIS une manche déjà ANNULEE, et ne crée AUCUNE actu
 * d'annonce (contrairement à syncPositionsFromBusts pour les nouvelles
 * manches) : ce script ne fait que rattraper un statut manquant sur des
 * manches déjà anciennes, pas republier une annonce a posteriori.
 *
 * Script à usage unique, sans effet si relancé (idempotent : une manche
 * déjà Terminée est simplement ignorée).
 */
async function main() {
  const winnerResults = await prisma.result.findMany({
    where: { position: 1 },
    select: { roundId: true },
  });
  const canonicalIds = [...new Set(winnerResults.map((r) => r.roundId))];

  if (canonicalIds.length === 0) {
    console.log("Aucune manche avec un vainqueur enregistré — rien à corriger.");
    return;
  }

  let fixed = 0;
  let alreadyOk = 0;
  let skippedCancelled = 0;

  for (const id of canonicalIds) {
    const round = await prisma.round.findUnique({
      where: { id },
      select: { id: true, number: true, label: true, status: true, groupId: true, seasonId: true },
    });
    if (!round) continue;

    if (round.status === "TERMINEE") {
      alreadyOk++;
      continue;
    }
    if (round.status === "ANNULEE") {
      skippedCancelled++;
      console.log(`⏭️  ${round.label ?? `Manche ${round.number}`} est annulée — statut non modifié.`);
      continue;
    }

    let roundIds = [round.id];
    if (round.groupId) {
      const siblings = await prisma.round.findMany({
        where: { groupId: round.groupId, seasonId: round.seasonId },
        select: { id: true },
      });
      roundIds = siblings.map((s) => s.id);
    }

    await prisma.round.updateMany({
      where: { id: { in: roundIds } },
      data: { status: "TERMINEE" },
    });

    console.log(
      `✅ ${round.label ?? `Manche ${round.number}`} (statut précédent : ${round.status}) marquée Terminée${
        roundIds.length > 1 ? ` (+ ${roundIds.length - 1} manche(s) sœur(s) du groupe)` : ""
      }.`
    );
    fixed++;
  }

  console.log(
    `\n🎉 Terminé — ${fixed} manche(s) corrigée(s), ${alreadyOk} déjà à jour, ${skippedCancelled} annulée(s) ignorée(s).`
  );
  if (fixed > 0) {
    console.log(
      "La rubrique « Performances du club » (accueil + /poker-news) affichera désormais la manche la plus récente réellement jouée."
    );
  }
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
