"use client";

import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

/**
 * Formulaire "Changer mon mot de passe", dans l'espace membre (voir
 * ProfileEditToggle) — demande l'ancien mot de passe pour confirmation,
 * comme sur la plupart des sites, avant d'en enregistrer un nouveau. Voir
 * /api/member/password. Distinct de "Mot de passe oublié" (jeton par
 * e-mail, pour un membre déconnecté qui ne se souvient plus de son mot de
 * passe actuel).
 */
export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/member/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Impossible de changer le mot de passe.");
      return;
    }
    setSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wide text-sage mb-3">Mot de passe</div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-sage mb-1 block">Mot de passe actuel</label>
          <PasswordInput
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setSaved(false);
            }}
            className="w-full bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-sage mb-1 block">Nouveau mot de passe</label>
          <PasswordInput
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setSaved(false);
            }}
            className="w-full bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-sage mb-1 block">Confirmer le nouveau mot de passe</label>
          <PasswordInput
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setSaved(false);
            }}
            className="w-full bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      {saved && !error && <p className="text-xs text-forest mt-3">Mot de passe mis à jour ✓</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 bg-forest text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Changer le mot de passe"}
      </button>
    </form>
  );
}
