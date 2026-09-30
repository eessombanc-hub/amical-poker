"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Titre d'un album affiché sur /galerie, avec correction inline du titre
 * pour les responsables/bureau/admin (voir app/api/admin/albums/[id],
 * PATCH, réservé RESPONSABLE+) — même principe que la modification du
 * titre/légende d'une publication dans MediaLightbox. Un simple
 * router.refresh() resynchronise la page (server component) après
 * l'enregistrement, plutôt que de dupliquer l'état ici.
 */
export default function GalleryAlbumTitle({
  albumId,
  title,
  isModerator,
  videoIcon,
}: {
  albumId: string;
  title: string;
  isModerator: boolean;
  videoIcon?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Impossible d'enregistrer ce titre.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={120}
          className="text-sm border border-white/20 bg-white/10 text-white rounded px-2.5 py-1.5 min-w-[220px]"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-xs bg-forest text-white px-3 py-1.5 rounded font-medium disabled:opacity-50"
        >
          {saving ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setDraft(title);
            setError(null);
          }}
          className="text-xs text-white/70 underline underline-offset-2"
        >
          Annuler
        </button>
        {error && <span className="text-xs text-red-300 w-full">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <h2 className="text-lg md:text-xl font-serif font-semibold text-white">
        {videoIcon && "🎬 "}
        {title}
      </h2>
      {isModerator && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-brass underline underline-offset-2 flex-shrink-0"
        >
          Modifier le titre
        </button>
      )}
    </div>
  );
}
