"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

export default function ConnexionPage() {
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
    <div className="relative min-h-screen overflow-hidden bg-paper-dim px-7 py-14">
      {/* Logo du club en grand filigrane, en arrière-plan de la page */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-[0.07]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-apcv.png"
          alt=""
          className="w-[130%] max-w-none md:w-[820px] grayscale"
        />
      </div>

      <div className="relative max-w-md mx-auto panel">
      <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
        Espace privé
      </div>
      <h1 className="text-3xl mb-8">Connexion membre</h1>

      <form onSubmit={handleSubmit} className="bg-paper-dim border border-ink/10 text-ink p-9 rounded-lg">
        <div className="mb-4">
          <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
            Email ou pseudo
          </label>
          <input
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">Mot de passe</label>
          <PasswordInput
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
          />
          <div className="text-right mt-1.5">
            <Link href="/mot-de-passe-oublie" className="text-xs text-sage underline hover:text-ink">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-forest text-white font-semibold rounded px-4 py-3.5 text-sm mt-2 disabled:opacity-60"
        >
          {loading ? "Connexion…" : "→ Accéder à mon espace"}
        </button>
      </form>

      <p className="text-sm text-sage mt-6 text-center">
        Pas encore membre ?{" "}
        <Link href="/demande-adhesion" className="text-forest font-medium underline">
          Faites une demande d&apos;adhésion
        </Link>
        .
      </p>
      <p className="text-sm text-sage mt-2 text-center">
        Vous n&apos;êtes pas membre du club mais voulez suivre le forum ?{" "}
        <Link href="/demande-invite" className="text-forest font-medium underline">
          Demandez un accès invité
        </Link>
        .
      </p>
    </div>
    </div>
  );
}
