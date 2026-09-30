import { prisma } from "@/lib/prisma";
import type { RoundFormat } from "@prisma/client";
import { after } from "next/server";
import { notifyBureauNewsPublished, resolveSystemAuthorId } from "@/lib/socialAnnounce";
import { pruneOldPublishedNews } from "@/lib/contentPruning";

/**
 * Recalcule le classement (table `Ranking`, dérivée) d'une saison à partir
 * de tous les `Result` enregistrés sur les manches de cette saison.
 *
 * Respecte la configuration de la saison (`RankingConfig`) :
 * - `nbRoundsCounted` : si défini, seuls les N meilleurs résultats comptent.
 * - `tieBreakRule` : "nb_victoires" départage par nombre de 1res places.
 */
export async function recalculateRanking(seasonId: string) {
  const config = await prisma.rankingConfig.findUnique({ where: { seasonId } });

  // Le Sit&Go (RoundFormat.SITNGO) a son propre classement parallèle (voir
  // SitngoRanking / recalculateSitngoRanking ci-dessous) : ses Result sont
  // exclus d'ici pour ne jamais se mélanger au classement général MTT/
  // Deepstack (CFEPA, lui, n'a simplement jamais de Result — voir
  // app/admin/resultats/page.tsx).
  const results = await prisma.result.findMany({
    where: { round: { seasonId, format: { not: "SITNGO" } } },
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
    // Cumul de la saison, comme wins/podiums — pas limité aux N meilleurs
    // résultats (les kills sont un total de performance, pas un score).
    const totalKills = memberResults.reduce((sum, r) => sum + r.kills, 0);
    // Idem pour le bonus "chasseur de champion" (voir syncPositionsFromBusts) —
    // déjà inclus dans totalPoints, affiché à part sur le classement.
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

  // Tenu à jour dans la foulée à chaque appel de recalculateRanking (lui-
  // même déclenché à chaque bust saisi ou supprimé, voir /api/admin/busts) :
  // ainsi le classement Sit&Go reste synchronisé sans qu'aucun appelant
  // n'ait besoin de connaître son existence ni d'appeler une deuxième
  // fonction séparément.
  await recalculateSitngoRanking(seasonId);
}

/**
 * Recalcule le classement parallèle dédié au Sit&Go (table `SitngoRanking`,
 * dérivée) — même logique que recalculateRanking ci-dessus, mais à partir
 * des seuls `Result` des manches de format SITNGO. Jamais appelée à la
 * place de recalculateRanking : toujours en plus (voir l'appel en fin de
 * cette dernière), pour que les deux classements restent synchronisés
 * ensemble à chaque bust saisi ou supprimé, quel que soit le format de la
 * manche concernée.
 */
export async function recalculateSitngoRanking(seasonId: string) {
  const config = await prisma.rankingConfig.findUnique({ where: { seasonId } });

  const results = await prisma.result.findMany({
    where: { round: { seasonId, format: "SITNGO" } },
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

    await prisma.sitngoRanking.upsert({
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
// Manches groupées (Round.groupId) : un tournoi joué sur plusieurs soirées
// (ex. un Deepstack en Day 1 / Day 2) ne doit produire qu'UN SEUL classement
// combiné. Convention : au sein d'un groupe, la manche à la date la plus
// récente est la manche "canonique" — c'est la SEULE à porter des `Result`.
// Les busts (RoundBust), eux, restent attachés à la manche où ils ont
// réellement eu lieu (Day 1 pour les busts du Day 1, Day 2 pour ceux du
// Day 2) ; syncPositionsFromBusts / syncKillsFromBusts commencent donc par
// résoudre tout le groupe avant de recalculer, et n'écrivent jamais que sur
// la manche canonique.
type GroupInfo = {
  roundIds: string[];
  canonicalId: string;
};

export async function resolveGroup(round: { id: string; groupId: string | null; seasonId: string }): Promise<GroupInfo> {
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

/**
 * Éligibilité à l'inscription à un Sit&Go (RoundFormat.SITNGO) — voir
 * Round.linkedDeepstackRoundId : un membre n'est éligible QUE s'il n'est
 * pas actuellement engagé dans le Deepstack lié, c'est-à-dire s'il n'y est
 * jamais inscrit, ou s'il en a déjà été éliminé (présent dans RoundBust).
 * Un Deepstack sur Day 1/Day 2 (Round.groupId) ne redemande pas
 * d'inscription pour le Day 2 (les survivants du Day 1 y sont reconduits
 * automatiquement — voir app/calendrier/page.tsx, isContinuationDay) : on
 * regarde donc TOUT le groupe (Day 1 + Day 2 via resolveGroup), pas
 * seulement la manche liée elle-même. Utilisée par
 * /api/admin/round-registrations pour refuser l'inscription d'un joueur
 * encore en lice, et par app/calendrier/manche/[id]/page.tsx pour ne
 * proposer que les membres éligibles dans le panneau d'inscription.
 */
export async function isEligibleForSitngo(memberId: string, linkedDeepstackRoundId: string): Promise<boolean> {
  const deepstackRound = await prisma.round.findUnique({
    where: { id: linkedDeepstackRoundId },
    select: { id: true, groupId: true, seasonId: true },
  });
  if (!deepstackRound) return true;

  const { roundIds } = await resolveGroup(deepstackRound);

  const [registration, bust] = await Promise.all([
    prisma.roundRegistration.findFirst({
      where: { roundId: { in: roundIds }, memberId, status: "INSCRIT" },
      select: { id: true },
    }),
    prisma.roundBust.findFirst({
      where: { roundId: { in: roundIds }, bustedMemberId: memberId },
      select: { id: true },
    }),
  ]);

  // Actuellement engagé dans le Deepstack = inscrit ET pas encore busté.
  return !(registration && !bust);
}

/**
 * Barème réel du club : dépend à la fois du format de la manche (MTT vs
 * Deepstack ont des grilles différentes) et du nombre de participants (plus
 * il y en a, plus les premières places rapportent) — voir
 * RankingConfig.pointsTable dans prisma/schema.prisma pour la forme exacte.
 * Retourne 0 si le format, l'effectif ou la place ne sont pas couverts par
 * le barème (ex. barème pas encore configuré, ou effectif inhabituel).
 */
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

/**
 * Recalcule Result.kills pour tous les joueurs d'une manche (ou, pour une
 * manche groupée, de tout le groupe) à partir du journal de busts
 * (RoundBust) — voir /api/admin/busts. Dès qu'au moins un bust est
 * enregistré, ce journal fait autorité sur les kills : chaque Result.kills
 * existant (sur la manche canonique du groupe) est remplacé par le nombre de
 * fois où ce membre apparaît comme killer parmi les busts du groupe entier
 * (0 si aucune). Si le groupe n'a aucun bust enregistré, les Result
 * existants ne sont pas touchés.
 */
export async function syncKillsFromBusts(roundId: string) {
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

// Bonus "chasseur de champion" : sortir le vainqueur de la manche précédente
// d'un format donné rapporte des points supplémentaires, en plus des points
// de place habituels — voir syncPositionsFromBusts.
const CHAMPION_BUST_BONUS: Record<string, number> = {
  MTT: 5,
  DEEPSTACK: 10,
};

/**
 * Vainqueur (Result.position === 1) de la manche la plus récente d'un
 * format donné, terminée avant la date indiquée — sert au bonus
 * "chasseur de champion" ci-dessous. Cherche tous formats de saison
 * confondus : le titre de champion en titre se transmet d'une manche à
 * l'autre indépendamment des frontières de saison. Les manches groupées
 * (Day 1/Day 2) ne portent leur Result que sur la manche canonique — déjà
 * naturellement les seules trouvées ici.
 */
async function previousFormatWinner(format: RoundFormat, beforeDate: Date): Promise<string | null> {
  const winner = await prisma.result.findFirst({
    where: { position: 1, round: { format, date: { lt: beforeDate } } },
    orderBy: { round: { date: "desc" } },
    select: { memberId: true },
  });
  return winner?.memberId ?? null;
}

/**
 * Recalcule Result.position ET Result.points pour toute une manche (ou, pour
 * une manche groupée — ex. Deepstack Day 1/Day 2 — pour tout le groupe à la
 * fois) à partir du journal de busts (RoundBust) — aucune place ni point ne
 * se saisit plus à la main (voir components/ResultsAdminPanel.tsx) : l'ordre
 * chronologique des busts, tous jours confondus, EST l'ordre d'élimination —
 * le premier bust enregistré prend la dernière place (n-ième), le suivant
 * l'avant-dernière, etc. Le seul participant jamais busté (parmi les
 * inscrits et les joueurs ajoutés manuellement, sur toutes les manches du
 * groupe) est automatiquement 1er dès qu'il ne reste plus que lui.
 *
 * Les points sont dérivés de la place, du format et de l'effectif via le
 * barème de la saison (RankingConfig.pointsTable) — voir pointsForPosition —
 * PLUS un bonus "chasseur de champion" (CHAMPION_BUST_BONUS) pour qui
 * élimine le vainqueur de la manche précédente d'un format donné : +5 pour
 * le champion MTT sortant, +10 pour le champion Deepstack sortant (cumulables
 * si la même personne détenait les deux titres). Ce bonus s'ajoute aux
 * points du BUSTEUR, pas du busté — que le busteur termine ensuite éliminé
 * lui-même ou vainqueur de la manche.
 *
 * Tous les Result du groupe sont écrits UNIQUEMENT sur la manche canonique
 * (la plus récente) : si une manche non canonique du groupe portait déjà des
 * Result d'un ancien calcul, ils sont supprimés ici pour éviter tout double
 * comptage dans recalculateRanking.
 *
 * Répercute aussi la place sur RoundBust.position (affichage du journal) —
 * voir /api/admin/busts.
 */
export async function syncPositionsFromBusts(roundId: string) {
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
    prisma.round.findUnique({
      where: { id: canonicalId },
      select: { date: true, status: true, number: true, label: true },
    }),
  ]);

  const participantIds = new Set<string>([
    ...registrations.map((r) => r.memberId),
    ...results.map((r) => r.memberId),
    ...busts.map((b) => b.bustedMemberId),
  ]);
  const n = participantIds.size;
  if (n === 0) return;

  // Champions en titre à la date de cette manche (avant elle) — voir
  // CHAMPION_BUST_BONUS ci-dessus.
  const tournamentDate = canonicalRound?.date ?? new Date();
  const [previousMttWinnerId, previousDeepstackWinnerId] = await Promise.all([
    previousFormatWinner("MTT", tournamentDate),
    previousFormatWinner("DEEPSTACK", tournamentDate),
  ]);

  // Bonus par busteur (killerMemberId), cumulé sur tous les busts de la
  // manche/du groupe — indépendant de la place où le busteur termine
  // lui-même, ajouté à ses points au moment de l'upsert de son propre Result
  // plus bas (que ce soit dans la boucle des éliminés ou dans la branche du
  // vainqueur).
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

  // Une manche non canonique du groupe ne doit jamais porter de Result —
  // voir le commentaire de fonction ci-dessus.
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

  // Un seul participant n'a jamais busté : c'est le vainqueur.
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

      // Dès que le vainqueur est connu, on considère la manche (et les
      // éventuelles manches sœurs du même groupe — Day 1/Day 2, voir
      // resolveGroup) comme TERMINEE : elle disparaît du calendrier des
      // manches à venir (app/calendrier, filtre notIn TERMINEE/ANNULEE) et
      // cesse d'être proposée comme "prochaine manche" sur l'accueil (voir
      // getNextRound, app/page.tsx, qui ne regarde que A_VENIR/
      // INSCRIPTIONS_OUVERTES) — ce qui réactive de fait l'inscription à la
      // manche suivante, sans autre code à écrire côté inscriptions.
      //
      // Idempotent : on ne le fait qu'une seule fois (jamais si déjà
      // TERMINEE, jamais si ANNULEE) pour ne pas republier l'annonce
      // ci-dessous à chaque correction ultérieure d'un bust sur une manche
      // déjà close.
      if (canonicalRound && canonicalRound.status !== "TERMINEE" && canonicalRound.status !== "ANNULEE") {
        await prisma.round.updateMany({
          where: { id: { in: roundIds } },
          data: { status: "TERMINEE" },
        });

        // Le 2e de la soirée est le dernier joueur busté (voir la boucle
        // ci-dessus : le premier bust enregistré prend la dernière place,
        // le dernier bust enregistré prend la 2e place puisqu'il ne reste
        // alors plus que le vainqueur).
        const runnerUpId = busts.length > 0 ? busts[busts.length - 1].bustedMemberId : null;

        const [winnerMember, runnerUpMember] = await Promise.all([
          prisma.member.findUnique({ where: { id: winnerId }, select: { nickname: true, publicResults: true } }),
          runnerUpId
            ? prisma.member.findUnique({
                where: { id: runnerUpId },
                select: { nickname: true, publicResults: true },
              })
            : Promise.resolve(null),
        ]);

        const roundLabel = canonicalRound.label ?? `Manche ${canonicalRound.number}`;
        const roundDateLabel = new Date(canonicalRound.date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        // Même règle de confidentialité que partout ailleurs sur le site
        // (classement, "Killé par"...) : un pseudo n'est communiqué que si
        // le membre a choisi de rendre ses résultats publics.
        const winnerPublic = winnerMember?.publicResults ?? false;
        const runnerUpPublic = runnerUpMember?.publicResults ?? false;

        const title = winnerPublic
          ? `🏆 ${roundLabel} : victoire de ${winnerMember!.nickname}`
          : `🏆 ${roundLabel} terminée`;

        const bodyLines = [
          winnerPublic
            ? `${winnerMember!.nickname} remporte ${roundLabel} du ${roundDateLabel} !`
            : `${roundLabel} du ${roundDateLabel} est terminée !`,
          runnerUpMember
            ? runnerUpPublic
              ? `${runnerUpMember.nickname} termine 2e de la soirée.`
              : "Le 2e de la soirée a choisi de garder ses résultats privés."
            : null,
          "",
          "Résultats complets et classement à jour sur la page Classement du club.",
        ].filter((l): l is string => l !== null);

        // Best-effort : une actu manquante ne doit jamais faire échouer la
        // saisie du bust elle-même (voir /api/admin/busts).
        try {
          const authorId = await resolveSystemAuthorId();
          if (authorId) {
            const news = await prisma.news.create({
              data: {
                title,
                body: bodyLines.join("\n"),
                category: "RESULTATS",
                status: "PUBLIE",
                publishAt: new Date(),
                authorId,
              },
            });
            // Même mécanique que la publication manuelle d'une actu (voir
            // app/api/news/[id]/route.ts) : e-mail + sujet forum-bureau
            // prêts à relayer sur les réseaux, et purge des vieilles actus.
            after(() => notifyBureauNewsPublished({ id: news.id, title: news.title, body: news.body }));
            after(() => pruneOldPublishedNews());
          }
        } catch (err) {
          console.error("[syncPositionsFromBusts] échec de la publication de l'annonce de fin de manche", err);
        }
      }
    }
  }
}

/**
 * Évolution de la place au classement entre la dernière manche jouée et
 * celle d'avant, pour chaque membre — calculée à la volée à partir des
 * `Result` déjà enregistrés (pas de nouvel état à maintenir) : on recompose
 * le classement tel qu'il était juste avant la dernière manche (en excluant
 * ses résultats) et on le compare au classement actuel, avec la même règle
 * de "N meilleurs résultats" que `recalculateRanking`.
 *
 * Retourne une Map memberId → delta : positif si le membre a gagné des
 * places (flèche verte vers le haut), négatif s'il en a perdu (flèche rouge
 * vers le bas), absent si le membre n'était pas encore classé avant cette
 * dernière manche (ex. tout juste inscrit — pas d'évolution à afficher).
 */
export async function computeRankChanges(seasonId: string): Promise<Map<string, number>> {
  const config = await prisma.rankingConfig.findUnique({ where: { seasonId } });
  const nbRoundsCounted = config?.nbRoundsCounted ?? null;

  const results = await prisma.result.findMany({
    where: { round: { seasonId } },
    include: { round: true },
  });
  if (results.length === 0) return new Map();

  // Manche la plus récente ayant des résultats saisis (pas forcément déjà
  // marquée TERMINEE — on s'aligne sur ce que compte déjà recalculateRanking).
  const lastRound = results.reduce(
    (latest, r) => (!latest || r.round.date > latest.date ? r.round : latest),
    null as (typeof results)[number]["round"] | null
  )!;

  function totalsOf(rows: typeof results): Map<string, number> {
    const byMember = new Map<string, typeof results>();
    for (const r of rows) {
      const list = byMember.get(r.memberId) ?? [];
      list.push(r);
      byMember.set(r.memberId, list);
    }
    const totals = new Map<string, number>();
    for (const [memberId, memberResults] of byMember) {
      const sorted = [...memberResults].sort((a, b) => b.points - a.points);
      const counted = nbRoundsCounted ? sorted.slice(0, nbRoundsCounted) : sorted;
      totals.set(memberId, counted.reduce((sum, r) => sum + r.points, 0));
    }
    return totals;
  }

  function ranksOf(totals: Map<string, number>): Map<string, number> {
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const ranks = new Map<string, number>();
    sorted.forEach(([memberId], idx) => ranks.set(memberId, idx + 1));
    return ranks;
  }

  const currentRanks = ranksOf(totalsOf(results));
  const previousRanks = ranksOf(totalsOf(results.filter((r) => r.roundId !== lastRound.id)));

  const changes = new Map<string, number>();
  for (const [memberId, currentRank] of currentRanks) {
    const previousRank = previousRanks.get(memberId);
    if (previousRank === undefined) continue;
    changes.set(memberId, previousRank - currentRank); // positif = a gagné des places
  }
  return changes;
}
