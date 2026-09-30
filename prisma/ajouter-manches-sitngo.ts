import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script à usage unique (comme prisma/completer-saison-2026-2027.ts et
 * prisma/ajouter-manches-cfepa.ts) : crée, pour la saison active, une
 * manche SITNGO liée à CHAQUE "jour de continuation" d'un Deepstack déjà
 * présent au calendrier (Round.groupId renseigné, et pas la manche la plus
 * ancienne du groupe — typiquement le "Day 2", voir
 * app/calendrier/page.tsx, isContinuationDay).
 *
 * Le sit&go se joue à la même date, au même lieu et au même horaire que ce
 * Day 2 (hypothèse à vérifier auprès du club : le site historique ne
 * précise pas d'horaire séparé pour un sit&go — à corriger dans
 * /admin/resultats ou en relançant ce script après avoir ajusté SITNGO_TIMES
 * ci-dessous si besoin). Il reste une compétition à part entière :
 * - format SITNGO, jamais mélangé au groupId du Deepstack (voir
 *   Round.linkedDeepstackRoundId, qui porte à lui seul le lien) ;
 * - un numéro interne hors-séquence (SITNGO_NUMBER_OFFSET + numéro du Day 2
 *   lié) pour ne JAMAIS renuméroter les manches "officielles" du club
 *   (voir prisma/completer-saison-2026-2027.ts, qui y est très attentif) —
 *   ce numéro n'est de toute façon jamais affiché publiquement (voir
 *   Round.label, toujours rempli ci-dessous, qui prend le pas dessus) ;
 * - inscriptions réservées au bureau/responsables/admin, réservées aux
 *   joueurs non engagés dans le Deepstack lié — voir lib/ranking.ts,
 *   isEligibleForSitngo, et app/api/admin/round-registrations.
 *
 * Idempotent (sûr à relancer plusieurs fois, y compris après l'ajout de
 * nouveaux Deepstack au calendrier plus tard dans la saison) : identifie la
 * manche sit&go existante par son Round.linkedDeepstackRoundId plutôt que
 * par son numéro, et se contente de la mettre à jour si elle existe déjà.
 *
 * Usage : npx tsx prisma/ajouter-manches-sitngo.ts
 */

const SITNGO_NUMBER_OFFSET = 5000;

async function main() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) {
    console.log("❌ Aucune saison active trouvée.");
    return;
  }

  const deepstackRounds = await prisma.round.findMany({
    where: { seasonId: season.id, format: "DEEPSTACK", groupId: { not: null } },
    orderBy: { date: "asc" },
    select: { id: true, number: true, date: true, location: true, openTime: true, startTime: true, groupId: true, label: true },
  });

  if (deepstackRounds.length === 0) {
    console.log("ℹ️  Aucun Deepstack groupé (Day 1/Day 2) trouvé pour cette saison — rien à faire.");
    return;
  }

  // Regroupe par groupId pour identifier, au sein de chaque Deepstack, la
  // manche la plus ancienne (Day 1, jamais liée à un sit&go) et repérer
  // toutes les autres (Day 2, Day 3 éventuel...) comme jours de continuation.
  const byGroup = new Map<string, typeof deepstackRounds>();
  for (const r of deepstackRounds) {
    const list = byGroup.get(r.groupId!) ?? [];
    list.push(r);
    byGroup.set(r.groupId!, list);
  }

  let created = 0;
  let updated = 0;

  for (const [groupId, roundsInGroup] of byGroup) {
    const sorted = [...roundsInGroup].sort((a, b) => a.date.getTime() - b.date.getTime());
    const continuationDays = sorted.slice(1); // tout sauf le Day 1

    for (const day2 of continuationDays) {
      const existing = await prisma.round.findFirst({
        where: { seasonId: season.id, linkedDeepstackRoundId: day2.id },
        select: { id: true, number: true },
      });

      const label = `Sit&Go — ${day2.label ?? `Deepstack (Manche ${day2.number})`}`;
      const data = {
        seasonId: season.id,
        date: day2.date,
        openTime: day2.openTime,
        startTime: day2.startTime,
        location: day2.location,
        format: "SITNGO" as const,
        maxSeats: 9, // sit&go : effectif volontairement restreint, ajustable dans /admin/resultats si besoin
        groupId: null,
        linkedDeepstackRoundId: day2.id,
        label,
      };

      if (existing) {
        await prisma.round.update({ where: { id: existing.id }, data });
        console.log(`ℹ️  Sit&Go déjà existant pour le Deepstack Manche ${day2.number} (${groupId}) — mis à jour.`);
        updated++;
      } else {
        const number = SITNGO_NUMBER_OFFSET + day2.number;
        await prisma.round.create({
          data: {
            ...data,
            number,
            status: "A_VENIR",
          },
        });
        console.log(`✅ Sit&Go créé pour le Deepstack Manche ${day2.number} (${groupId}), numéro interne ${number}.`);
        created++;
      }
    }
  }

  console.log(`\n🎉 Terminé : ${created} sit&go créé(s), ${updated} déjà existant(s) mis à jour.`);
  if (created > 0) {
    console.log(
      "   Pensez à vérifier l'horaire du sit&go dans /admin/resultats si besoin (par défaut, même horaire que le Day 2 lié)."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
