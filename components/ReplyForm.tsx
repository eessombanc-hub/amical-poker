"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Formulaire de réponse à un sujet du forum (commun ou bureau). */
export default function ReplyForm({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/forum/${topicId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Impossible de publier la réponse.");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-lg p-5">
      <textarea
        required
        rows={3}
        placeholder="Votre réponse..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full border border-ink/15 rounded px-3.5 py-2.5 text-sm mb-3"
      />
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-forest text-white px-5 py-2 rounded text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Publication…" : "Répondre"}
      </button>
    </form>
  );
}
