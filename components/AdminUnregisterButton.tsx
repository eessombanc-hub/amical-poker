"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Bouton "Désinscrire", réservé au bureau, aux responsables et à l'admin
 * (voir app/calendrier/manche/[id]) — permet de désinscrire un AUTRE membre
 * d'une manche (ex. joueur qui a prévenu par un autre canal qu'il ne
 * viendrait plus, sans repasser par son propre compte). Appelle DELETE
 * /api/admin/round-registrations, qui applique la même logique que la
 * désinscription volontaire du membre (passage en ANNULE, promotion du
 * premier de la liste d'attente, réouverture des inscriptions si la manche
 * était complète).
 *
 * Confirmation en deux temps, comme le reste de l'admin du site (voir
 * DeleteForumButton).
 */
export default function AdminUnregisterButton({
  roundId,
  memberId,
}: {
  roundId: string;
  memberId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/round-registrations?roundId=${encodeURIComponent(roundId)}&memberId=${encodeURIComponent(memberId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "La désinscription a échoué.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "La désinscription a échoué.");
      setConfirming(false);
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[0.68rem] text-crimson/80 hover:text-crimson underline underline-offset-2 flex-shrink-0"
      >
        Désinscrire
      </button>
    );
  }

  return (
    <span className="text-[0.68rem] flex-shrink-0 whitespace-nowrap">
      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        className="text-crimson font-semibold underline underline-offset-2 mr-2 disabled:opacity-50"
      >
        {loading ? "…" : "Confirmer"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sage underline underline-offset-2"
      >
        Annuler
      </button>
      {error && <p className="text-crimson mt-1">{error}</p>}
    </span>
  );
}
