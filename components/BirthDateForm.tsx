"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Formulaire affiché sur l'espace membre lorsque la fiche n'a pas encore de
 * date de naissance (comptes créés avant l'ajout de ce champ, ou par un
 * administrateur) — permet au membre de la renseigner lui-même.
 */
export default function BirthDateForm() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);
  const maxBirthDateStr = maxBirthDate.toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/member/birthdate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Impossible d'enregistrer cette date.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs uppercase tracking-wide text-sage mb-1">
          Date de naissance
        </label>
        <input
          type="date"
          required
          max={maxBirthDateStr}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="border border-ink/15 rounded px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-glow bg-forest text-white text-sm font-medium px-4 py-2.5 rounded disabled:opacity-60"
      >
        {loading ? "Enregistrement…" : "Enregistrer"}
      </button>
      {error && <p className="text-burgundy text-xs w-full">{error}</p>}
    </form>
  );
}
