"use client";

import { useMemo, useState } from "react";
import MemberPopover from "./MemberPopover";

export type RoundResultRow = {
  id: string;
  memberId: string;
  position: number;
  displayName: string;
  isPublic: boolean;
  points: number;
  // Part de `points` due au bonus "chasseur de champion" sur cette manche
  // (sortir le vainqueur de la précédente MTT/Deepstack) — voir
  // lib/ranking.ts. Déjà inclus dans `points`, affiché ici à titre indicatif.
  bonusPoints: number;
  kills: number;
  // Pseudo de qui a éliminé ce joueur à cette manche (voir RoundBust) —
  // "Blindes" si éliminé sans killer identifié, null pour le vainqueur
  // (jamais busté, donc pas de ligne de bust).
  killerName: string | null;
};

type SortKey = "position" | "name" | "points" | "bonus" | "kills" | "killer";
type SortDir = "asc" | "desc";

const SORT_VALUE: Record<SortKey, (r: RoundResultRow) => string | number> = {
  position: (r) => r.position,
  name: (r) => r.displayName.toLocaleLowerCase("fr-FR"),
  points: (r) => r.points,
  bonus: (r) => r.bonusPoints,
  kills: (r) => r.kills,
  killer: (r) => (r.killerName ?? "").toLocaleLowerCase("fr-FR"),
};

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  position: "asc",
  name: "asc",
  points: "desc",
  bonus: "desc",
  kills: "desc",
  killer: "asc",
};

/**
 * Tableau de résultats d'une manche (voir /classement/manche/[id]) — trié
 * par défaut par place d'arrivée, avec en-têtes cliquables pour trier par
 * ordre alphabétique, points ou kills. La colonne "Place" affiche toujours
 * la place réelle du joueur à cette manche, quel que soit le tri choisi.
 */
export default function RoundResultsTable({ rows }: { rows: RoundResultRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_DIR[key]);
    }
  }

  const sortedRows = useMemo(() => {
    const getValue = SORT_VALUE[sortKey];
    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb as string, "fr") : (va as number) - (vb as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  function Th({
    label,
    sortKey: key,
    align = "left",
  }: {
    label: string;
    sortKey: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === key;
    return (
      <th
        className={`px-4 py-2.5 ${align === "right" ? "text-right" : "text-left"}`}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => handleSort(key)}
          className={`inline-flex items-center gap-1 select-none hover:text-ink transition-colors ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-ink" : ""}`}
        >
          {label}
          <span className={`text-[0.6rem] ${active ? "opacity-100" : "opacity-30"}`}>
            {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <div className="border border-ink/10 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-paper-dim text-left text-xs uppercase tracking-wide text-sage">
            <Th label="Place" sortKey="position" />
            <Th label="Joueur" sortKey="name" />
            <Th label="Points" sortKey="points" align="right" />
            <Th label="Bonus" sortKey="bonus" align="right" />
            <Th label="Kills" sortKey="kills" align="right" />
            <Th label="Killé par" sortKey="killer" />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => (
            <tr key={r.id} className="border-t border-ink/10">
              <td className="px-4 py-2 font-mono-club">{r.position}</td>
              <td className="px-4 py-2 font-medium">
                {r.isPublic ? (
                  <MemberPopover memberId={r.memberId} nickname={r.displayName} />
                ) : (
                  <span className="text-sage italic">Privé</span>
                )}
              </td>
              <td className="px-4 py-2 text-right font-mono-club">{r.points}</td>
              <td className="px-4 py-2 text-right font-mono-club">
                {r.bonusPoints > 0 ? (
                  <span className="text-brass font-semibold">+{r.bonusPoints}</span>
                ) : (
                  <span className="text-ink/25">—</span>
                )}
              </td>
              <td className="px-4 py-2 text-right font-mono-club">{r.kills}</td>
              <td className="px-4 py-2 text-sage">
                {r.killerName ?? <span className="text-ink/25">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
