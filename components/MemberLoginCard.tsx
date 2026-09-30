"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

/**
 * Encart de connexion compact, intégré directement sur la page d'accueil
 * (section "Déjà membre") : mêmes identifiants que la page /connexion
 * dédiée, pour que les membres n'aient pas à changer de page pour se
 * connecter.
 */
export default function MemberLoginCard() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", { identifier, password, redirect: false });

    if (res?.error) {
      setLoading(false);
      // "CredentialsSignin" est le code générique renvoyé par next-auth quand
      // authorize() retourne null (mauvais identifiant/mot de passe) ; tout
      // autre message (ex. limite de tentatives dépassée) vient d'une erreur
      // volontairement levée dans lib/auth.ts et doit s'afficher tel quel.
      setError(res.error === "CredentialsSignin" ? "Identifiants incorrects." : res.error);
    } else {
      // Navigation complète (et non router.push) pour que la session tout
      // juste créée soit bien prise en compte partout (Nav, espace membre,
      // etc.) dès le premier affichage, sans avoir besoin de rafraîchir.
      window.location.href = "/espace-membre";
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="text-left bg-white border border-ink/10 rounded-lg p-6 max-w-sm mx-auto shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]"
    >
      <div className="mb-3.5">
        <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
          Email ou pseudo
        </label>
        <input
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full bg-paper-dim border border-ink/15 text-ink rounded px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="mb-2">
        <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
          Mot de passe
        </label>
        <PasswordInput
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-paper-dim border border-ink/15 text-ink rounded px-3.5 py-2.5 text-sm"
        />
      </div>
      <div className="text-right mb-3.5">
        <Link href="/mot-de-passe-oublie" className="text-xs text-sage underline hover:text-ink">
          Mot de passe oublié ?
        </Link>
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="btn-glow w-full bg-forest text-white font-semibold rounded px-4 py-3 text-sm disabled:opacity-60"
      >
        {loading ? "Connexion…" : "Connexion membre →"}
      </button>
    </form>
  );
}
