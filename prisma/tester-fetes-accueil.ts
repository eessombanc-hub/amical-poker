/**
 * Script de test (lecture seule, aucune base de données requise) pour la
 * page d'accueil événementielle (voir lib/fetes/*.ts et app/page.tsx).
 *
 * Vérifie, pour une série de dates représentatives (voir cahier des
 * charges) : la fête résolue par resolveFeteForDate, le calcul de Pâques,
 * la règle d'exception de la Fête des Mères (report si elle tombe le jour
 * de la Pentecôte), la gestion du fuseau horaire français, et que chaque
 * fête possède bien un thème complet (lib/fetes/themes.ts).
 *
 * Usage : npx tsx prisma/tester-fetes-accueil.ts
 * (termine avec le code de sortie 1 si un test échoue, 0 sinon)
 */
import { resolveFeteForDate, getParisDateParts, msUntilNextParisMidnight } from "../lib/fetes/calendar";
import { getFeteTheme } from "../lib/fetes/themes";
import { getEasterDate } from "../lib/fetes/easter";

function parisNoon(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 11, 0, 0));
}

type Case = { label: string; date: Date; expectKey: string };

const cases: Case[] = [
  { label: "Journée ordinaire (10 mars)", date: parisNoon(2026, 3, 10), expectKey: "HIVER" },
  { label: "1er janvier", date: parisNoon(2026, 1, 1), expectKey: "NOUVEL_AN" },
  { label: "14 février", date: parisNoon(2026, 2, 14), expectKey: "SAINT_VALENTIN" },
  { label: "14 juillet", date: parisNoon(2026, 7, 14), expectKey: "FETE_NATIONALE" },
  { label: "31 octobre (Halloween, dans l'automne)", date: parisNoon(2026, 10, 31), expectKey: "HALLOWEEN" },
  { label: "25 décembre", date: parisNoon(2026, 12, 25), expectKey: "NOEL" },
  { label: "Pâques 2026 (5 avril)", date: getEasterDate(2026), expectKey: "PAQUES" },
  { label: "31 décembre (Réveillon, multi : Nouvel An + hiver)", date: parisNoon(2026, 12, 31), expectKey: "NOUVEL_AN" },
  { label: "1er novembre (Toussaint)", date: parisNoon(2026, 11, 1), expectKey: "TOUSSAINT" },
  { label: "21 juin 2026 (Fête des Pères)", date: parisNoon(2026, 6, 21), expectKey: "FETE_DES_PERES" },
  { label: "31 mai 2026 (Fête des Mères)", date: parisNoon(2026, 5, 31), expectKey: "FETE_DES_MERES" },
  { label: "4 juin 2023 (Fête des Mères REPORTÉE, clash Pentecôte 28/05)", date: parisNoon(2023, 6, 4), expectKey: "FETE_DES_MERES" },
  { label: "28 mai 2023 (PAS Fête des Mères : Pentecôte ce jour-là)", date: parisNoon(2023, 5, 28), expectKey: "PRINTEMPS" },
  { label: "1er mai (printemps)", date: parisNoon(2026, 5, 1), expectKey: "PRINTEMPS" },
  { label: "15 août (été)", date: parisNoon(2026, 8, 15), expectKey: "ETE" },
  { label: "15 novembre (automne)", date: parisNoon(2026, 11, 15), expectKey: "AUTOMNE" },
];

console.log("=== Test de résolution des fêtes (lib/fetes/calendar.ts) ===\n");
let failures = 0;
for (const c of cases) {
  const resolved = resolveFeteForDate(c.date);
  const ok = resolved.key === c.expectKey;
  if (!ok) failures++;
  console.log(
    `${ok ? "✅" : "❌"} ${c.label.padEnd(60)} -> ${resolved.key} (attendu ${c.expectKey})${
      resolved.prenom ? `  [prénom: ${resolved.prenom}]` : ""
    }`
  );
}

console.log("\n=== Thèmes : chaque clé a bien un thème complet ===");
const ALL_KEYS = [
  "NOUVEL_AN", "SAINT_VALENTIN", "PAQUES", "FETE_DES_MERES", "FETE_DES_PERES",
  "FETE_NATIONALE", "HALLOWEEN", "TOUSSAINT", "NOEL", "PRINTEMPS", "ETE", "AUTOMNE", "HIVER",
] as const;
for (const key of ALL_KEYS) {
  const theme = getFeteTheme({ key: key as any, monthDayKey: "00-00", prenom: null });
  const hasAll = !!(theme.label && theme.heroMessage && theme.backgroundGradient && theme.particles);
  if (!hasAll) failures++;
  console.log(`${hasAll ? "✅" : "❌"} ${key.padEnd(18)} -> "${theme.label}" (${theme.particles.kind}, densité ${theme.particles.density})`);
}

console.log("\n=== Fuseau horaire : pas de crash autour du changement d'heure ===");
const dstCheck = getParisDateParts(new Date(Date.UTC(2026, 2, 29, 1, 30, 0)));
console.log(`29/03/2026 01:30 UTC -> Paris ${dstCheck.year}-${dstCheck.month}-${dstCheck.day}`);

console.log("\n=== msUntilNextParisMidnight : sanité (0h < x <= 24h) ===");
const ms = msUntilNextParisMidnight(new Date());
const hours = ms / 1000 / 60 / 60;
const sane = hours > 0 && hours <= 24;
if (!sane) failures++;
console.log(`${sane ? "✅" : "❌"} ${ms} ms (${hours.toFixed(2)} h)`);

console.log(`\n${failures === 0 ? "✅ TOUS LES TESTS PASSENT" : `❌ ${failures} ÉCHEC(S)`}`);
process.exit(failures === 0 ? 0 : 1);
