"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";

export type CfepaRegisteredPlayer = {
  id: string;
  nickname: string;
  photoUrl: string | null;
};

type RoleValue = "CAPITAINE" | "MATIN" | "APRES_MIDI";

type RoleAssignment = { id: string; memberId: string; role: RoleValue };

const ROLE_LABEL: Record<RoleValue, string> = {
  CAPITAINE: "Capitaine",
  MATIN: "Joueur — matin",
  APRES_MIDI: "Joueur — après-midi",
};

// Ordre d'affichage : capitaine d'abord, puis les deux sessions de la
// journée (voir CfepaRole dans prisma/schema.prisma).
const ROLE_ORDER: RoleValue[] = ["CAPITAINE", "MATIN", "APRES_MIDI"];

/**
 * Tableau d'affectation capitaine/matin/après-midi de l'Équipe CFEPA pour
 * UNE manche (voir prisma/schema.prisma, CfepaRoundRole, et
 * app/calendrier/manche/[id]/page.tsx où ce composant est affiché — réservé
 * aux manches de format CFEPA). Le vivier proposé (`registeredPlayers`)
 * n'est volontairement PAS l'Équipe CFEPA entière, mais uniquement les
 * membres INSCRITS à cette manche précise (voir la page appelante, qui
 * dérive cette liste des inscriptions) : un membre non inscrit à cette
 * manche ne peut pas y recevoir de rôle, même s'il fait partie de l'équipe.
 * Réservé RESPONSABLE+ pour l'édition (voir app/api/admin/cfepa-round-roles)
 * ; ce composant n'est de toute façon rendu en mode édition que pour ces
 * rôles, voir la page appelante.
 */
export default function CfepaRoundRolesPanel({
  roundId,
  registeredPlayers,
  initialAssignments,
  isModerator,
}: {
  roundId: string;
  registeredPlayers: CfepaRegisteredPlayer[];
  initialAssignments: RoleAssignment[];
  isModerator: boolean;
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Record<string, RoleAssignment>>(
    Object.fromEntries(initialAssignments.map((a) => [a.memberId, a]))
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(memberId: string, value: "" | RoleValue) {
    setBusyId(memberId);
    setError(null);
    const current = assignments[memberId];

    if (value === "") {
      if (!current) {
        setBusyId(null);
        return;
      }
      const res = await fetch(`/api/admin/cfepa-round-roles/${current.id}`, { method: "DELETE" });
      setBusyId(null);
      if (!res.ok) {
        setError("Impossible de retirer ce rôle.");
        return;
      }
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      router.refresh();
      return;
    }

    const res = await fetch("/api/admin/cfepa-round-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, memberId, role: value }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible d'attribuer ce rôle.");
      return;
    }
    setAssignments((prev) => ({ ...prev, [memberId]: { id: data.id, memberId, role: value } }));
    router.refresh();
  }

  if (!isModerator) {
    const assigned = registeredPlayers
      .filter((p) => assignments[p.id])
      .sort((a, b) => ROLE_ORDER.indexOf(assignments[a.id].role) - ROLE_ORDER.indexOf(assignments[b.id].role));
    if (assigned.length === 0) return null;
    return (
      <div className="overflow-x-auto bg-white text-ink border border-ink/10 rounded-lg mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-dim text-left">
              <th className="px-4 py-2.5 font-medium">Joueur</th>
              <th className="px-4 py-2.5 font-medium">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {assigned.map((p) => (
              <tr key={p.id} className="border-t border-ink/10">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar photoUrl={p.photoUrl} name={p.nickname} size={28} />
                    <span className="font-medium">{p.nickname}</span>
                  </div>
                </td>
                <td className="px-4 py-2">{ROLE_LABEL[assignments[p.id].role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (registeredPlayers.length === 0) {
    return (
      <p className="text-sage text-sm mb-8">
        Aucun membre de l&apos;Équipe CFEPA n&apos;est encore inscrit à cette
        manche — la liste se remplira au fur et à mesure des inscriptions.
      </p>
    );
  }

  const sorted = [...registeredPlayers].sort((a, b) => a.nickname.localeCompare(b.nickname, "fr"));

  return (
    <div className="mb-8">
      {error && (
        <div className="mb-4 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      <div className="overflow-x-auto bg-white text-ink border border-ink/10 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-dim text-left">
              <th className="px-4 py-2.5 font-medium">Joueur inscrit</th>
              <th className="px-4 py-2.5 font-medium">Rôle pour cette manche</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const current = assignments[p.id]?.role ?? "";
              return (
                <tr key={p.id} className="border-t border-ink/10">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar photoUrl={p.photoUrl} name={p.nickname} size={28} />
                      <span className="font-medium">{p.nickname}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={current}
                      disabled={busyId === p.id}
                      onChange={(e) => handleChange(p.id, e.target.value as "" | RoleValue)}
                      className="border border-ink/15 rounded px-2.5 py-1.5 text-xs bg-white text-ink disabled:opacity-60"
                    >
                      <option value="">— Non retenu(e) —</option>
                      <option value="CAPITAINE">{ROLE_LABEL.CAPITAINE}</option>
                      <option value="MATIN">{ROLE_LABEL.MATIN}</option>
                      <option value="APRES_MIDI">{ROLE_LABEL.APRES_MIDI}</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
