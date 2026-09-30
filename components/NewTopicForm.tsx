"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COMMUN_CATEGORIES = ["Général", "Organisation", "Stratégie", "Petites annonces"];
const BUREAU_CATEGORIES = ["Décisions", "Organisation", "Modération", "Autre"];

export default function NewTopicForm({
  area = "COMMUN",
  initialTitle = "",
}: {
  area?: "COMMUN" | "BUREAU";
  initialTitle?: string;
}) {
  const router = useRouter();
  const categories = area === "BUREAU" ? BUREAU_CATEGORIES : COMMUN_CATEGORIES;
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(
    initialTitle && categories.includes("Stratégie") ? "Stratégie" : categories[0]
  );
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/forum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, body, area }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible de publier le sujet.");
      return;
    }
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-lg p-6 max-w-2xl">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
      >
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        required
        placeholder="Titre du sujet"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
      />
      <textarea
        required
        rows={4}
        placeholder="Votre message..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
      />
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-forest text-white px-6 py-2.5 rounded text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Publication…" : "Publier le sujet"}
      </button>
    </form>
  );
}
