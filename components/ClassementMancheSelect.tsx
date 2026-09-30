"use client";

import { useRouter } from "next/navigation";

type RoundOption = { id: string; number: number; date: string; label: string | null };

// Menu déroulant d'accès rapide au classement de chaque manche, affiché en
// haut de la rubrique Classement (voir app/classement/page.tsx) — redirige
// vers /classement/manche/[id] (voir app/classement/manche/[id]/page.tsx).
// Liste TOUTES les manches de la saison, y compris celles déjà terminées,
// puisque ce sont surtout elles qui ont un classement à consulter.
export default function ClassementMancheSelect({ rounds }: { rounds: RoundOption[] }) {
  const router = useRouter();

  if (rounds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Sur fond sombre (voir app/classement/page.tsx) : texte clair pour
          le libellé, couleur de texte du champ forcée en text-ink pour ne
          pas hériter du texte pâle du fond de la page sur ce select blanc. */}
      <label htmlFor="classement-manche-select" className="text-xs uppercase tracking-wide text-white/70">
        Voir le classement d&apos;une manche
      </label>
      <select
        id="classement-manche-select"
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (id) router.push(`/classement/manche/${id}`);
        }}
        className="border border-ink/15 rounded px-3 py-2 text-sm bg-white text-ink"
      >
        <option value="">Choisir une manche…</option>
        {rounds.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label ?? `Manche ${r.number}`},{" "}
            {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </option>
        ))}
      </select>
    </div>
  );
}
