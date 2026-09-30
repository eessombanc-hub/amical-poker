"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

export type CfepaTeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  photoUrl: string | null;
};

/**
 * Gestion de l'Équipe CFEPA depuis /vie-du-club (section #equipe-cfepa) —
 * réservé RESPONSABLE+ (voir app/api/admin/cfepa-team, hasRole côté
 * serveur ; ce composant n'est de toute façon rendu que pour ces rôles,
 * voir app/vie-du-club/page.tsx). Même principe d'ajout/suppression que
 * GalerieAdminPanel, mais ici on choisit un membre existant dans une liste
 * déroulante plutôt que de saisir un nouveau contenu.
 */
export default function CfepaTeamPanel({
  initialTeam,
  candidateMembers,
}: {
  initialTeam: CfepaTeamMember[];
  /** Membres actifs ne faisant pas encore partie de l'équipe — voir
   *  app/vie-du-club/page.tsx pour le calcul de cette liste. */
  candidateMembers: CfepaTeamMember[];
}) {
  const router = useRouter();
  const [team, setTeam] = useState(initialTeam);
  const [remaining, setRemaining] = useState(candidateMembers);
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/admin/cfepa-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: selectedId }),
    });
    const data = await res.json().catch(() => ({}));
    setAdding(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible d'ajouter ce membre.");
      return;
    }
    setTeam((prev) => [...prev, data].sort((a, b) => a.nickname.localeCompare(b.nickname, "fr")));
    setRemaining((prev) => prev.filter((m) => m.id !== selectedId));
    setSelectedId("");
    router.refresh();
  }

  async function handleRemove(memberId: string) {
    setBusyId(memberId);
    setError(null);
    const res = await fetch(`/api/admin/cfepa-team/${memberId}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setError("Impossible de retirer ce membre.");
      return;
    }
    const removed = team.find((m) => m.id === memberId);
    setTeam((prev) => prev.filter((m) => m.id !== memberId));
    if (removed) {
      setRemaining((prev) => [...prev, removed].sort((a, b) => a.nickname.localeCompare(b.nickname, "fr")));
    }
    router.refresh();
  }

  return (
    <div className="mb-6">
      {error && (
        <div className="mb-4 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2.5 bg-white border border-ink/10 rounded-lg p-4 mb-5">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs uppercase tracking-wide text-sage mb-1">
            Intégrer un membre à l&apos;Équipe CFEPA
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white text-ink"
          >
            <option value="">— Choisir un membre —</option>
            {remaining.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nickname} ({m.firstName} {m.lastName})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!selectedId || adding}
          className="bg-forest text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {adding ? "Ajout…" : "Ajouter"}
        </button>
      </form>

      {team.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {team.map((m) => (
            <div
              key={m.id}
              className="relative group bg-white text-ink border border-white/10 rounded-lg p-4 flex flex-col items-center text-center gap-2"
            >
              <Avatar photoUrl={m.photoUrl} name={`${m.firstName} ${m.lastName}`} size={56} />
              <div className="font-serif font-semibold text-sm truncate w-full">{m.nickname}</div>
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                disabled={busyId === m.id}
                className="absolute top-1.5 right-1.5 bg-noir/70 text-white text-[0.6rem] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
              >
                {busyId === m.id ? "…" : "Retirer"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
