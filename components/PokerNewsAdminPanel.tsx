"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string | null;
  category: string;
  status: "A_VALIDER" | "PUBLIE" | "REJETE";
  autoImported: boolean;
  submittedByName: string | null;
  publishedAt: string | null;
  fetchedAt: string;
};

const CATEGORIES = ["Circuit", "Résultats", "Stratégie", "Interviews", "Online", "Casino", "Sport", "Divers"];

export default function PokerNewsAdminPanel({
  initialItems,
  canValidate,
}: {
  initialItems: NewsItem[];
  canValidate: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    sourceName: "winamax.fr",
    sourceUrl: "",
    imageUrl: "",
    category: CATEGORIES[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  async function handlePrefill() {
    if (!form.sourceUrl) {
      setError("Collez d'abord le lien de l'article dans le champ ci-dessous.");
      return;
    }
    setPrefilling(true);
    setError(null);
    const res = await fetch(`/api/poker-news/fetch-meta?url=${encodeURIComponent(form.sourceUrl)}`);
    setPrefilling(false);
    if (!res.ok) {
      setError("Impossible de récupérer automatiquement les infos de ce lien. Remplissez à la main.");
      return;
    }
    const meta = await res.json();
    setForm((f) => ({
      ...f,
      title: meta.title || f.title,
      summary: meta.summary || f.summary,
      imageUrl: meta.imageUrl || f.imageUrl,
    }));
  }

  async function handleSync() {
    setSyncing(true);
    setSyncNotice(null);
    const res = await fetch("/api/poker-news/sync", { method: "POST" });
    setSyncing(false);
    if (!res.ok) {
      setSyncNotice("La synchronisation a échoué.");
      return;
    }
    const data = await res.json();
    const totalCreated = data.results.reduce((sum: number, r: any) => sum + r.created, 0);
    setSyncNotice(
      totalCreated > 0
        ? `${totalCreated} nouvelle(s) actu(s) importée(s) et publiée(s).`
        : "Aucune nouvelle actu. Tout est déjà à jour."
    );
    router.refresh();
    // Recharge la liste pour inclure les actus fraîchement importées.
    const listRes = await fetch(canValidate ? "/api/poker-news?all=1" : "/api/poker-news");
    if (listRes.ok) setItems(await listRes.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/poker-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Impossible d'ajouter cette actu. Vérifiez les champs (URL source valide notamment).");
      return;
    }
    const created = await res.json();
    setItems((prev) => [created, ...prev]);
    setNotice(
      created.status === "PUBLIE"
        ? "Actu publiée immédiatement."
        : "Actu envoyée pour validation au bureau."
    );
    setForm({ title: "", summary: "", sourceName: "winamax.fr", sourceUrl: "", imageUrl: "", category: CATEGORIES[0] });
    router.refresh();
  }

  async function handleAction(id: string, action: "publier" | "rejeter") {
    const res = await fetch(`/api/poker-news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/poker-news/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
    router.refresh();
  }

  const pending = items.filter((i) => i.status === "A_VALIDER");
  const published = items.filter((i) => i.status === "PUBLIE");
  const rejected = items.filter((i) => i.status === "REJETE");

  return (
    <div>
      {canValidate && (
        <div className="flex items-center justify-between flex-wrap gap-3 bg-paper-dim border border-forest/20 rounded-lg px-5 py-4 mb-6">
          <div>
            <div className="text-sm font-medium">Synchronisation automatique</div>
            <div className="text-xs text-sage">
              Récupère les derniers articles de PokerNews, CardPlayer, Les
              clubs de jeux parisiens (casinos de Paris et d&apos;Enghien-les-Bains)
              et L&apos;Équipe (sport), flux RSS officiels, et les publie directement.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {syncNotice && <span className="text-xs text-sage">{syncNotice}</span>}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-forest text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {syncing ? "Synchronisation…" : "🔄 Synchroniser maintenant"}
            </button>
          </div>
        </div>
      )}
    <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">
      {/* ── Formulaire d'ajout ── */}
      <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-lg p-6 h-fit">
        <h2 className="text-lg font-serif font-semibold mb-4">Ajouter une actu manuellement</h2>
        <p className="text-xs text-sage mb-3">
          Pour winamax.fr, qui ne propose pas de flux RSS : collez le lien de
          l&apos;article puis cliquez sur « Pré-remplir » pour récupérer
          automatiquement le titre, le résumé et l&apos;image.
        </p>
        <label className="block text-xs uppercase tracking-wide text-sage mb-1">Lien vers l&apos;article</label>
        <div className="flex gap-2 mb-3">
          <input
            required
            type="url"
            value={form.sourceUrl}
            onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
            placeholder="https://www.winamax.fr/news_..."
            className="flex-1 border border-ink/15 rounded px-3.5 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={handlePrefill}
            disabled={prefilling}
            className="border border-forest text-forest text-xs px-3 rounded font-medium whitespace-nowrap disabled:opacity-50"
          >
            {prefilling ? "…" : "Pré-remplir"}
          </button>
        </div>
        <label className="block text-xs uppercase tracking-wide text-sage mb-1">Titre</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ex : Winamax Poker Tour, les qualifications sont ouvertes"
          className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
        />
        <label className="block text-xs uppercase tracking-wide text-sage mb-1">Résumé</label>
        <textarea
          required
          rows={4}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          placeholder="Copiez-collez ou reformulez brièvement l'article vu sur winamax.fr ou ailleurs…"
          className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
        />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-sage mb-1">Source</label>
            <input
              required
              value={form.sourceName}
              onChange={(e) => setForm({ ...form, sourceName: e.target.value })}
              className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-sage mb-1">Catégorie</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="block text-xs uppercase tracking-wide text-sage mb-1">Image (URL, optionnel)</label>
        <input
          type="url"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://…"
          className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
        />
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {notice && <p className="text-sm text-forest mb-2">{notice}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-forest text-white px-6 py-2.5 rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Envoi…" : canValidate ? "Publier l'actu" : "Envoyer pour validation"}
        </button>
        {!canValidate && (
          <p className="text-xs text-sage mt-2">
            Votre actu sera visible publiquement après validation par le bureau.
          </p>
        )}
      </form>

      {/* ── Listes ── */}
      <div className="space-y-8">
        {canValidate && pending.length > 0 && (
          <div>
            <h3 className="text-sm uppercase tracking-wide text-burgundy font-semibold mb-3">
              À valider ({pending.length})
            </h3>
            <div className="space-y-3">
              {pending.map((n) => (
                <div key={n.id} className="border border-burgundy/30 bg-burgundy/5 rounded-lg p-4">
                  <div className="text-xs text-sage mb-1">
                    {n.category} · {n.sourceName} · proposé par {n.submittedByName || "un responsable"}
                  </div>
                  <div className="font-medium text-sm mb-1">{n.title}</div>
                  <p className="text-sage text-xs mb-3 line-clamp-2">{n.summary}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(n.id, "publier")}
                      className="bg-forest text-white text-xs px-3 py-1.5 rounded font-medium"
                    >
                      Publier
                    </button>
                    <button
                      onClick={() => handleAction(n.id, "rejeter")}
                      className="border border-ink/20 text-ink text-xs px-3 py-1.5 rounded font-medium"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm uppercase tracking-wide text-sage font-semibold mb-3">
            Publiées ({published.length})
          </h3>
          <div className="space-y-2">
            {published.map((n) => (
              <div key={n.id} className="flex items-center justify-between border border-ink/10 rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {n.title}
                    {n.autoImported && (
                      <span className="text-[0.6rem] uppercase tracking-wide bg-forest/10 text-forest px-1.5 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-sage">{n.category} · {n.sourceName}</div>
                </div>
                {canValidate && (
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-xs text-red-600 underline underline-offset-2"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            ))}
            {published.length === 0 && <p className="text-sage text-sm">Aucune actu publiée.</p>}
          </div>
        </div>

        {canValidate && rejected.length > 0 && (
          <div>
            <h3 className="text-sm uppercase tracking-wide text-sage font-semibold mb-3">
              Rejetées ({rejected.length})
            </h3>
            <div className="space-y-2">
              {rejected.map((n) => (
                <div key={n.id} className="flex items-center justify-between border border-ink/10 rounded-lg px-4 py-3 opacity-60">
                  <div className="text-sm">{n.title}</div>
                  <button onClick={() => handleDelete(n.id)} className="text-xs text-red-600 underline underline-offset-2">
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
