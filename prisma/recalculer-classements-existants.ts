import { PrismaClient } from "@prisma/client";
import type { RoundFormat } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script à usage unique : recalcule position/points/bonusPoints de TOUTES
 * les manches ayant déjà un journal de busts (RoundBust) enregistré, avec la
 * version ACTUELLE de la logique de classement (lib/ranking.ts) — y compris
 * le bonus "chasseur de champion" (+5 pour sortir le champion MTT sortant,
 * +10 pour le champion Deepstack sortant, voir CHAMPION_BUST_BONUS).
 *
 * Pourquoi ce script est nécessaire : syncPositionsFromBusts ne se relance
 * automatiquement QUE quand un bust est ajouté, modifié ou supprimé pour une
 * manche donnée (voir app/api/admin/busts/route.ts). Toute manche dont les
 * busts ont été saisis AVANT le déploiement du bonus (ex. Manche 1, saisie
 * par prisma/completer-saison-2026-2027.ts avec une copie de la logique
 * antérieure au bonus, ou une manche saisie via /admin avant le déploiement
 * du 19/09/2026) garde donc des Result à jour sur tout SAUF le bonus, qui
 * reste bloqué à 0 tant que personne ne re-touche un bust de cette manche.
 * Cas concret ayant révélé le problème : DRAGENARD a sorti GULP (vainqueur
 * de la Manche 1) en Manche 2, sans être crédité des +5 points — la formule
 * elle-même est correcte (vérifiée dans lib/ranking.ts), c'est le recalcul
 * qui n'avait jamais eu lieu pour cette manche depuis le déploiement du
 * bonus.
 *
 * Ce script est sûr à relancer plusieurs fois : il ne fait que redériver
 * position/points/bonusPoints/kills à partir du journal de busts (source de
 * vérité), jamais d'ajout ni de duplication de points.
 *
 * Logique dupliquée de lib/ranking.ts (comme les autres scripts prisma/*.ts
 * à usage unique, qui n'importent pas le code de l'app pour rester
 * indépendants des alias de chemin "@/") — à tenir à jour avec ce fichier si
 * la formule de points ou de bonus change à nouveau.
 *
 * Usage : npx tsx prisma/recalculer-classements-existants.ts
 */

// ─────────────────────────────────────────────────────────────────────────
// Logique de classement (copie de lib/ranking.ts, version au 19/09/2026)
// ─────────────────────────────────────────────────────────────────────────

type GroupInfo = { roundIds: string[]; canonicalId: string };

async function resolveGroup(round: { id: string; groupId: string | null; seasonId: string }): Promise<GroupInfo> {
  if (!round.groupId) {
    return { roundIds: [round.id], canonicalId: round.id };
  }
  const siblings = await prisma.round.findMany({
    where: { groupId: round.groupId, seasonId: round.seasonId },
    select: { id: true, date: true },
  });
  const roundIds = siblings.map((r) => r.id);
  const canonical = siblings.reduce((latest, r) => (r.date > latest.date ? r : latest), siblings[0]);
  return { roundIds, canonicalId: canonical.id };
}

function pointsForPosition(
  pointsTable: unknown,
  format: string,
  participantCount: number,
  position: number
): number {
  const table = pointsTable as Record<string, Record<string, Record<string, number>>> | null;
  const byParticipants = table?.[format]?.[String(participantCount)];
  return byParticipants?.[String(position)] ?? 0;
}

const CHAMPION_BUST_BONUS: Record<string, number> = {
  MTT: 5,
  DEEPSTACK: 10,
};

async function previousFormatWinner(format: RoundFormat, beforeDate: Date): Promise<string | null> {
  const winner = await prisma.result.findFirst({
    where: { position: 1, round: { format, date: { lt: beforeDate } } },
    orderBy: { round: { date: "desc" } },
    select: { memberId: true },
  });
  return winner?.memberId ?? null;
}

async function syncPositionsFromBusts(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, seasonId: true, groupId: true, format: true },
  });
  if (!round) return;

  const { roundIds, canonicalId } = await resolveGroup(round);

  const [config, busts, registrations, results, canonicalRound] = await Promise.all([
    prisma.rankingConfig.findUnique({ where: { seasonId: round.seasonId } }),
    prisma.roundBust.findMany({ where: { roundId: { in: roundIds } }, orderBy: { createdAt: "asc" } }),
    prisma.roundRegistration.findMany({
      where: { roundId: { in: roundIds }, status: "INSCRIT" },
      select: { memberId: true },
    }),
    prisma.result.findMany({ where: { roundId: canonicalId }, select: { memberId: true } }),
    prisma.round.findUnique({ where: { id: canonicalId }, select: { date: true } }),
  ]);

  const participantIds = new Set<string>([
    ...registrations.map((r) => r.memberId),
    ...results.map((r) => r.memberId),
    ...busts.map((b) => b.bustedMemberId),
  ]);
  const n = participantIds.size;
  if (n === 0) return;

  const tournamentDate = canonicalRound?.date ?? new Date();
  const [previousMttWinnerId, previousDeepstackWinnerId] = await Promise.all([
    previousFormatWinner("MTT", tournamentDate),
    previousFormatWinner("DEEPSTACK", tournamentDate),
  ]);

  const bonusByMember = new Map<string, number>();
  for (const b of busts) {
    if (!b.killerMemberId) continue;
    let bonus = 0;
    if (previousMttWinnerId && b.bustedMemberId === previousMttWinnerId) bonus += CHAMPION_BUST_BONUS.MTT;
    if (previousDeepstackWinnerId && b.bustedMemberId === previousDeepstackWinnerId) bonus += CHAMPION_BUST_BONUS.DEEPSTACK;
    if (bonus > 0) {
      bonusByMember.set(b.killerMemberId, (bonusByMember.get(b.killerMemberId) ?? 0) + bonus);
    }
  }

  const staleRoundIds = roundIds.filter((id) => id !== canonicalId);
  if (staleRoundIds.length > 0) {
    await prisma.result.deleteMany({ where: { roundId: { in: staleRoundIds } } });
  }

  for (let i = 0; i < busts.length; i++) {
    const position = n - i;
    const memberId = busts[i].bustedMemberId;
    const bonusPoints = bonusByMember.get(memberId) ?? 0;
    const points = pointsForPosition(config?.pointsTable, round.format, n, position) + bonusPoints;
    await prisma.roundBust.update({ where: { id: busts[i].id }, data: { position } });
    await prisma.result.upsert({
      where: { roundId_memberId: { roundId: canonicalId, memberId } },
      update: { position, points, bonusPoints },
      create: { roundId: canonicalId, memberId, position, points, bonusPoints, kills: 0 },
    });
  }

  if (busts.length === n - 1) {
    const bustedIds = new Set(busts.map((b) => b.bustedMemberId));
    const winnerId = [...participantIds].find((id) => !bustedIds.has(id));
    if (winnerId) {
      const bonusPoints = bonusByMember.get(winnerId) ?? 0;
      const points = pointsForPosition(config?.pointsTable, round.format, n, 1) + bonusPoints;
      await prisma.result.upsert({
        where: { roundId_memberId: { roundId: canonicalId, memberId: winnerId } },
        update: { position: 1, points, bonusPoints },
        create: { roundId: canonicalId, memberId: winnerId, position: 1, points, bonusPoints, kills: 0 },
      });
    }
  }
}

async function syncKillsFromBusts(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, groupId: true, seasonId: true },
  });
  if (!round) return;
  const { roundIds, canonicalId } = await resolveGroup(round);

  const busts = await prisma.roundBust.findMany({ where: { roundId: { in: roundIds } } });
  if (busts.length === 0) return;

  const killTally = new Map<string, number>();
  for (const b of busts) {
    if (!b.killerMemberId) continue;
    killTally.set(b.killerMemberId, (killTally.get(b.killerMemberId) ?? 0) + 1);
  }

  const existingResults = await prisma.result.findMany({ where: { roundId: canonicalId } });
  for (const r of existingResults) {
    const kills = killTally.get(r.memberId) ?? 0;
    if (r.kills !== kills) {
      await prisma.result.update({ where: { id: r.id }, data: { kills } });
    }
  }
}

async function recalculateRanking(seasonId: string) {
  const config = await prisma.rankingConfig.findUnique({ where: { seasonId } });
  const results = await prisma.result.findMany({ where: { round: { seasonId } }, include: { round: true } });

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
    const totalKills = memberResults.reduce((sum, r) => sum + r.kills, 0);
    const totalBonusPoints = memberResults.reduce((sum, r) => sum + r.bonusPoints, 0);
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
        totalKills,
        totalBonusPoints,
        bestResult: best ? `${best}${best === 1 ? "er" : "e"}` : null,
      },
      create: {
        seasonId,
        memberId,
        totalPoints,
        participations,
        wins,
        podiums,
        totalKills,
        totalBonusPoints,
        bestResult: best ? `${best}${best === 1 ? "er" : "e"}` : null,
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const roundsWithBusts = await prisma.roundBust.findMany({
    distinct: ["roundId"],
    select: { roundId: true },
  });

  if (roundsWithBusts.length === 0) {
    console.log("ℹ️  Aucune manche avec un journal de busts — rien à recalculer.");
    return;
  }

  console.log(`🔄 ${roundsWithBusts.length} manche(s) avec busts trouvée(s) — recalcul en cours…`);

  const touchedSeasonIds = new Set<string>();

  for (const { roundId } of roundsWithBusts) {
    const round = await prisma.round.findUnique({ where: { id: roundId }, select: { seasonId: true, label: true, number: true } });
    if (!round) continue;
    await syncPositionsFromBusts(roundId);
    await syncKillsFromBusts(roundId);
    touchedSeasonIds.add(round.seasonId);
    console.log(`   ✅ Manche ${round.number}${round.label ? ` (${round.label})` : ""} recalculée.`);
  }

  for (const seasonId of touchedSeasonIds) {
    await recalculateRanking(seasonId);
  }
  console.log(`✅ Classement (Ranking) recalculé pour ${touchedSeasonIds.size} saison(s).`);

  console.log("\n🎉 Script terminé — le bonus « chasseur de champion » est désormais à jour partout.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
