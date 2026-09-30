"use client";

import { useState } from "react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

/**
 * Formulaire public pour les personnes qui ne font pas partie du club mais
 * souhaitent suivre/participer au forum (ex. futur membre en réflexion, ami
 * d'un membre). Plus léger que /demande-adhesion : pas de date de naissance
 * (le forum n'est pas lié aux tournois d'argent réel), pas de pseudo unique
 * à réserver — juste un nom, un e-mail et un mot de passe. La demande reste
 * examinée par le bureau avant la création du compte.
 */
export default function DemandeInvitePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
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
    const res = await fetch("/api/membership-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "INVITE_FORUM",
        nickname: displayName,
        email,
        password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Impossible d'envoyer la demande.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="px-7 py-14">
      <div className="max-w-md mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Vous n&apos;êtes pas membre du club ?
        </div>
        <h1 className="text-3xl mb-3">Accès invité au forum</h1>
        <p className="text-sage text-sm mb-8 max-w-sm">
          Réservé aux personnes qui ne font pas partie du club mais qui
          veulent suivre ou participer aux discussions du forum. Vous n&apos;êtes
          pas inscrit aux manches ni au classement. Pour ça, faites plutôt
          une{" "}
          <Link href="/demande-adhesion" className="text-forest underline underline-offset-4">
            demande d&apos;adhésion
          </Link>
          .
        </p>

        {done ? (
          <div className="bg-forest/10 border border-forest/30 rounded-lg p-6 text-sm text-forest-2">
            Votre demande d&apos;accès invité a bien été transmise au bureau ✓
            Un administrateur ou un responsable doit la valider avant que
            vous puissiez vous connecter et accéder au forum.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-forest text-white p-9 rounded-lg">
            <p className="text-white/80 text-sm mb-5">
              Indiquez votre nom, votre e-mail et un mot de passe. Votre
              demande sera examinée par le bureau avant que l&apos;accès ne
              soit ouvert.
            </p>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-white/70 mb-1.5">
                Nom ou pseudo affiché sur le forum
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/10 border border-white/30 text-white rounded px-3.5 py-3 text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-white/70 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/30 text-white rounded px-3.5 py-3 text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-white/70 mb-1.5">
                Mot de passe
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
              {loading ? "Envoi…" : "→ Demander un accès invité"}
            </button>
          </form>
        )}

        <p className="text-sm text-sage mt-6 text-center">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-forest font-medium underline">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
