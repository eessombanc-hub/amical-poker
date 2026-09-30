import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Transfère toutes les stats (résultats de manches, kills/busts) du membre
 * "JUJU" vers "Jujutte", recalcule le classement de chaque saison
 * concernée, puis supprime "JUJU" du classement (ses lignes Ranking).
 *
 * Même script que prisma/transferer-stats-texas-vers-texasranger.ts et
 * prisma/transferer-stats-nico-w-vers-nicow.ts, adapté à ce doublon (deux
 * pseudos historiques pour le même joueur).
 *
 * Le compte membre "JUJU" lui-même n'est PAS supprimé (juste vidé de ses
 * stats et retiré du classement) — à faire manuellement dans
 * /admin/membres si vous voulez aussi supprimer le compte.
 *
 * Sécurité : si JUJU et Jujutte ont chacun un résultat/bust sur la même
 * manche (cas très improbable mais possible), ce script NE fusionne PAS
 * automatiquement cette ligne-là — il l'ignore et l'affiche en fin
 * d'exécution pour une décision manuelle, plutôt que d'écraser une donnée.
 *
 * Script à usage unique.
 */

const OLD_NICKNAME = "JUJU";
const NEW_NICKNAME = "Jujutte";

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

async function main() {
  const oldMember = await prisma.member.findFirst({
    where: { nickname: { equals: OLD_NICKNAME, mode: "insensitive" } },
  });
  if (!oldMember) {
    console.log(`❌ Aucun membre trouvé avec le pseudo "${OLD_NICKNAME}".`);
    return;
  }
  const newMember = await prisma.member.findFirst({
    where: { nickname: { equals: NEW_NICKNAME, mode: "insensitive" } },
  });
  if (!newMember) {
    console.log(`❌ Aucun membre trouvé avec le pseudo "${NEW_NICKNAME}".`);
    return;
  }
  if (oldMember.id === newMember.id) {
    console.log("❌ Les deux pseudos correspondent au même membre — rien à transférer.");
    return;
  }

  console.log(`Transfert des stats : "${oldMember.nickname}" (${oldMember.id}) → "${newMember.nickname}" (${newMember.id})\n`);

  const conflicts: string[] = [];
  const seasonIds = new Set<string>();

  // ── Résultats de manches (Result) ─────────────────────────────────────
  const oldResults = await prisma.result.findMany({
    where: { memberId: oldMember.id },
    include: { round: { select: { id: true, seasonId: true, number: true, label: true } } },
  });
  let movedResults = 0;
  for (const r of oldResults) {
    const clash = await prisma.result.findUnique({
      where: { roundId_memberId: { roundId: r.roundId, memberId: newMember.id } },
    });
    if (clash) {
      conflicts.push(
        `Result manche ${r.round.label ?? r.round.number} : "${oldMember.nickname}" ET "${newMember.nickname}" ont chacun un résultat — non fusionné, à traiter à la main dans /admin/resultats.`
      );
      continue;
    }
    await prisma.result.update({ where: { id: r.id }, data: { memberId: newMember.id } });
    seasonIds.add(r.round.seasonId);
    movedResults++;
  }

  // ── Journal des busts (RoundBust) — côté "busté" ──────────────────────
  const oldBusted = await prisma.roundBust.findMany({
    where: { bustedMemberId: oldMember.id },
    include: { round: { select: { seasonId: true, number: true, label: true } } },
  });
  let movedBusted = 0;
  for (const b of oldBusted) {
    const clash = await prisma.roundBust.findUnique({
      where: { roundId_bustedMemberId: { roundId: b.roundId, bustedMemberId: newMember.id } },
    });
    if (clash) {
      conflicts.push(
        `RoundBust (busté) manche ${b.round.label ?? b.round.number} : "${oldMember.nickname}" ET "${newMember.nickname}" ont chacun un bust — non fusionné, à traiter à la main.`
      );
      continue;
    }
    await prisma.roundBust.update({ where: { id: b.id }, data: { bustedMemberId: newMember.id } });
    seasonIds.add(b.round.seasonId);
    movedBusted++;
  }

  // ── Journal des busts — côté "killer" (pas de contrainte d'unicité) ───
  const killerUpdate = await prisma.roundBust.updateMany({
    where: { killerMemberId: oldMember.id },
    data: { killerMemberId: newMember.id },
  });

  // ── Inscriptions aux manches (RoundRegistration) ──────────────────────
  const oldRegistrations = await prisma.roundRegistration.findMany({
    where: { memberId: oldMember.id },
    include: { round: { select: { number: true, label: true } } },
  });
  let movedRegistrations = 0;
  for (const reg of oldRegistrations) {
    const clash = await prisma.roundRegistration.findUnique({
      where: { roundId_memberId: { roundId: reg.roundId, memberId: newMember.id } },
    });
    if (clash) {
      conflicts.push(
        `Inscription manche ${reg.round.label ?? reg.round.number} : "${oldMember.nickname}" ET "${newMember.nickname}" sont chacun inscrits — non fusionné, à traiter à la main.`
      );
      continue;
    }
    await prisma.roundRegistration.update({ where: { id: reg.id }, data: { memberId: newMember.id } });
    movedRegistrations++;
  }

  // ── Recalcul du classement de chaque saison touchée ───────────────────
  for (const seasonId of seasonIds) {
    await recalculateRanking(seasonId);
  }

  // ── Retrait de JUJU du classement (toutes saisons) ────────────────────
  const deletedRankings = await prisma.ranking.deleteMany({ where: { memberId: oldMember.id } });

  console.log(`✅ Résultats de manches transférés : ${movedResults}`);
  console.log(`✅ Busts (éliminé par) transférés : ${movedBusted}`);
  console.log(`✅ Busts (a éliminé) réattribués : ${killerUpdate.count}`);
  console.log(`✅ Inscriptions aux manches transférées : ${movedRegistrations}`);
  console.log(`✅ Classement recalculé pour ${seasonIds.size} saison(s).`);
  console.log(`✅ "${oldMember.nickname}" retiré du classement (${deletedRankings.count} ligne(s) supprimée(s)).`);

  if (conflicts.length > 0) {
    console.log(`\n⚠️  ${conflicts.length} conflit(s) NON transféré(s) automatiquement :`);
    for (const c of conflicts) console.log(`   - ${c}`);
  }

  console.log(
    `\nNote : le compte membre "${oldMember.nickname}" existe toujours (juste vidé de ses stats et retiré du classement). Pour le supprimer complètement, faites-le depuis /admin/membres.`
  );
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
