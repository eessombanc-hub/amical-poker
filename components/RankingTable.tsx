"use client";

import { useMemo, useState } from "react";
import RankChangeArrow from "./RankChangeArrow";
import MemberPopover from "./MemberPopover";

export type RankingTableRow = {
  id: string;
  memberId: string;
  rank: number;
  evolution: number | undefined;
  displayName: string;
  isPublic: boolean;
  totalPoints: number;
  participations: number;
  wins: number;
  podiums: number;
  totalKills: number;
  // Cumul saison des points bonus "chasseur de champion" (sortir le
  // vainqueur de la manche MTT/Deepstack précédente) — voir lib/ranking.ts.
  // Déjà inclus dans totalPoints, affiché ici à titre indicatif.
  totalBonusPoints: number;
};

type SortKey = "rank" | "name" | "points" | "bonus" | "participations" | "wins" | "podiums" | "kills";
type SortDir = "asc" | "desc";

const SORT_VALUE: Record<SortKey, (r: RankingTableRow) => string | number> = {
  rank: (r) => r.rank,
  name: (r) => r.displayName.toLocaleLowerCase("fr-FR"),
  points: (r) => r.totalPoints,
  bonus: (r) => r.totalBonusPoints,
  participations: (r) => r.participations,
  wins: (r) => r.wins,
  podiums: (r) => r.podiums,
  kills: (r) => r.totalKills,
};

// Direction la plus utile par défaut au premier clic sur une colonne : par
// ordre alphabétique pour le nom, du meilleur au moins bon pour les chiffres.
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  rank: "asc",
  name: "asc",
  points: "desc",
  bonus: "desc",
  participations: "desc",
  wins: "desc",
  podiums: "desc",
  kills: "desc",
};

/**
 * Tableau de classement de la saison (voir /classement) — trié par défaut
 * par place officielle (points), avec en-têtes cliquables pour trier par
 * ordre alphabétique, points, participations, victoires, podiums ou kills.
 * La colonne "#" affiche toujours la place officielle du joueur (par
 * points), quel que soit le tri d'affichage choisi.
 */
export default function RankingTable({
  rows,
  lastRoundWinnerId,
}: {
  rows: RankingTableRow[];
  /** Vainqueur (Result.position === 1) de la dernière manche jouée, toutes
   *  saisons confondues — voir app/classement/page.tsx. Son nom est mis en
   *  couleur or dans le tableau, en plus de son affichage normal. */
  lastRoundWinnerId?: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
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
    const sorted = [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb as string, "fr") : (va as number) - (vb as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  function Th({
    label,
    sortKey: key,
    align = "left",
    className = "",
    title,
  }: {
    label: string;
    sortKey: SortKey;
    align?: "left" | "right" | "center";
    className?: string;
    title?: string;
  }) {
    const active = sortKey === key;
    return (
      <th
        className={`px-2 sm:px-4 py-2.5 sm:py-3 ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
        title={title}
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
            <Th label="#" sortKey="rank" />
            <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center" title="Évolution depuis la dernière manche">
              Évol.
            </th>
            <Th label="Joueur" sortKey="name" />
            <Th label="Points" sortKey="points" align="right" />
            <Th
              label="Bonus"
              sortKey="bonus"
              align="right"
              title="Points bonus gagnés en sortant le vainqueur de la manche MTT ou Deepstack précédente (déjà inclus dans Points)"
            />
            <Th label="Participations" sortKey="participations" align="right" className="hidden md:table-cell" />
            <Th label="Victoires" sortKey="wins" align="right" className="hidden md:table-cell" />
            <Th label="Podiums" sortKey="podiums" align="right" className="hidden md:table-cell" />
            <Th label="Kills" sortKey="kills" align="right" title="Nombre de kills sur la saison" />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => (
            <tr key={r.id} className="border-t border-ink/10">
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 font-mono-club">{r.rank}</td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center">
                <RankChangeArrow delta={r.evolution} />
              </td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 font-medium">
                {r.isPublic ? (
                  r.memberId === lastRoundWinnerId ? (
                    <span title="Vainqueur de la dernière manche">
                      <MemberPopover
                        memberId={r.memberId}
                        nickname={r.displayName}
                        className="text-brass font-semibold underline decoration-dotted decoration-brass underline-offset-2 hover:text-brass-light transition-colors"
                      />
                      {" 🏆"}
                    </span>
                  ) : (
                    <MemberPopover memberId={r.memberId} nickname={r.displayName} />
                  )
                ) : (
                  <span className="text-sage italic">Privé</span>
                )}
              </td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right font-mono-club">{r.totalPoints}</td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right font-mono-club">
                {r.totalBonusPoints > 0 ? (
                  <span className="text-brass font-semibold">+{r.totalBonusPoints}</span>
                ) : (
                  <span className="text-ink/25">—</span>
                )}
              </td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">{r.participations}</td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">{r.wins}</td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">{r.podiums}</td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right font-mono-club">{r.totalKills}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
