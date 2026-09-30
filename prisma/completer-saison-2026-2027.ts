import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import bareme from "./bareme-points-2025-2026.json";

const prisma = new PrismaClient();

// Alphabet sans caractères ambigus (0/O, 1/l/I) — même génération que
// lib/tempPassword.ts, dupliquée ici comme le reste de la logique de ce
// script (voir l'en-tête plus haut : les scripts prisma/*.ts à usage unique
// n'importent pas le code de l'app).
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(0, PASSWORD_ALPHABET.length)];
  return out;
}

/**
 * Script à usage unique (comme prisma/entrer-vainqueur-manche1.ts et
 * prisma/ouvrir-prochaine-manche.ts) : complète le calendrier 2026/2027 avec
 * TOUTES les manches réelles restantes (synchronisées depuis le site
 * historique, amicalpokerclub.jimdofree.com/saison-2026-2027-1/), configure
 * le barème de points réel du club (MTT + Deepstack, dépendant du nombre de
 * participants — voir prisma/bareme-points-2025-2026.json), crée les 5
 * événements hors-manche (Arena Poker Camp, HIP Poker Tour, Finale CFIPA,
 * Barbecue), et reconstitue le journal de busts complet de la Manche 1
 * (4 septembre 2026) à partir du relevé d'éliminations du site historique —
 * avec le vainqueur (killer) de chaque élimination.
 *
 * IMPORTANT — renumérotation : le site historique numérote les MTT et les
 * Deepstack indépendamment (MTT 1, 2, 3, 4… / Deep 1, 2, 3…), mais l'Amical
 * Poker Club veut que le numéro de "Manche" du nouveau site suive l'ordre
 * chronologique RÉEL, tous formats confondus. Résultat : la manche déjà en
 * ligne "MTT 4" (13 nov. 2026) devient Manche 6, et "MTT 5 — Win the
 * Button" (27 nov. 2026) devient Manche 8, parce qu'un Deepstack (manches 4
 * et 5, Day 1/Day 2) et un CFEPA (manche 7) s'intercalent chronologiquement
 * avant elles. Ce script retrouve ces deux manches par leur DATE (pas par
 * leur ancien numéro) avant de les renuméroter — il est donc sûr de le
 * relancer plusieurs fois.
 *
 * Un Deepstack sur deux soirées (Day 1 / Day 2) est modélisé comme DEUX
 * manches distinctes reliées par Round.groupId (ex. "deep-1") : elles
 * apparaissent séparément dans le calendrier mais ne produisent qu'UN SEUL
 * classement combiné — voir lib/ranking.ts.
 *
 * Comptes joueurs manquants (Manche 1) : la plupart des 28 joueurs de cette
 * partie n'ont pas encore de compte sur le nouveau site (migration en
 * cours). Plutôt que d'attendre, ce script crée pour chacun une fiche
 * membre "placeholder" (statut EN_ATTENTE, résultats publics — cette donnée
 * est déjà publique de longue date sur le site historique, la republier ici
 * n'expose rien de nouveau) afin que le classement, les points et les kills
 * de la Manche 1 soient complets et visibles dès maintenant, comme sur le
 * site historique. Si l'un de ces joueurs rejoint réellement le club plus
 * tard, retrouvez sa fiche dans /admin/membres (pseudo identique)
 * pour la compléter au lieu d'en créer une nouvelle.
 *
 * Hypothèses à vérifier (le site historique ne précise pas tout) :
 *  - CFEPA : lieu "Espace Calès" et horaire 09h30/09h30 non confirmés par le
 *    site historique (qui n'indique qu'un horaire unique "09H30" et aucun
 *    lieu) — à corriger dans /admin si besoin une fois la manche créée.
 *  - Deepstack : horaires 20h15/20h45 alignés sur la convention réelle du
 *    club pour les manches du vendredi soir (déjà appliquée aux MTT en
 *    ligne), plutôt que le "20H30" générique du site historique.
 *
 * Usage : npx tsx prisma/completer-saison-2026-2027.ts
 */

// ─────────────────────────────────────────────────────────────────────────
// 1) Calendrier complet des manches notées (30), dans l'ordre chronologique
//    réel = numéro de Manche sur le nouveau site.
// ─────────────────────────────────────────────────────────────────────────

type RoundFormat = "MTT" | "DEEPSTACK" | "CFEPA";

type RoundSeed = {
  number: number;
  date: string; // YYYY-MM-DD
  format: RoundFormat;
  location: string;
  openTime: string;
  startTime: string;
  groupId?: string;
  legacyLabel: string; // pour les logs uniquement
  // Vrai nom affiché au public — voir Round.label dans schema.prisma.
  label: string;
  // Si renumberFromDate est vrai, on NE CRÉE PAS cette manche : on retrouve
  // la manche existante à cette date (créée par prisma/seed.ts) et on la
  // renumérote seulement (voir §3).
  existingRenumberOnly?: boolean;
};

const ESPACE_CALES = "Espace Calès";
const MTT_TIMES = { openTime: "20h15", startTime: "20h45" };
const CFEPA_TIMES = { openTime: "09h30", startTime: "09h30" }; // hypothèse, voir en-tête

const ROUNDS: RoundSeed[] = [
  { number: 1, date: "2026-09-04", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 1 (AG)", label: "MTT 1 — Assemblée générale" },
  { number: 2, date: "2026-09-18", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 2", label: "MTT 2" },
  { number: 3, date: "2026-09-25", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 3", label: "MTT 3" },
  { number: 4, date: "2026-10-09", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-1", legacyLabel: "Deep 1 Day 1", label: "Deepstack 1 — Day 1" },
  { number: 5, date: "2026-10-16", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-1", legacyLabel: "Deep 1 Day 2", label: "Deepstack 1 — Day 2" },
  { number: 6, date: "2026-11-13", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 4", label: "MTT 4", existingRenumberOnly: true },
  { number: 7, date: "2026-11-22", format: "CFEPA", location: ESPACE_CALES, ...CFEPA_TIMES, legacyLabel: "CFEPA 1", label: "CFEPA 1" },
  { number: 8, date: "2026-11-27", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 5 (Win the Button)", label: "MTT 5 — Win the Button", existingRenumberOnly: true },
  { number: 9, date: "2026-12-04", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-2", legacyLabel: "Deep 2 Day 1", label: "Deepstack 2 — Day 1" },
  { number: 10, date: "2026-12-11", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-2", legacyLabel: "Deep 2 Day 2", label: "Deepstack 2 — Day 2" },
  { number: 11, date: "2026-12-13", format: "CFEPA", location: ESPACE_CALES, ...CFEPA_TIMES, legacyLabel: "CFEPA 2", label: "CFEPA 2" },
  { number: 12, date: "2027-01-08", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 6", label: "MTT 6" },
  { number: 13, date: "2027-01-15", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 7", label: "MTT 7" },
  { number: 14, date: "2027-01-17", format: "CFEPA", location: ESPACE_CALES, ...CFEPA_TIMES, legacyLabel: "CFEPA 3", label: "CFEPA 3" },
  { number: 15, date: "2027-01-29", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-3", legacyLabel: "Deep 3 Day 1", label: "Deepstack 3 — Day 1" },
  { number: 16, date: "2027-02-05", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-3", legacyLabel: "Deep 3 Day 2", label: "Deepstack 3 — Day 2" },
  { number: 17, date: "2027-02-26", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 8", label: "MTT 8" },
  { number: 18, date: "2027-02-28", format: "CFEPA", location: ESPACE_CALES, ...CFEPA_TIMES, legacyLabel: "CFEPA 4", label: "CFEPA 4" },
  { number: 19, date: "2027-03-05", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 9", label: "MTT 9" },
  { number: 20, date: "2027-03-19", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-4", legacyLabel: "Deep 4 Day 1", label: "Deepstack 4 — Day 1" },
  { number: 21, date: "2027-03-21", format: "CFEPA", location: ESPACE_CALES, ...CFEPA_TIMES, legacyLabel: "CFEPA 5", label: "CFEPA 5" },
  { number: 22, date: "2027-03-26", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-4", legacyLabel: "Deep 4 Day 2", label: "Deepstack 4 — Day 2" },
  { number: 23, date: "2027-04-02", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 10 (Kill the Fish)", label: "MTT 10 — Kill the Fish" },
  { number: 24, date: "2027-04-23", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 11", label: "MTT 11" },
  { number: 25, date: "2027-04-30", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 12", label: "MTT 12" },
  { number: 26, date: "2027-05-21", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 13", label: "MTT 13" },
  { number: 27, date: "2027-05-28", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-5", legacyLabel: "Deep 5 Day 1", label: "Deepstack 5 — Day 1" },
  { number: 28, date: "2027-06-04", format: "DEEPSTACK", location: ESPACE_CALES, ...MTT_TIMES, groupId: "deep-5", legacyLabel: "Deep 5 Day 2", label: "Deepstack 5 — Day 2" },
  { number: 29, date: "2027-06-11", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 14", label: "MTT 14" },
  { number: 30, date: "2027-06-25", format: "MTT", location: ESPACE_CALES, ...MTT_TIMES, legacyLabel: "MTT 15", label: "MTT 15" },
];

// ─────────────────────────────────────────────────────────────────────────
// 2) Événements hors-manche (informationnels, sans classement).
// ─────────────────────────────────────────────────────────────────────────

const EVENTS = [
  {
    name: "HIP Poker Tour Croupier",
    description: "Vendredi 2 octobre 2026, 8h45, Vincennes. Événement hors-manche (ne compte pas au classement).",
    date: "2026-10-02",
    location: "Vincennes",
  },
  {
    name: "Arena Poker Camp 28",
    description: "Du 7 au 11 novembre 2026, Espagne. Événement hors-manche (ne compte pas au classement).",
    date: "2026-11-07",
    location: "Espagne",
  },
  {
    name: "Finale CFIPA",
    description: "Du 6 au 9 mai 2027, Paris. Événement hors-manche (ne compte pas au classement).",
    date: "2027-05-06",
    location: "Paris",
  },
  {
    name: "Arena Poker Camp 29 et 30",
    description: "Du 8 au 16 mai 2027, Espagne. Événement hors-manche (ne compte pas au classement).",
    date: "2027-05-08",
    location: "Espagne",
  },
  {
    name: "Barbecue",
    description:
      "Samedi 26 juin 2027, 12h30. Lieu non précisé par le site historique — à compléter. Événement hors-manche (ne compte pas au classement).",
    date: "2027-06-26",
    location: "À préciser",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 3) Journal d'élimination de la Manche 1 (4 septembre 2026), relevé sur
//    /saison-2026-2027-1/résultats-parties/ du site historique : pour
//    chaque joueur, sa place finale et qui l'a éliminé. GULP (place 1)
//    n'a jamais été busté — vainqueur. Reconstitué ici dans l'ORDRE
//    CHRONOLOGIQUE d'élimination (place 28 → place 2) pour que
//    syncPositionsFromBusts (voir lib/ranking.ts) déduise les mêmes places.
// ─────────────────────────────────────────────────────────────────────────

const ROUND1_ELIMINATIONS: { place: number; joueur: string; sortiPar: string }[] = [
  { place: 2, joueur: "MAKS", sortiPar: "GULP" },
  { place: 3, joueur: "CLOCHETTE", sortiPar: "GULP" },
  { place: 4, joueur: "TITI", sortiPar: "MAKS" },
  { place: 5, joueur: "MSCI94", sortiPar: "TITI" },
  { place: 6, joueur: "JUJU", sortiPar: "CLOCHETTE" },
  { place: 7, joueur: "VINCENT", sortiPar: "GULP" },
  { place: 8, joueur: "TORTU77", sortiPar: "MAKS" },
  { place: 9, joueur: "DRAGENARD", sortiPar: "VINCENT" },
  { place: 10, joueur: "NICO W", sortiPar: "TORTU77" },
  { place: 11, joueur: "JOSSWILL", sortiPar: "MAKS" },
  { place: 12, joueur: "TENZA", sortiPar: "JOSSWILL" },
  { place: 13, joueur: "EAGLESTAR777", sortiPar: "GULP" },
  { place: 14, joueur: "TOPHE94", sortiPar: "MAKS" },
  { place: 15, joueur: "GRINCHEUX", sortiPar: "TITI" },
  { place: 16, joueur: "WILL972", sortiPar: "TITI" },
  { place: 17, joueur: "PVBART", sortiPar: "TORTU77" },
  { place: 18, joueur: "JPL", sortiPar: "VINCENT" },
  { place: 19, joueur: "PAYOU", sortiPar: "GULP" },
  { place: 20, joueur: "JAY_DUKU", sortiPar: "VINCENT" },
  { place: 21, joueur: "FRED", sortiPar: "TORTU77" },
  { place: 22, joueur: "AIZEN", sortiPar: "TITI" },
  { place: 23, joueur: "GIGI94", sortiPar: "CLOCHETTE" },
  { place: 24, joueur: "ANTO", sortiPar: "TENZA" },
  { place: 25, joueur: "LE STYX", sortiPar: "VINCENT" },
  { place: 26, joueur: "HAMMER", sortiPar: "JUJU" },
  { place: 27, joueur: "TEXAS", sortiPar: "CLOCHETTE" },
  { place: 28, joueur: "OLIVIER", sortiPar: "LE STYX" },
];
const ROUND1_WINNER_NICKNAME = "GULP";
const ROUND1_NUMBER = 1;
const ROUND1_DATE = "2026-09-04";

// ─────────────────────────────────────────────────────────────────────────
// Logique de classement (copie de lib/ranking.ts — voir ce fichier pour la
// documentation complète ; dupliquée ici comme dans les autres scripts
// prisma/*.ts à usage unique, qui n'importent pas le code de l'app).
// ─────────────────────────────────────────────────────────────────────────

function pointsForPosition(pointsTable: unknown, format: string, participantCount: number, position: number): number {
  const table = pointsTable as Record<string, Record<string, Record<string, number>>> | null;
  const byParticipants = table?.[format]?.[String(participantCount)];
  return byParticipants?.[String(position)] ?? 0;
}

async function syncPositionsFromBusts(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, seasonId: true, groupId: true, format: true },
  });
  if (!round) return;

  const roundIds = round.groupId
    ? (await prisma.round.findMany({ where: { groupId: round.groupId, seasonId: round.seasonId }, select: { id: true } })).map((r) => r.id)
    : [round.id];
  const canonicalId = round.groupId
    ? (
        await prisma.round.findMany({ where: { groupId: round.groupId, seasonId: round.seasonId }, select: { id: true, date: true } })
      ).reduce((latest, r) => (r.date > latest.date ? r : latest)).id
    : round.id;

  const [config, busts, registrations, results] = await Promise.all([
    prisma.rankingConfig.findUnique({ where: { seasonId: round.seasonId } }),
    prisma.roundBust.findMany({ where: { roundId: { in: roundIds } }, orderBy: { createdAt: "asc" } }),
    prisma.roundRegistration.findMany({ where: { roundId: { in: roundIds }, status: "INSCRIT" }, select: { memberId: true } }),
    prisma.result.findMany({ where: { roundId: canonicalId }, select: { memberId: true } }),
  ]);

  const participantIds = new Set<string>([
    ...registrations.map((r) => r.memberId),
    ...results.map((r) => r.memberId),
    ...busts.map((b) => b.bustedMemberId),
  ]);
  const n = participantIds.size;
  if (n === 0) return;

  const staleRoundIds = roundIds.filter((id) => id !== canonicalId);
  if (staleRoundIds.length > 0) {
    await prisma.result.deleteMany({ where: { roundId: { in: staleRoundIds } } });
  }

  for (let i = 0; i < busts.length; i++) {
    const position = n - i;
    const points = pointsForPosition(config?.pointsTable, round.format, n, position);
    await prisma.roundBust.update({ where: { id: busts[i].id }, data: { position } });
    await prisma.result.upsert({
      where: { roundId_memberId: { roundId: canonicalId, memberId: busts[i].bustedMemberId } },
      update: { position, points },
      create: { roundId: canonicalId, memberId: busts[i].bustedMemberId, position, points, kills: 0 },
    });
  }

  if (busts.length === n - 1) {
    const bustedIds = new Set(busts.map((b) => b.bustedMemberId));
    const winnerId = [...participantIds].find((id) => !bustedIds.has(id));
    if (winnerId) {
      const points = pointsForPosition(config?.pointsTable, round.format, n, 1);
      await prisma.result.upsert({
        where: { roundId_memberId: { roundId: canonicalId, memberId: winnerId } },
        update: { position: 1, points },
        create: { roundId: canonicalId, memberId: winnerId, position: 1, points, kills: 0 },
      });
    }
  }
}

async function syncKillsFromBusts(roundId: string) {
  const round = await prisma.round.findUnique({ where: { id: roundId }, select: { id: true, groupId: true, seasonId: true } });
  if (!round) return;
  const roundIds = round.groupId
    ? (await prisma.round.findMany({ where: { groupId: round.groupId, seasonId: round.seasonId }, select: { id: true } })).map((r) => r.id)
    : [round.id];
  const canonicalId = round.groupId
    ? (
        await prisma.round.findMany({ where: { groupId: round.groupId, seasonId: round.seasonId }, select: { id: true, date: true } })
      ).reduce((latest, r) => (r.date > latest.date ? r : latest)).id
    : round.id;

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
    const best = memberResults.reduce((b, r) => (b === null || r.position < b ? r.position : b), null as number | null);

    await prisma.ranking.upsert({
      where: { seasonId_memberId: { seasonId, memberId } },
      update: { totalPoints, participations, wins, podiums, totalKills, bestResult: best ? `${best}${best === 1 ? "er" : "e"}` : null },
      create: { seasonId, memberId, totalPoints, participations, wins, podiums, totalKills, bestResult: best ? `${best}${best === 1 ? "er" : "e"}` : null },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) {
    console.log("❌ Aucune saison active trouvée — lancez d'abord prisma/seed.ts.");
    return;
  }

  // ── 1) Barème de points réel (MTT + Deepstack) ──
  await prisma.rankingConfig.upsert({
    where: { seasonId: season.id },
    update: { pointsTable: bareme as any },
    create: { seasonId: season.id, pointsTable: bareme as any, nbRoundsCounted: null, tieBreakRule: "nb_victoires" },
  });
  console.log("✅ Barème de points (MTT + Deepstack) enregistré.");

  // ── 2) Renumérotation des 2 manches déjà en ligne (par DATE, pas par ancien numéro) ──
  for (const r of ROUNDS.filter((r) => r.existingRenumberOnly)) {
    const existing = await prisma.round.findFirst({ where: { seasonId: season.id, date: new Date(r.date) } });
    if (!existing) {
      console.log(`⚠️  Manche existante attendue au ${r.date} (${r.legacyLabel}) introuvable — création directe en tant que Manche ${r.number}.`);
      await prisma.round.upsert({
        where: { seasonId_number: { seasonId: season.id, number: r.number } },
        update: { label: r.label },
        create: {
          seasonId: season.id,
          number: r.number,
          date: new Date(r.date),
          openTime: r.openTime,
          startTime: r.startTime,
          location: r.location,
          format: r.format,
          maxSeats: 45,
          status: "A_VENIR",
          label: r.label,
        },
      });
      continue;
    }
    if (existing.number !== r.number || existing.label !== r.label) {
      await prisma.round.update({ where: { id: existing.id }, data: { number: r.number, label: r.label } });
      console.log(`✅ Manche du ${r.date} (${r.legacyLabel}) renumérotée : ${existing.number} → ${r.number}, nommée « ${r.label} ».`);
    } else {
      console.log(`ℹ️  Manche du ${r.date} (${r.legacyLabel}) déjà numérotée ${r.number}.`);
    }
  }

  // ── 3) Création des manches manquantes ──
  for (const r of ROUNDS.filter((r) => !r.existingRenumberOnly)) {
    await prisma.round.upsert({
      where: { seasonId_number: { seasonId: season.id, number: r.number } },
      update: {
        date: new Date(r.date),
        openTime: r.openTime,
        startTime: r.startTime,
        location: r.location,
        format: r.format,
        groupId: r.groupId ?? null,
        label: r.label,
      },
      create: {
        seasonId: season.id,
        number: r.number,
        date: new Date(r.date),
        openTime: r.openTime,
        startTime: r.startTime,
        location: r.location,
        format: r.format,
        maxSeats: 45,
        status: "A_VENIR",
        groupId: r.groupId ?? null,
        label: r.label,
      },
    });
  }
  console.log(`✅ Calendrier complété : ${ROUNDS.length} manches au total pour la saison ${season.label}.`);

  // ── 4) Événements hors-manche ──
  for (const e of EVENTS) {
    const existing = await prisma.event.findFirst({ where: { name: e.name, date: new Date(e.date) } });
    if (existing) continue;
    await prisma.event.create({ data: { name: e.name, description: e.description, date: new Date(e.date), location: e.location } });
  }
  console.log(`✅ ${EVENTS.length} événement(s) hors-manche vérifié(s)/créé(s).`);

  // ── 5) Journal de busts de la Manche 1 ──
  const round1 = await prisma.round.findFirst({ where: { seasonId: season.id, number: ROUND1_NUMBER, date: new Date(ROUND1_DATE) } });
  if (!round1) {
    console.log(`❌ Manche ${ROUND1_NUMBER} introuvable au ${ROUND1_DATE} — journal de busts non traité.`);
  } else {
    const nicknames = [ROUND1_WINNER_NICKNAME, ...ROUND1_ELIMINATIONS.flatMap((e) => [e.joueur, e.sortiPar])];
    const uniqueNicknames = [...new Set(nicknames)];
    const members = await prisma.member.findMany({
      where: { nickname: { in: uniqueNicknames, mode: "insensitive" } },
      select: {
        id: true,
        nickname: true,
        membershipStatus: true,
        publicResults: true,
        user: { select: { email: true } },
      },
    });
    const byNickname = new Map(members.map((m) => [m.nickname.toLowerCase(), m.id]));
    const missing = uniqueNicknames.filter((n) => !byNickname.has(n.toLowerCase()));

    // Réparation : une fiche placeholder déjà créée lors d'un précédent
    // lancement de ce script (avant la correction ci-dessous, ou avant la
    // correction du barème) a pu rester avec publicResults=false — ce qui la
    // rend invisible sur /classement même une fois ses points recalculés
    // correctement. On la remet à true ici à chaque lancement, pour que ce
    // script reste sûr à relancer plusieurs fois (cf. en-tête).
    let repaired = 0;
    for (const m of members) {
      const isPlaceholder = m.membershipStatus === "EN_ATTENTE" && !!m.user?.email.endsWith("@apcv-poker.local");
      if (isPlaceholder && !m.publicResults) {
        await prisma.member.update({ where: { id: m.id }, data: { publicResults: true } });
        repaired++;
      }
    }
    if (repaired > 0) {
      console.log(`✅ ${repaired} fiche(s) placeholder existante(s) recalée(s) sur publicResults=true.`);
    }

    // Les joueurs de la Manche 1 n'ont pour la plupart pas encore de compte
    // sur le nouveau site (migration en cours depuis le site historique) —
    // à la demande du club, on ne bloque pas le classement de cette manche
    // en attendant : une fiche membre "placeholder" est créée pour chaque
    // pseudo manquant (même mécanisme que POST /api/admin/members : un
    // User avec mot de passe temporaire généré + une fiche Member), avec
    // statut EN_ATTENTE. publicResults=true ici (exception au défaut RGPD
    // "pas de consentement = pas d'affichage") car ce résultat est une
    // synchronisation d'une donnée DÉJÀ publique depuis longtemps sur le
    // site historique du club (amicalpokerclub.jimdofree.com/saison-2026-2027-1/) :
    // le republier ici n'expose rien de nouveau. Si la vraie personne
    // rejoint le club plus tard (voir /api/admin/membership-requests/[id],
    // isPlaceholderMember), elle garde la main sur ce choix pour la suite
    // via /espace-membre. Fiche à retrouver et compléter dans /admin/membres
    // si besoin.
    if (missing.length > 0) {
      console.log(`ℹ️  ${missing.length} pseudo(s) sans compte — création de fiches placeholder :`);
      for (const nickname of missing) {
        const email = `historique-${nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}@apcv-poker.local`;
        const passwordHash = await bcrypt.hash(generateTempPassword(), 12);
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            role: "MEMBRE",
            member: {
              create: {
                firstName: "Joueur historique",
                lastName: nickname,
                nickname,
                membershipStatus: "EN_ATTENTE",
                publicResults: true,
              },
            },
          },
          include: { member: true },
        });
        byNickname.set(nickname.toLowerCase(), user.member!.id);
        console.log(`   - ${nickname} → fiche créée (${email})`);
      }
    }

    // Inscrit tous les participants de la Manche 1, y COMPRIS le vainqueur
    // (GULP, jamais busté — il n'apparaît donc jamais dans busts). Sans
    // cela, syncPositionsFromBusts compte un effectif (n) de 27 au lieu de
    // 28 : chaque place calculée est décalée d'un cran (le 2ᵉ récupère les
    // points du 1er, etc.) ET le vainqueur, absent de registrations comme de
    // busts, n'est jamais identifié comme "le seul jamais busté" — donc
    // jamais classé du tout.
    for (const nickname of uniqueNicknames) {
      const memberId = byNickname.get(nickname.toLowerCase());
      if (!memberId) continue;
      await prisma.roundRegistration.upsert({
        where: { roundId_memberId: { roundId: round1.id, memberId } },
        update: { status: "INSCRIT" },
        create: { roundId: round1.id, memberId, status: "INSCRIT" },
      });
    }

    // Une élimination par bust, dans l'ordre chronologique (place 28 → place 2),
    // avec des horodatages fictifs mais strictement croissants (l'ordre réel
    // n'est pas connu à la minute près, seul l'ORDRE relatif compte pour
    // syncPositionsFromBusts).
    const baseTime = new Date(`${ROUND1_DATE}T21:00:00`).getTime();
    const orderedByElimination = [...ROUND1_ELIMINATIONS].sort((a, b) => b.place - a.place); // place 28 en premier
    let created = 0;
    for (let i = 0; i < orderedByElimination.length; i++) {
      const e = orderedByElimination[i];
      const bustedMemberId = byNickname.get(e.joueur.toLowerCase())!;
      const killerMemberId = byNickname.get(e.sortiPar.toLowerCase()) ?? null;
      const createdAt = new Date(baseTime + i * 5 * 60 * 1000); // +5 min par élimination
      await prisma.roundBust.upsert({
        where: { roundId_bustedMemberId: { roundId: round1.id, bustedMemberId } },
        update: { killerMemberId },
        create: { roundId: round1.id, bustedMemberId, killerMemberId, position: 0, createdAt },
      });
      created++;
    }

    await syncPositionsFromBusts(round1.id);
    await syncKillsFromBusts(round1.id);
    await recalculateRanking(season.id);

    console.log(`✅ Manche 1 : ${created} busts reconstitués (28 participants), classement et kills recalculés.`);
    if (missing.length > 0) {
      console.log(
        `   (${missing.length} fiche(s) placeholder créée(s) pour cette manche — statut EN_ATTENTE, résultats publics comme sur le site historique.)`
      );
    }
  }

  console.log("\n🎉 Script terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
