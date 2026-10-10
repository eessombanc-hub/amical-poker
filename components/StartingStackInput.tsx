"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Champ "Stack" éditable en ligne, affiché à côté de chaque joueur déjà
 * inscrit sur la fiche d'un Day 2 de Deepstack groupé (voir
 * app/calendrier/manche/[id]/page.tsx, isDeepstackDay2) — réservé au
 * bureau, aux responsables et à l'admin (même garde que les autres actions
 * de cette page). Même principe que la date de naissance éditable de
 * components/MembersAdminPanel.tsx : on modifie, on sort du champ, ça
 * enregistre (PATCH /api/admin/round-registrations). Vide = pas encore
 * renseigné (RoundRegistration.startingStack est facultatif).
 */
export default function StartingStackInput({
  roundId,
  memberId,
  initialValue,
}: {
  roundId: string;
  memberId: string;
  initialValue: number | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function save(raw: string) {
    const trimmed = raw.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next === initialValue) return;
    if (next !== null && (!Number.isFinite(next) || next < 0)) return;
    setSaving(true);
    await fetch("/api/admin/round-registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, memberId, startingStack: next }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <input
      type="number"
      min={0}
      step={1}
      defaultValue={initialValue ?? ""}
      disabled={saving}
      onBlur={(e) => save(e.target.value)}
      placeholder="Stack"
      className="border border-ink/15 rounded px-2 py-1 text-xs w-20"
      title="Stack de départ"
    />
  );
}
