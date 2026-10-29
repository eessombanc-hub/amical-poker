/**
 * Calcul de la date de Pâques (algorithme de Meeus/Jones/Butcher, calendrier
 * grégorien) — fête chrétienne à date variable, dont dépendent aussi le
 * Lundi de Pâques (+1 jour) et, indirectement, la Pentecôte (+49 jours),
 * utilisée par lib/fetes/calendar.ts pour la règle d'exception de la Fête
 * des Mères (voir ce fichier).
 *
 * Retourne une Date à minuit UTC pour le jour calculé (jour/mois/année
 * civils) — comparée ailleurs uniquement par jour/mois/année, jamais par
 * heure, donc le choix UTC ici est sans incidence sur le fuseau horaire
 * français (voir getParisDateParts dans lib/fetes/calendar.ts pour la
 * gestion du fuseau horaire proprement dite).
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = mars, 4 = avril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Ajoute `days` jours à une date (nouvelle Date, n'altère pas l'original). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
