import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Enregistre le résultat du vainqueur de la Manche 1 (vendredi 4 septembre
 * 2026), d'après le classement du site historique
 * (amicalpokerclub.jimdofree.com/saison-2026-2027-1/) : GULP, 104 points,
 * 1 partie jouée — donc seul résultat compté à ce jour, et vainqueur de
 * cette manche.
 *
 * Script à usage unique (comme prisma/ouvrir-prochaine-manche.ts) : à
 * adapter pour toute prochaine manche à saisir de la même façon.
 */

const NICKNAME = "GULP";
const ROUND_NUMBER = 1;
const POSITION = 1;
const POINTS = 104;

async function recalculateRanking(seasonId: string) {
  const config = await prisma.rankingConfig.findUnique({ where: { seasonId } });
  const results = await prisma.result.findMany({
    where: { round: { seasonId } },
    include: { round: true },
  });

  const byMember = new Map<string, typeof results>();
  for (const r of results) {
    const list = byMember.get(r.memberId) ?? [];
    list.push(r);
    byMember.set(r.memberId, list);
  }

  const nbRoundsCounted = config?.nbRoundsCounted ?? null;

  for (const [memberId, memberResults] of byMember) {
    const sorted = [...memberResults].sort((a, b) => b.points - a.points);
    const counted = nbRoundsCounted ? sorted.slice(0, nbRoundsCounted) : sorted;

    const totalPoints = counted.reduce((sum, r) => sum + r.points, 0);
    const participations = memberResults.length;
    const wins = memberResults.filter((r) => r.position === 1).length;
    const podiums = memberResults.filter((r) => r.position <= 3).length;
    const best = memberResults.reduce(
      (best, r) => (best === null || r.position < best ? r.position : best),
      null as number | null
    );

    await prisma.ranking.upsert({
      where: { seasonId_memberId: { seasonId, memberId } },
      update: {
        totalPoints,
        participations,
        wins,
        podiums,
        bestResult: best ? `${best}${best === 1 ? "er" : "e"}` : null,
      },
      create: {
        seasonId,
        memberId,
        totalPoints,
        participations,
        wins,
        podiums,
        bestResult: best ? `${best}${best === 1 ? "er" : "e"}` : null,
      },
    });
  }
}

async function main() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) {
    console.log("Aucune saison active trouvée.");
    return;
  }

  const round = await prisma.round.findUnique({
    where: { seasonId_number: { seasonId: season.id, number: ROUND_NUMBER } },
  });
  if (!round) {
    console.log(`Manche ${ROUND_NUMBER} introuvable pour la saison active.`);
    return;
  }

  const member = await prisma.member.findFirst({
    where: { nickname: { equals: NICKNAME, mode: "insensitive" } },
  });
  if (!member) {
    console.log(
      `❌ Aucun membre trouvé avec le pseudo "${NICKNAME}" sur le nouveau site.\n` +
        `Ce joueur doit d'abord avoir un espace membre créé (demande d'adhésion validée dans /admin/demandes-adhesion),\n` +
        `avec exactement ce pseudo, avant de pouvoir lui attribuer ce résultat.`
    );
    return;
  }

  await prisma.result.upsert({
    where: { roundId_memberId: { roundId: round.id, memberId: member.id } },
    update: { position: POSITION, points: POINTS },
    create: { roundId: round.id, memberId: member.id, position: POSITION, points: POINTS },
  });

  await recalculateRanking(season.id);

  console.log(
    `✅ Résultat enregistré : ${member.nickname} — ${POSITION}ère place, ${POINTS} points, Manche ${round.number}.`
  );
  console.log("Le classement de la saison a été recalculé.");
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
