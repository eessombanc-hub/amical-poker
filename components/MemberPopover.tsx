"use client";

import { useEffect, useState } from "react";

type Summary = {
  nickname: string;
  publicResults: boolean;
  ranking: { totalPoints: number; totalKills: number; position: number } | null;
  legacyRankingPlace: number | null;
};

function ordinal(n: number): string {
  return n === 1 ? "ère" : "e";
}

/**
 * Rend le pseudo d'un membre comme un bouton cliquable : au clic, un popup
 * affiche son classement (position + points) et son nombre de kills sur la
 * saison en cours, récupérés à la demande via /api/members/:id/ranking-summary.
 * N'affiche rien si le membre n'a pas autorisé la publication de ses
 * résultats (RGPD) — même règle que /classement.
 */
export default function MemberPopover({
  memberId,
  nickname,
  className,
}: {
  memberId: string;
  nickname: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleOpen() {
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/members/${memberId}/ranking-summary`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("Impossible de charger les informations de ce membre.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className ?? "underline decoration-dotted decoration-sage underline-offset-2 hover:text-forest transition-colors"}
      >
        {nickname}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-noir/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="font-serif font-semibold text-lg leading-snug">{nickname}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="text-sage hover:text-ink text-sm flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {loading && <p className="text-sage text-sm">Chargement…</p>}
            {error && <p className="text-crimson text-sm">{error}</p>}

            {data && !loading && !error && (
              <>
                {data.ranking ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-sage">Classement</span>
                      <span className="font-mono-club font-semibold">
                        {data.ranking.position}{ordinal(data.ranking.position)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-sage">Points</span>
                      <span className="font-mono-club font-semibold">{data.ranking.totalPoints}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-sage">Kills</span>
                      <span className="font-mono-club font-semibold">{data.ranking.totalKills}</span>
                    </div>
                  </div>
                ) : data.legacyRankingPlace ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-sage">Classement (ancien site)</span>
                    <span className="font-mono-club font-semibold">
                      {data.legacyRankingPlace}{ordinal(data.legacyRankingPlace)}
                    </span>
                  </div>
                ) : !data.publicResults ? (
                  <p className="text-sage text-sm">Ce membre n&apos;a pas publié ses résultats.</p>
                ) : (
                  <p className="text-sage text-sm">Pas encore classé cette saison.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
