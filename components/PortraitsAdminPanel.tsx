"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Portrait = {
  id: string;
  displayName: string;
  role: string | null;
  bio: string;
  photoUrl: string | null;
  published: boolean;
};

const EMPTY_FORM = { displayName: "", role: "", bio: "", photoUrl: "" };

export default function PortraitsAdminPanel({ initialPortraits }: { initialPortraits: Portrait[] }) {
  const router = useRouter();
  const [portraits, setPortraits] = useState(initialPortraits);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/portraits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Impossible d'enregistrer ce portrait — vérifiez les champs.");
      return;
    }
    const { portrait } = await res.json();
    setPortraits((prev) => [portrait, ...prev]);
    setForm(EMPTY_FORM);
    router.refresh();
  }

  async function togglePublish(p: Portrait) {
    const res = await fetch(`/api/portraits/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !p.published }),
    });
    if (!res.ok) return;
    setPortraits((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, published: !x.published } : x))
    );
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/portraits/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setPortraits((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  return (
    <div>
      <form
        onSubmit={handleCreate}
        className="bg-paper-dim border border-forest/20 rounded-lg p-5 mb-8 space-y-3"
      >
        <div className="text-sm font-medium mb-1">Ajouter un portrait</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="Nom affiché (ex: Julien « JuJu » Martin)"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            className="border border-ink/15 rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Rôle / accroche (ex: Trésorier, membre depuis 2019)"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="border border-ink/15 rounded px-3 py-2 text-sm"
          />
        </div>
        <textarea
          required
          placeholder="Portrait — quelques lignes sur cette personne, son parcours au club, une anecdote…"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={3}
          className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
        />
        <input
          type="url"
          placeholder="URL de la photo (optionnel)"
          value={form.photoUrl}
          onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
          className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
        />
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-forest text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Ajouter (non publié)"}
        </button>
        <p className="text-[0.65rem] text-sage/70">
          Demandez toujours l&apos;accord de la personne avant de publier son portrait.
        </p>
      </form>

      <h2 className="text-lg font-serif font-semibold mb-4">
        Portraits ({portraits.length})
      </h2>
      <div className="space-y-3">
        {portraits.map((p) => (
          <div key={p.id} className="border border-ink/10 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-medium text-sm">{p.displayName}</div>
                {p.role && <div className="text-xs text-sage mb-1">{p.role}</div>}
                <p className="text-sage text-xs line-clamp-3 max-w-xl">{p.bio}</p>
              </div>
              <span
                className={`text-[0.62rem] uppercase tracking-wide font-semibold px-2 py-1 rounded ${
                  p.published ? "bg-forest/10 text-forest" : "bg-ink/5 text-sage"
                }`}
              >
                {p.published ? "Publié" : "Brouillon"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => togglePublish(p)}
                className="border border-ink/20 text-xs px-3 py-1.5 rounded font-medium"
              >
                {p.published ? "Dépublier" : "Publier"}
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-xs px-3 py-1.5 rounded font-medium text-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {portraits.length === 0 && (
          <p className="text-sage text-sm">Aucun portrait pour le moment.</p>
        )}
      </div>
    </div>
  );
}
