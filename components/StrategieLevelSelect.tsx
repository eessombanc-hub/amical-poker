"use client";

import { useRouter } from "next/navigation";
import { STRATEGIE_LEVELS, LEVEL_LABEL, type StrategieLevelValue } from "@/lib/strategieLevels";

// Filtre par niveau sur /strategie (voir app/strategie/page.tsx), piloté par
// le paramètre d'URL ?niveau=... : le filtrage se fait côté serveur, ce menu
// ne fait que naviguer vers la bonne URL, comme
// components/ClassementMancheSelect.tsx pour le classement d'une manche.
export default function StrategieLevelSelect({
  value,
  levels = STRATEGIE_LEVELS,
}: {
  value: StrategieLevelValue | "";
  /** Niveaux proposés dans le menu — par défaut tous. Utilisé pour ne
   * proposer que le niveau Débutant aux visiteurs non connectés (voir
   * app/strategie/page.tsx). */
  levels?: readonly StrategieLevelValue[];
}) {
  const router = useRouter();

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2.5">
      <label htmlFor="strategie-niveau-select" className="text-xs uppercase tracking-wide text-sage">
        Niveau
      </label>
      <select
        id="strategie-niveau-select"
        value={value}
        onChange={(e) => {
          const niveau = e.target.value;
          router.push(niveau ? `/strategie?niveau=${niveau}` : "/strategie");
        }}
        className="border border-ink/15 rounded px-3 py-2 text-sm bg-white text-ink"
      >
        <option value="">Tous les niveaux</option>
        {levels.map((level) => (
          <option key={level} value={level}>
            {LEVEL_LABEL[level]}
          </option>
        ))}
      </select>
    </div>
  );
}
