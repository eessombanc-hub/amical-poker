"use client";

import { useState } from "react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

export default function DemandeAdhesionPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Le club affilie des tournois d'argent réel : 18 ans est l'âge légal
  // minimum en France pour les jeux d'argent, on le vérifie donc dès ce formulaire.
  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);
  const maxBirthDateStr = maxBirthDate.toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Merci d'indiquer votre prénom et votre nom.");
      return;
    }
    if (!birthDate) {
      setError("Merci d'indiquer votre date de naissance.");
      return;
    }
    if (birthDate > maxBirthDateStr) {
      setError("Le club est réservé aux personnes majeures (18 ans minimum).");
      return;
    }
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
      body: JSON.stringify({ firstName, lastName, nickname, email, birthDate, password }),
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
          Rejoindre le club
        </div>
        <h1 className="text-3xl mb-8">Devenir membre</h1>

        {done ? (
          <div className="bg-forest/10 border border-forest/30 rounded-lg p-6 text-sm text-forest-2">
            Votre demande d&apos;adhésion a bien été transmise au bureau ✓
            Un administrateur ou un responsable doit la valider avant que
            votre espace membre ne soit créé. Vous pourrez alors vous
            connecter avec l&apos;e-mail ou le pseudo choisi ci-dessus.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-paper-dim border border-ink/10 text-ink p-9 rounded-lg">
            <p className="text-ink/70 text-sm mb-5">
              Choisissez votre pseudo, votre e-mail et votre mot de passe.
              Votre demande sera examinée par le bureau : votre espace membre
              ne sera créé qu&apos;une fois la demande validée.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
                  Prénom
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
                  Nom
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
                Pseudo
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
                Date de naissance
              </label>
              <input
                type="date"
                required
                max={maxBirthDateStr}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
              />
              <p className="text-sage text-xs mt-1.5">
                Réservé aux 18 ans et plus. Utilisée uniquement pour vérifier
                votre âge et vous souhaiter votre anniversaire sur le site.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
                Mot de passe
              </label>
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
                Confirmer le mot de passe
              </label>
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
              />
            </div>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest text-white font-semibold rounded px-4 py-3.5 text-sm mt-2 disabled:opacity-60"
            >
              {loading ? "Envoi…" : "→ Envoyer ma demande d'adhésion"}
            </button>
          </form>
        )}

        <p className="text-sm text-sage mt-6 text-center">
          Déjà membre ?{" "}
          <Link href="/connexion" className="text-forest font-medium underline">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}
