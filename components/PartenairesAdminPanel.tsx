"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Partner = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  position: number;
  sourceUrl: string;
};

const EMPTY_FORM = { name: "", description: "", logoUrl: "", websiteUrl: "" };

/** Un partenaire ajouté à la main reçoit un sourceUrl synthétique
 *  "manual:…" (voir POST /api/admin/partners) — sert uniquement ici à
 *  distinguer son origine ; un partenaire synchronisé a un vrai lien vers
 *  sa page sur le site historique. */
function isManual(p: Partner) {
  return p.sourceUrl.startsWith("manual:");
}

export default function PartenairesAdminPanel({ initialPartners }: { initialPartners: Partner[] }) {
  const router = useRouter();
  const [partners, setPartners] = useState(initialPartners);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        websiteUrl: form.websiteUrl.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible d'ajouter ce partenaire.");
      return;
    }
    setPartners((prev) => [...prev, data]);
    setForm(EMPTY_FORM);
    router.refresh();
  }

  function startEdit(p: Partner) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      description: p.description || "",
      logoUrl: p.logoUrl || "",
      websiteUrl: p.websiteUrl || "",
    });
    setError(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    setError(null);
    const res = await fetch(`/api/admin/partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        logoUrl: editForm.logoUrl.trim() || null,
        websiteUrl: editForm.websiteUrl.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingEdit(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible d'enregistrer ce partenaire.");
      return;
    }
    setPartners((prev) => prev.map((p) => (p.id === id ? data : p)));
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/partners/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) return;
    setPartners((prev) => prev.filter((p) => p.id !== id));
    setConfirmDeleteId(null);
    router.refresh();
  }

  async function handleMove(id: string, direction: "up" | "down") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/partners/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible de déplacer ce partenaire.");
      return;
    }
    setPartners(data);
    router.refresh();
  }

  const sorted = [...partners].sort((a, b) => a.position - b.position);

  return (
    <div>
      {error && (
        <div className="mb-6 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-paper-dim border border-forest/20 rounded-lg p-5 mb-8 space-y-3">
        <div className="text-sm font-medium mb-1">Ajouter un partenaire</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            required
            placeholder="Nom du partenaire"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-ink/15 rounded px-3 py-2 text-sm"
          />
          <input
            type="url"
            placeholder="Site web (https://...)"
            value={form.websiteUrl}
            onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            className="border border-ink/15 rounded px-3 py-2 text-sm"
          />
        </div>
        <input
          type="url"
          placeholder="URL du logo (https://...)"
          value={form.logoUrl}
          onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
          className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Description (facultatif)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
        />
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="bg-forest text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50"
        >
          {creating ? "Ajout…" : "Ajouter le partenaire"}
        </button>
      </form>

      <h2 className="text-lg font-serif font-semibold mb-4">Partenaires ({sorted.length})</h2>
      <div className="space-y-3">
        {sorted.map((p, i) => (
          <div key={p.id} className="border border-ink/10 rounded-lg p-4">
            {editingId === p.id ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="border border-ink/15 rounded px-3 py-2 text-sm"
                    placeholder="Nom du partenaire"
                  />
                  <input
                    type="url"
                    value={editForm.websiteUrl}
                    onChange={(e) => setEditForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                    className="border border-ink/15 rounded px-3 py-2 text-sm"
                    placeholder="Site web (https://...)"
                  />
                </div>
                <input
                  type="url"
                  value={editForm.logoUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
                  placeholder="URL du logo (https://...)"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
                  placeholder="Description (facultatif)"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(p.id)}
                    disabled={savingEdit}
                    className="bg-forest text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50"
                  >
                    {savingEdit ? "Enregistrement…" : "Enregistrer"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-sage underline underline-offset-2"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex gap-3 items-start">
                  {p.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logoUrl} alt={p.name} className="w-12 h-12 object-contain flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.name}</span>
                      <span
                        className={`text-[0.6rem] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${
                          isManual(p) ? "bg-forest/10 text-forest" : "bg-ink/5 text-sage"
                        }`}
                      >
                        {isManual(p) ? "Ajouté manuellement" : "Synchronisé"}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-sage text-xs mt-1 line-clamp-3 max-w-xl">{p.description}</p>
                    )}
                    {p.websiteUrl && (
                      <a
                        href={p.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-forest text-xs font-medium underline underline-offset-2 mt-1 inline-block"
                      >
                        Visiter le site →
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleMove(p.id, "up")}
                    disabled={i === 0 || busyId === p.id}
                    title="Monter"
                    className="border border-ink/15 rounded px-2 py-1.5 text-xs disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(p.id, "down")}
                    disabled={i === sorted.length - 1 || busyId === p.id}
                    title="Descendre"
                    className="border border-ink/15 rounded px-2 py-1.5 text-xs disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => startEdit(p)}
                    className="border border-ink/20 text-xs px-3 py-1.5 rounded font-medium"
                  >
                    Modifier
                  </button>
                  {confirmDeleteId === p.id ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={busyId === p.id}
                        className="text-xs text-white bg-burgundy rounded px-3 py-1.5 font-medium disabled:opacity-50"
                      >
                        {busyId === p.id ? "…" : "Confirmer"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-sage underline underline-offset-2"
                      >
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="text-xs px-3 py-1.5 rounded font-medium text-red-700"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-sage text-sm">
            Aucun partenaire pour l&apos;instant — ajoutez-en un ci-dessus, ou
            synchronisez depuis le site historique.
          </p>
        )}
      </div>
    </div>
  );
}
