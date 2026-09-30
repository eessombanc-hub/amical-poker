"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DURATIONS = [
  { label: "24 heures", days: 1 },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
];

/**
 * Contrôle de suspension du forum commun pour un auteur donné.
 * - canMute : peut lancer une suspension (réservé au rôle BUREAU).
 * - canUnmute : peut lever une suspension en cours (BUREAU, ou ADMIN en filet
 *   de sécurité).
 * Voir /api/forum/mute/[userId].
 */
export default function MuteButton({
  userId,
  authorLabel,
  isMuted,
  canMute,
  canUnmute,
}: {
  userId: string;
  authorLabel: string;
  isMuted: boolean;
  canMute: boolean;
  canUnmute: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callApi(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/forum/mute/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Action impossible.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (isMuted) {
    if (!canUnmute) {
      return <span className="text-xs text-burgundy font-medium">Suspendu</span>;
    }
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-burgundy font-medium">Suspendu</span>
        <button
          type="button"
          disabled={loading}
          onClick={() => callApi({ action: "unmute" })}
          className="text-xs text-forest underline underline-offset-2 disabled:opacity-50"
        >
          Lever la suspension
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  if (!canMute) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-burgundy underline underline-offset-2"
      >
        Suspendre
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 bg-burgundy/5 border border-burgundy/20 rounded px-2.5 py-1.5">
      <span className="text-xs text-ink/70">Suspendre {authorLabel} :</span>
      {DURATIONS.map((d) => (
        <button
          key={d.days}
          type="button"
          disabled={loading}
          onClick={() => callApi({ action: "mute", durationDays: d.days })}
          className="text-xs bg-white border border-ink/15 rounded px-2 py-1 disabled:opacity-50"
        >
          {d.label}
        </button>
      ))}
      <button
        type="button"
        disabled={loading}
        onClick={() => callApi({ action: "mute", permanent: true })}
        className="text-xs bg-burgundy text-white rounded px-2 py-1 disabled:opacity-50"
      >
        Définitive
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-sage underline underline-offset-2">
        Annuler
      </button>
      {error && <span className="text-xs text-red-600 w-full">{error}</span>}
    </span>
  );
}
