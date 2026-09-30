"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Bandeau "Vous êtes inscrit / en liste d'attente à cette manche" + bouton
 * d'annulation, pour le membre connecté, affiché sur la page des joueurs
 * inscrits d'une manche (app/calendrier/manche/[id]) quand il y figure.
 * Appelle DELETE /api/rounds/[id]/register, qui libère la place (et promeut
 * le premier de la liste d'attente le cas échéant).
 *
 * Le texte "désinscrit" après annulation est géré ici en state local,
 * affiché dès la confirmation du serveur — plutôt que de compter sur le
 * rafraîchissement de la page (router.refresh peut être retardé par le
 * cache de routes de Next.js), pour ne jamais laisser affiché "inscrit"
 * après une désinscription réussie.
 */
export default function CancelRegistrationButton({
  roundId,
  status,
}: {
  roundId: string;
  status: "INSCRIT" | "LISTE_ATTENTE";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rounds/${roundId}/register`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "L'annulation a échoué.");
      }
      setCancelled(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'annulation a échoué.");
      setLoading(false);
    }
  }

  if (cancelled) {
    return (
      <div className="mb-6 border border-ink/10 bg-paper-dim rounded-lg px-4 py-3">
        <span className="text-sm text-sage">Vous êtes désinscrit de cette manche.</span>
      </div>
    );
  }

  return (
    <div className="mb-6 border border-forest/20 bg-paper-dim rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm">
        Vous êtes {status === "LISTE_ATTENTE" ? "en liste d'attente" : "inscrit"} à cette manche.
      </span>
      <div>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-xs border border-crimson/30 text-crimson rounded px-3.5 py-2 font-medium hover:bg-crimson/5 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "…" : "Annuler mon inscription"}
        </button>
        {error && <p className="text-xs text-crimson mt-1.5">{error}</p>}
      </div>
    </div>
  );
}
