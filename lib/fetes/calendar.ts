/**
 * Calendrier des fêtes de la page d'accueil — données et RÈGLES DE SÉLECTION
 * uniquement (voir lib/fetes/themes.ts pour les styles graphiques, messages
 * et animations associés à chaque fête, et components/home/FeteParticles.tsx
 * pour le moteur d'animation). Module pur, sans dépendance React/Next, donc
 * testable isolément (voir prisma/tester-fetes-accueil.ts).
 */
import { getEasterDate, addDays } from "./easter";
import { getPrenomDuJour } from "./prenoms";

export type FeteKey =
  | "NOUVEL_AN"
  | "SAINT_VALENTIN"
  | "PAQUES"
  | "FETE_DES_MERES"
  | "FETE_DES_PERES"
  | "FETE_NATIONALE"
  | "HALLOWEEN"
  | "TOUSSAINT"
  | "NOEL"
  | "PRINTEMPS"
  | "ETE"
  | "AUTOMNE"
  | "HIVER";

export type ResolvedFete = {
  key: FeteKey;
  /** "MM-JJ", utile pour l'affichage et les tests. */
  monthDayKey: string;
  /** Fête du prénom du jour, si présente dans le calendrier partiel (voir
   * lib/fetes/prenoms.ts) — toujours affichée en complément, jamais à la
   * place de la fête principale ci-dessus. */
  prenom: string | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Date/heure actuelle en France (Europe/Paris), gérant correctement les
 * changements d'heure été/hiver (s'appuie sur l'implémentation IANA du
 * fuseau horaire fournie par l'environnement JS, via Intl) — sans cette
 * précaution, un serveur hébergé en UTC (ex. Vercel) afficherait la mauvaise
 * fête pendant une partie de la nuit autour de minuit heure de Paris.
 */
export function getParisDateParts(date: Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { year: Number(lookup.year), month: Number(lookup.month), day: Number(lookup.day) };
}

function monthDayKeyOf(month: number, day: number): string {
  return `${pad2(month)}-${pad2(day)}`;
}

/** Dimanche de Pâques, Lundi de Pâques et dimanche de Pentecôte (n'est
 * jamais affichée elle-même — sert uniquement à la règle d'exception de la
 * Fête des Mères ci-dessous) pour une année donnée. */
function easterRelatedDates(year: number) {
  const easterSunday = getEasterDate(year);
  const easterMonday = addDays(easterSunday, 1);
  const pentecostSunday = addDays(easterSunday, 49);
  return { easterSunday, easterMonday, pentecostSunday };
}

/** Dernier dimanche de mai d'une année donnée. */
function lastSundayOfMay(year: number): Date {
  // 31 mai, puis on recule jusqu'au dimanche (UTC: getUTCDay() 0 = dimanche).
  const may31 = new Date(Date.UTC(year, 4, 31));
  const offset = may31.getUTCDay();
  return addDays(may31, -offset);
}

/** Premier dimanche de juin d'une année donnée (repli de la Fête des Mères
 * quand le dernier dimanche de mai tombe le jour de la Pentecôte). */
function firstSundayOfJune(year: number): Date {
  const june1 = new Date(Date.UTC(year, 5, 1));
  const offset = june1.getUTCDay();
  return offset === 0 ? june1 : addDays(june1, 7 - offset);
}

/** Troisième dimanche de juin d'une année donnée (Fête des Pères). */
function thirdSundayOfJune(year: number): Date {
  const june1 = new Date(Date.UTC(year, 5, 1));
  const offsetToFirstSunday = june1.getUTCDay() === 0 ? 0 : 7 - june1.getUTCDay();
  const firstSunday = addDays(june1, offsetToFirstSunday);
  return addDays(firstSunday, 14);
}

function sameMonthDay(a: Date, year: number, month: number, day: number): boolean {
  return a.getUTCFullYear() === year && a.getUTCMonth() === month - 1 && a.getUTCDate() === day;
}

/**
 * Détermine la fête du jour, en France, pour la date donnée (par défaut
 * aujourd'hui). Priorité : une fête nommée (Noël, Pâques, Halloween...)
 * l'emporte toujours sur la simple ambiance saisonnière — voir le mode de
 * prévisualisation (components/home/FetePreviewBar.tsx) pour tester une
 * date donnée sans changer l'horloge du système, et
 * prisma/tester-fetes-accueil.ts pour les dates de test couvrant ce cas
 * (ex. 31 octobre = Halloween ET automne à la fois : Halloween l'emporte).
 */
export function resolveFeteForDate(date: Date = new Date()): ResolvedFete {
  const { year, month, day } = getParisDateParts(date);
  const monthDayKey = monthDayKeyOf(month, day);
  const prenom = getPrenomDuJour(monthDayKey);

  // ── Fêtes à date fixe ────────────────────────────────────────────
  if ((month === 1 && day === 1) || (month === 12 && day === 31)) {
    return { key: "NOUVEL_AN", monthDayKey, prenom };
  }
  if (month === 2 && day === 14) return { key: "SAINT_VALENTIN", monthDayKey, prenom };
  if (month === 7 && day === 14) return { key: "FETE_NATIONALE", monthDayKey, prenom };
  if (month === 10 && day === 31) return { key: "HALLOWEEN", monthDayKey, prenom };
  if (month === 11 && day === 1) return { key: "TOUSSAINT", monthDayKey, prenom };
  if (month === 12 && (day === 24 || day === 25 || day === 26)) return { key: "NOEL", monthDayKey, prenom };

  // ── Fêtes à date variable ────────────────────────────────────────
  const { easterSunday, easterMonday } = easterRelatedDates(year);
  if (sameMonthDay(easterSunday, year, month, day) || sameMonthDay(easterMonday, year, month, day)) {
    return { key: "PAQUES", monthDayKey, prenom };
  }

  const { pentecostSunday } = easterRelatedDates(year);
  const mothersDay = (() => {
    const candidate = lastSundayOfMay(year);
    const clashesWithPentecost =
      candidate.getUTCFullYear() === pentecostSunday.getUTCFullYear() &&
      candidate.getUTCMonth() === pentecostSunday.getUTCMonth() &&
      candidate.getUTCDate() === pentecostSunday.getUTCDate();
    return clashesWithPentecost ? firstSundayOfJune(year) : candidate;
  })();
  if (sameMonthDay(mothersDay, year, month, day)) {
    return { key: "FETE_DES_MERES", monthDayKey, prenom };
  }

  const fathersDay = thirdSundayOfJune(year);
  if (sameMonthDay(fathersDay, year, month, day)) {
    return { key: "FETE_DES_PERES", monthDayKey, prenom };
  }

  // ── Repli saisonnier (bornes approximatives, volontairement fixes
  //    plutôt qu'astronomiques précises — simplification assumée) ──
  const md = month * 100 + day; // ex: 3 mars → 303, comparable numériquement
  if (md >= 1221 || md <= 319) return { key: "HIVER", monthDayKey, prenom };
  if (md >= 320 && md <= 620) return { key: "PRINTEMPS", monthDayKey, prenom };
  if (md >= 621 && md <= 922) return { key: "ETE", monthDayKey, prenom };
  return { key: "AUTOMNE", monthDayKey, prenom };
}

/** Millisecondes jusqu'au prochain minuit heure de Paris, pour
 * l'actualisation automatique côté client (voir
 * components/home/FeteDayRollover.tsx) — gère nativement les changements
 * d'heure puisque basé sur les mêmes parts Intl que getParisDateParts. */
export function msUntilNextParisMidnight(from: Date = new Date()): number {
  const { year, month, day } = getParisDateParts(from);
  // Minuit du lendemain, exprimé comme instant UTC approximatif puis ajusté :
  // on cherche le premier instant, après `from`, où getParisDateParts change
  // de jour — recherche simple par pas d'une minute est trop coûteuse ; on
  // construit plutôt la date UTC du lendemain à 00:00 Paris en estimant le
  // décalage via le fuseau courant, avec une marge de sécurité de 2 minutes
  // au-delà de minuit pour absorber toute imprécision residuelle.
  const tomorrowUtcGuess = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  // Paris est UTC+1 (hiver) ou UTC+2 (été) : minuit Paris tombe donc à 23h00
  // ou 22h00 UTC la veille. On part d'une estimation à UTC 22:00 la veille du
  // jour calculé puis on avance minute par minute jusqu'à franchir le jour
  // suivant côté Paris (borne large, largement suffisante en pratique).
  let candidate = new Date(tomorrowUtcGuess.getTime() - 2 * 60 * 60 * 1000);
  const currentDay = day;
  for (let i = 0; i < 4 * 60; i++) {
    const parts = getParisDateParts(candidate);
    if (parts.day !== currentDay || parts.month !== month || parts.year !== year) {
      return Math.max(0, candidate.getTime() - from.getTime());
    }
    candidate = new Date(candidate.getTime() + 60 * 1000);
  }
  // Repli very improbable : 24h.
  return 24 * 60 * 60 * 1000;
}
