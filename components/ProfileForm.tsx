"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MemberProps = {
  mode: "member";
  initialFirstName: string;
  initialLastName: string;
  initialNickname: string;
  // Format "AAAA-MM-JJ", ou chaîne vide si pas encore renseignée.
  initialBirthDate: string;
  // RGPD : le membre autorise (ou non) la publication de ses résultats
  // (classement, points, kills) sur le site — voir Member.publicResults.
  initialPublicResults: boolean;
};
type InviteProps = {
  mode: "invite";
  initialDisplayName: string;
};

// Le club affilie des tournois d'argent réel : 18 ans est l'âge légal
// minimum en France (même contrôle que sur la demande d'adhésion).
function maxBirthDateStr() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

/**
 * Formulaire d'édition des éléments de profil directement par le membre ou
 * l'invité connecté : prénom/nom/pseudo/date de naissance pour un membre
 * (fiche Member), nom affiché sur le forum pour un accès invité — voir
 * /api/member/profile.
 */
export default function ProfileForm(props: MemberProps | InviteProps) {
  const router = useRouter();
  const isMember = props.mode === "member";
  const [firstName, setFirstName] = useState(isMember ? props.initialFirstName : "");
  const [lastName, setLastName] = useState(isMember ? props.initialLastName : "");
  const [nickname, setNickname] = useState(isMember ? props.initialNickname : "");
  const [birthDate, setBirthDate] = useState(isMember ? props.initialBirthDate : "");
  const [publicResults, setPublicResults] = useState(isMember ? props.initialPublicResults : false);
  const [displayName, setDisplayName] = useState(!isMember ? props.initialDisplayName : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const body = isMember
      ? { firstName, lastName, nickname, publicResults, ...(birthDate ? { birthDate } : {}) }
      : { displayName };
    const res = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Impossible d'enregistrer ces modifications.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wide text-sage mb-3">
        {isMember ? "Votre identité" : "Votre nom affiché"}
      </div>

      {isMember ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-sage mb-1 block">Prénom</label>
            <input
              required
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setSaved(false);
              }}
              className="w-full bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-sage mb-1 block">Nom</label>
            <input
              required
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setSaved(false);
              }}
              className="w-full bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-sage mb-1 block">Pseudo</label>
            <input
              required
              minLength={2}
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setSaved(false);
              }}
              className="w-full bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-sage mb-1 block">Date de naissance</label>
            <input
              type="date"
              max={maxBirthDateStr()}
              value={birthDate}
              onChange={(e) => {
                setBirthDate(e.target.value);
                setSaved(false);
              }}
              className="w-full bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex items-start gap-2.5 border-t border-ink/10 pt-4 mt-1">
            <input
              id="publicResults"
              type="checkbox"
              checked={publicResults}
              onChange={(e) => {
                setPublicResults(e.target.checked);
                setSaved(false);
              }}
              className="mt-0.5"
            />
            <label htmlFor="publicResults" className="text-xs text-sage leading-relaxed">
              <span className="text-ink font-medium">Publier mes résultats</span> — j&apos;autorise
              l&apos;affichage de mon pseudo, mon classement, mes points et mes
              kills sur les pages publiques du site (classement, accueil…).
              Modifiable à tout moment.
            </label>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs text-sage mb-1 block">Nom affiché sur le forum</label>
          <input
            required
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(false);
            }}
            className="w-full max-w-xs bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      {saved && !error && <p className="text-xs text-forest mt-3">Profil mis à jour ✓</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 bg-forest text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
