"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Bouton de suppression (sujet ou réponse) pour la modération du forum —
 * confirmation en deux temps, comme le reste de l'admin du site.
 */
export default function DeleteForumButton({
  endpoint,
  label = "Supprimer",
  redirectTo,
}: {
  endpoint: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      setConfirming(false);
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-red-600 underline underline-offset-2 flex-shrink-0"
      >
        {label}
      </button>
    );
  }

  return (
    <span className="text-xs flex-shrink-0 whitespace-nowrap">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="text-red-600 font-semibold underline underline-offset-2 mr-2 disabled:opacity-50"
      >
        {loading ? "…" : "Confirmer"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-sage underline underline-offset-2">
        Annuler
      </button>
    </span>
  );
}
