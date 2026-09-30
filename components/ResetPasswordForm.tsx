"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Impossible de réinitialiser le mot de passe.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/connexion"), 2500);
  }

  if (!token) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-sm">
        Lien invalide : aucun jeton de réinitialisation trouvé. Refaites une
        demande depuis{" "}
        <Link href="/mot-de-passe-oublie" className="underline font-medium">
          mot de passe oublié
        </Link>
        .
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-forest/10 border border-forest/30 rounded-lg p-6 text-sm text-forest-2">
        Votre mot de passe a été mis à jour ✓ Redirection vers la connexion…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-forest text-white p-9 rounded-lg">
      <div className="mb-4">
        <label className="block text-xs tracking-wide uppercase text-white/70 mb-1.5">
          Nouveau mot de passe
        </label>
        <PasswordInput
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/10 border border-white/30 text-white rounded px-3.5 py-3 text-sm"
          toggleColorClassName="text-white/60 hover:text-white"
        />
      </div>
      <div className="mb-4">
        <label className="block text-xs tracking-wide uppercase text-white/70 mb-1.5">
          Confirmer le mot de passe
        </label>
        <PasswordInput
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-white/10 border border-white/30 text-white rounded px-3.5 py-3 text-sm"
          toggleColorClassName="text-white/60 hover:text-white"
        />
      </div>
      {error && <p className="text-red-200 text-sm mb-3">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-forest font-semibold rounded px-4 py-3.5 text-sm mt-2 disabled:opacity-60"
      >
        {loading ? "Enregistrement…" : "→ Choisir ce mot de passe"}
      </button>
    </form>
  );
}
