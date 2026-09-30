"use client";

import { useState } from "react";
import Link from "next/link";

export default function MotDePasseOubliePage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    }).catch(() => {});
    setLoading(false);
    // Toujours le même écran de confirmation, que le compte existe ou non.
    setSent(true);
  }

  return (
    <div className="px-7 py-14">
      <div className="max-w-md mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Espace privé
        </div>
        <h1 className="text-3xl mb-8">Mot de passe oublié</h1>

        {sent ? (
          <div className="bg-forest/10 border border-forest/30 rounded-lg p-6 text-sm text-forest-2">
            Si un compte correspond à cette adresse ou ce pseudo, un e-mail de
            réinitialisation vient d&apos;être envoyé. Pensez à vérifier vos
            courriers indésirables. Le lien est valable 1 heure.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-forest text-white p-9 rounded-lg">
            <p className="text-white/80 text-sm mb-5">
              Indiquez votre e-mail ou votre pseudo : si un compte existe,
              vous recevrez un lien pour choisir un nouveau mot de passe.
            </p>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-white/70 mb-1.5">
                Email ou pseudo
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-white/10 border border-white/30 text-white rounded px-3.5 py-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-forest font-semibold rounded px-4 py-3.5 text-sm mt-2 disabled:opacity-60"
            >
              {loading ? "Envoi…" : "→ Envoyer le lien de réinitialisation"}
            </button>
          </form>
        )}

        <p className="text-sm text-sage mt-6 text-center">
          <Link href="/connexion" className="text-forest font-medium underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
