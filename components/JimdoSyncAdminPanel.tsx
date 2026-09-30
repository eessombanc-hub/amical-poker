"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Draft = {
  id: string;
  title: string;
  body: string;
  category: string;
  sourceUrl: string | null;
  updatedAt: string;
};

type SyncResult = { section: string; found: number; created: number; updated: number; error?: string };

const CATEGORY_LABEL: Record<string, string> = {
  VIE_DU_CLUB: "Vie du club",
  RESULTATS: "Résultats",
  EVENEMENTS: "Événements",
  INFORMATIONS: "Informations",
  COMMUNICATION_BUREAU: "Communication du bureau",
};

export default function JimdoSyncAdminPanel({ initialDrafts }: { initialDrafts: Draft[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState(initialDrafts);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResults(null);
    const res = await fetch("/api/sync/jimdo", { method: "POST" });
    setSyncing(false);
    if (!res.ok) {
      setResults([{ section: "Synchronisation", found: 0, created: 0, updated: 0, error: "La synchronisation a échoué." }]);
      return;
    }
    const data = await res.json();
    setResults(data.results);
    router.refresh();
    const listRes = await fetch("/api/news/drafts");
    if (listRes.ok) setDrafts(await listRes.json());
  }

  async function handleAction(id: string, status: "PUBLIE" | "DEPUBLIE") {
    const res = await fetch(`/api/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 bg-paper-dim border border-forest/20 rounded-lg px-5 py-4 mb-8">
        <div>
          <div className="text-sm font-medium">Synchronisation avec le site historique</div>
          <div className="text-xs text-sage max-w-xl">
            Récupère les annonces, partenaires, le calendrier détaillé, les
            photos et la boutique (vêtements APCV) depuis
            amicalpokerclub.jimdofree.com. Les annonces arrivent en brouillon
            ci-dessous pour relecture. Le reste (partenaires, calendrier,
            photos, boutique) est mis à jour directement.
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-forest text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {syncing ? "Synchronisation…" : "🔄 Synchroniser maintenant"}
        </button>
      </div>

      {results && (
        <div className="mb-8 border border-ink/10 rounded-lg divide-y divide-ink/10">
          {results.map((r) => (
            <div key={r.section} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{r.section}</span>
              <span className="text-xs text-sage">
                {r.error ? (
                  <span className="text-red-600">{r.error}</span>
                ) : (
                  `${r.found} trouvé(s) · ${r.created} créé(s) · ${r.updated} mis à jour`
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-serif font-semibold mb-4">
        Annonces à relire ({drafts.length})
      </h2>
      {drafts.length === 0 && (
        <p className="text-sage text-sm">
          Rien à valider pour le moment, synchronisez pour récupérer les
          dernières annonces du site historique.
        </p>
      )}
      <div className="space-y-3">
        {drafts.map((d) => (
          <div key={d.id} className="border border-burgundy/30 bg-burgundy/5 rounded-lg p-4">
            <div className="text-xs text-sage mb-1">
              {CATEGORY_LABEL[d.category] || d.category} · importé du site historique
            </div>
            <div className="font-medium text-sm mb-2">{d.title}</div>
            <p className="text-sage text-xs mb-3 whitespace-pre-line line-clamp-6">{d.body}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleAction(d.id, "PUBLIE")}
                className="bg-forest text-white text-xs px-3 py-1.5 rounded font-medium"
              >
                Publier tel quel
              </button>
              <button
                onClick={() => handleAction(d.id, "DEPUBLIE")}
                className="border border-ink/20 text-ink text-xs px-3 py-1.5 rounded font-medium"
              >
                Ignorer
              </button>
              {d.sourceUrl && (
                <a
                  href={d.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sage underline underline-offset-2 ml-auto"
                >
                  Voir la page source →
                </a>
              )}
            </div>
            <p className="text-[0.65rem] text-sage/70 mt-2">
              Pensez à retirer toute information personnelle (adresse, téléphone…) avant de publier.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
