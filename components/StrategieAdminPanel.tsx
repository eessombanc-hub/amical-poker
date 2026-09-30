"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STRATEGIE_LEVELS, LEVEL_LABEL, quizToText, textToQuiz, type QuizQuestion } from "@/lib/strategieLevels";

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  takeaway: string;
  content: string[];
  quiz: QuizQuestion[] | null;
  level: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
  readingTime: string;
  status: "BROUILLON" | "PUBLIE" | "DEPUBLIE";
  featured: boolean;
  createdAt: string;
};

const STATUSES = ["BROUILLON", "PUBLIE", "DEPUBLIE"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  BROUILLON: "Brouillon",
  PUBLIE: "Publié",
  DEPUBLIE: "Dépublié",
};

const emptyForm = {
  slug: "",
  title: "",
  excerpt: "",
  takeaway: "",
  content: "",
  quiz: "",
  level: "DEBUTANT" as (typeof STRATEGIE_LEVELS)[number],
  readingTime: "5 min",
  featured: false,
  status: "BROUILLON" as (typeof STATUSES)[number],
};

function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function StrategieAdminPanel({ initialArticles }: { initialArticles: Article[] }) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startEdit(a: Article) {
    setEditingId(a.id);
    setSlugTouched(true);
    setForm({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      takeaway: a.takeaway,
      content: a.content.join("\n\n"),
      quiz: quizToText(a.quiz),
      level: a.level,
      readingTime: a.readingTime,
      featured: a.featured,
      status: a.status,
    });
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const content = form.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (content.length === 0) {
      setError("Le corps de l'article ne peut pas être vide.");
      return;
    }
    const quiz = form.quiz.trim() ? textToQuiz(form.quiz) : undefined;

    const payload = {
      slug: form.slug || slugify(form.title),
      title: form.title,
      excerpt: form.excerpt,
      takeaway: form.takeaway,
      content,
      quiz,
      level: form.level,
      readingTime: form.readingTime,
      featured: form.featured,
      status: form.status,
    };

    setLoading(true);
    const res = await fetch(editingId ? `/api/strategie/${editingId}` : "/api/strategie", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible d'enregistrer cet article.");
      return;
    }

    if (editingId) {
      setArticles((prev) => prev.map((a) => (a.id === editingId ? data : a)));
      setNotice("Article mis à jour.");
    } else {
      setArticles((prev) => [data, ...prev]);
      setNotice("Article créé.");
    }
    resetForm();
    router.refresh();
  }

  async function handlePatch(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    const res = await fetch(`/api/strategie/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "La mise à jour a échoué.");
      return;
    }
    setArticles((prev) => prev.map((a) => (a.id === id ? data : a)));
    router.refresh();
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/strategie/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) return;
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setConfirmDeleteId(null);
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div>
      {error && (
        <div className="mb-6 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-6 border border-forest/30 bg-forest/5 text-forest text-sm rounded-lg px-4 py-3">
          {notice}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
        {/* ── Formulaire ── */}
        <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-lg p-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-semibold">
              {editingId ? "Modifier l'article" : "Nouvel article"}
            </h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-xs text-sage underline underline-offset-2">
                Annuler l&apos;édition
              </button>
            )}
          </div>

          <label className="block text-xs uppercase tracking-wide text-sage mb-1">Titre</label>
          <input
            required
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
            }}
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
          />

          <label className="block text-xs uppercase tracking-wide text-sage mb-1">
            Slug (URL : /strategie/…)
          </label>
          <input
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((f) => ({ ...f, slug: e.target.value }));
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3 font-mono-club"
          />

          <label className="block text-xs uppercase tracking-wide text-sage mb-1">
            Extrait (affiché dans les listes)
          </label>
          <textarea
            required
            rows={2}
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
          />

          <label className="block text-xs uppercase tracking-wide text-sage mb-1">À retenir</label>
          <textarea
            required
            rows={2}
            value={form.takeaway}
            onChange={(e) => setForm({ ...form, takeaway: e.target.value })}
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
          />

          <label className="block text-xs uppercase tracking-wide text-sage mb-1">
            Corps de l&apos;article, un paragraphe par bloc, séparez-les par une ligne vide
          </label>
          <textarea
            required
            rows={10}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3 font-mono-club"
          />

          <label className="block text-xs uppercase tracking-wide text-sage mb-1">
            Quiz de fin d&apos;article (facultatif)
          </label>
          <p className="text-[0.68rem] text-sage/80 mb-1.5">
            Une question par bloc (ligne vide entre chaque) : la question sur
            la première ligne, une option par ligne suivante, précédez la
            bonne réponse de « * ».
          </p>
          <textarea
            rows={6}
            value={form.quiz}
            onChange={(e) => setForm({ ...form, quiz: e.target.value })}
            placeholder={"Que signifie « all-in » ?\n* Miser tout son tapis\nSe coucher\nRelancer au minimum"}
            className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3 font-mono-club"
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-sage mb-1">Niveau</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as typeof form.level })}
                className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm bg-white"
              >
                {STRATEGIE_LEVELS.map((l) => (
                  <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-sage mb-1">Temps de lecture</label>
              <input
                required
                value={form.readingTime}
                onChange={(e) => setForm({ ...form, readingTime: e.target.value })}
                placeholder="6 min"
                className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-sage mb-1">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              Mettre en avant en tête de page
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-forest text-white px-6 py-2.5 rounded text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Créer l'article"}
          </button>
        </form>

        {/* ── Liste ── */}
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} className="border border-ink/10 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-xs text-sage mb-0.5 flex items-center gap-1.5 flex-wrap">
                    {LEVEL_LABEL[a.level]}
                    {a.featured && <span className="text-brass">★ en avant</span>}
                  </div>
                  <div className="font-medium text-sm truncate">{a.title}</div>
                  <div className="text-xs text-sage/70 font-mono-club truncate">/strategie/{a.slug}</div>
                </div>
                <select
                  value={a.status}
                  disabled={busyId === a.id}
                  onChange={(e) => handlePatch(a.id, { status: e.target.value })}
                  className="border border-ink/15 rounded px-2 py-1 text-xs bg-white flex-shrink-0"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => startEdit(a)}
                  className="text-xs text-forest underline underline-offset-2"
                >
                  Modifier
                </button>
                {confirmDeleteId === a.id ? (
                  <span className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={busyId === a.id}
                      className="text-xs text-white bg-burgundy rounded px-2 py-1 font-medium disabled:opacity-50"
                    >
                      {busyId === a.id ? "…" : "Confirmer la suppression"}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-sage underline underline-offset-2">
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(a.id)}
                    disabled={busyId === a.id}
                    className="text-xs text-burgundy underline underline-offset-2 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          ))}
          {articles.length === 0 && (
            <p className="text-sage text-sm">Aucun article pour l&apos;instant.</p>
          )}
        </div>
      </div>
    </div>
  );
}
