"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EligibleMember = { id: string; nickname: string; firstName: string; lastName: string };

/**
 * Panneau d'inscription au Sit&Go (RoundFormat.SITNGO), affiché sur la
 * fiche de la manche (app/calendrier/manche/[id]/page.tsx) UNIQUEMENT pour
 * le bureau, les responsables et l'admin (canEnterResults) — jamais
 * d'auto-inscription pour ce format, voir Round.linkedDeepstackRoundId et
 * lib/ranking.ts, isEligibleForSitngo. La liste `eligibleMembers` est déjà
 * filtrée côté serveur : seuls les membres actifs qui ne participent pas,
 * ou plus, au Deepstack lié, et pas déjà inscrits à ce Sit&Go, y figurent.
 * L'inscription elle-même réutilise l'endpoint générique
 * /api/admin/round-registrations (même logique que l'ajout d'un
 * participant présent depuis /admin/resultats), qui revérifie
 * l'éligibilité côté serveur.
 */
export default function SitngoRegistrationPanel({
  roundId,
  eligibleMembers,
}: {
  roundId: string;
  eligibleMembers: EligibleMember[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!selectedId) return;
    setRegistering(true);
    setError(null);
    const res = await fetch("/api/admin/round-registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, memberId: selectedId }),
    });
    const data = await res.json().catch(() => ({}));
    setRegistering(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "L'inscription a échoué.");
      return;
    }
    setSelectedId("");
    router.refresh();
  }

  return (
    <div className="mb-8 border border-forest/20 bg-forest/5 rounded-lg p-4">
      <h2 className="text-base font-serif font-semibold mb-1">Inscrire un joueur au Sit&amp;Go</h2>
      <p className="text-xs text-sage mb-3">
        Réservé au bureau, aux responsables et à l&apos;admin — seuls les
        membres qui ne participent pas, ou plus, au Deepstack lié sont
        proposés ci-dessous.
      </p>
      {error && (
        <div className="mb-3 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {eligibleMembers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border border-ink/15 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="">Choisir un joueur éligible…</option>
            {eligibleMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nickname} ({m.firstName} {m.lastName})
              </option>
            ))}
          </select>
          <button
            onClick={handleRegister}
            disabled={!selectedId || registering}
            className="text-xs bg-forest text-white rounded px-4 py-2.5 font-medium disabled:opacity-50"
          >
            {registering ? "…" : "Inscrire"}
          </button>
        </div>
      ) : (
        <p className="text-sage text-sm">
          Aucun membre actif éligible pour l&apos;instant (soit déjà inscrit
          ici, soit encore engagé dans le Deepstack lié).
        </p>
      )}
    </div>
  );
}
