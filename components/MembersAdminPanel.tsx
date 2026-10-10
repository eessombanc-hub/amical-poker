"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Mémorise si l'admin a choisi de masquer le formulaire "Créer un compte"
// (voir plus bas) — propre à ce navigateur, comme pour le bloc "Trafic du
// site" de /espace-membre (voir components/TrafficSection.tsx).
const HIDE_CREATE_FORM_KEY = "apcv-admin-membres-creation-masquee";

type CotisationStatus = "NON_PAYEE" | "PARTIELLE" | "PAYEE";

type MemberInfo = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  membershipStatus: "ACTIF" | "EN_ATTENTE" | "INACTIF";
  publicResults: boolean;
  birthDate: string | null;
  // Place au classement du site historique, synchronisée automatiquement —
  // voir lib/jimdoSync.ts, syncClassement. Lecture seule ici.
  legacyRankingPlace: number | null;
  // Cotisation annuelle — voir prisma/schema.prisma, enum CotisationStatus.
  cotisationStatus: CotisationStatus;
};

type UserRow = {
  id: string;
  email: string;
  role: "INVITE" | "MEMBRE" | "RESPONSABLE" | "BUREAU" | "ADMIN";
  displayName: string | null;
  createdAt: string;
  member: MemberInfo | null;
};

const ROLES = ["INVITE", "MEMBRE", "RESPONSABLE", "BUREAU", "ADMIN"] as const;
const STATUSES = ["ACTIF", "EN_ATTENTE", "INACTIF"] as const;

// Code couleur de la cotisation annuelle — voir prisma/schema.prisma, enum
// CotisationStatus, et le badge affiché au membre lui-même sur l'accueil
// (voir app/page.tsx).
const COTISATION_OPTIONS: { value: CotisationStatus; label: string; dot: string }[] = [
  { value: "PAYEE", label: "Cotisation payée intégralement", dot: "bg-forest" },
  { value: "PARTIELLE", label: "Cotisation payée partiellement", dot: "bg-brass" },
  { value: "NON_PAYEE", label: "Cotisation non payée", dot: "bg-crimson" },
];

const emptyForm = {
  email: "",
  firstName: "",
  lastName: "",
  nickname: "",
  role: "MEMBRE" as (typeof ROLES)[number],
  membershipStatus: "ACTIF" as (typeof STATUSES)[number],
  publicResults: false,
  birthDate: "",
  password: "",
};

export default function MembersAdminPanel({
  initialUsers,
  currentUserId,
  isSuperAdmin,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  // Tableau "Comptes existants" trié par ordre alphabétique (pseudo pour un
  // membre, nom affiché pour un accès invité) plutôt que par date de
  // création — indépendant de `users`, donc reste trié après une création,
  // une modification ou un rafraîchissement (voir refresh() plus bas).
  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.member ? a.member.nickname : a.displayName || "").localeCompare(
          b.member ? b.member.nickname : b.displayName || "",
          "fr",
          { sensitivity: "base" }
        )
      ),
    [users]
  );
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideCreateForm, setHideCreateForm] = useState(false);

  useEffect(() => {
    try {
      setHideCreateForm(localStorage.getItem(HIDE_CREATE_FORM_KEY) === "1");
    } catch {
      // Stockage indisponible (navigation privée, etc.) — reste affiché par défaut.
    }
  }, []);

  function toggleCreateForm() {
    const next = !hideCreateForm;
    setHideCreateForm(next);
    try {
      localStorage.setItem(HIDE_CREATE_FORM_KEY, next ? "1" : "0");
    } catch {
      // Rien à faire : le choix ne sera simplement pas mémorisé sur cet appareil.
    }
  }
  const [revealedPassword, setRevealedPassword] = useState<{ email: string; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/members");
    if (res.ok) setUsers((await res.json()).users);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        password: form.password || undefined,
        birthDate: form.birthDate || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "La création a échoué.");
      return;
    }
    if (data.generatedPassword) {
      setRevealedPassword({ email: data.user.email, password: data.generatedPassword });
    }
    setForm(emptyForm);
    await refresh();
    router.refresh();
  }

  async function handlePatch(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    const res = await fetch(`/api/admin/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "La mise à jour a échoué.");
      return;
    }
    if (data.generatedPassword) {
      const u = users.find((u) => u.id === id);
      setRevealedPassword({ email: u?.email ?? "", password: data.generatedPassword });
    }
    await refresh();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "La suppression a échoué.");
      return;
    }
    setConfirmDeleteId(null);
    setUsers((us) => us.filter((u) => u.id !== id));
    router.refresh();
  }

  return (
    <div>
      {error && (
        <div className="mb-6 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!isSuperAdmin && (
        <div className="mb-6 border border-brass/30 bg-brass/5 text-ink text-xs rounded-lg px-4 py-3">
          Seul le propriétaire du site peut accorder ou retirer le rôle ADMIN.
          Vous pouvez créer des membres et valider leur statut, mais pas
          désigner d&apos;autre administrateur.
        </div>
      )}

      {revealedPassword && (
        <div className="mb-8 border border-forest/30 bg-forest/5 rounded-lg p-5">
          <div className="text-sm font-medium mb-1">
            Mot de passe temporaire pour {revealedPassword.email}
          </div>
          <p className="text-xs text-sage mb-3">
            Il ne sera plus affiché ensuite. Notez-le et transmettez-le au
            membre pour sa première connexion (il pourra le changer une fois
            connecté si cette fonctionnalité est activée).
          </p>
          <code className="block bg-white border border-ink/10 rounded px-3 py-2 text-sm font-mono-club">
            {revealedPassword.password}
          </code>
          <button
            onClick={() => setRevealedPassword(null)}
            className="text-xs text-sage underline underline-offset-2 mt-3"
          >
            J&apos;ai noté ce mot de passe, masquer
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-serif font-semibold">Créer un compte</h2>
        <button
          type="button"
          onClick={toggleCreateForm}
          className="text-xs text-sage underline underline-offset-2 hover:text-ink"
        >
          {hideCreateForm ? "Afficher →" : "Masquer"}
        </button>
      </div>
      {!hideCreateForm && (
      <form onSubmit={handleCreate} className="border border-ink/10 rounded-lg p-5 mb-12 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-sage mb-1 block">E-mail</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
            placeholder="prenom.nom@email.fr"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-sage mb-1 block">
            Mot de passe (facultatif)
          </label>
          <input
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
            placeholder="Laisser vide pour générer automatiquement"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Rôle</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as (typeof ROLES)[number] })}
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white"
          >
            {ROLES.map((r) => (
              <option key={r} value={r} disabled={r === "ADMIN" && !isSuperAdmin}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {form.role === "INVITE" ? (
          <div>
            <label className="text-xs uppercase tracking-wide text-sage mb-1 block">
              Nom affiché (facultatif)
            </label>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
              placeholder="Affiché sur le forum"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Prénom</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Nom</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Pseudo (unique)</label>
              <input
                required
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Statut d&apos;adhésion</label>
              <select
                value={form.membershipStatus}
                onChange={(e) => setForm({ ...form, membershipStatus: e.target.value as (typeof STATUSES)[number] })}
                className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-sage mb-1 block">
                Date de naissance (facultatif)
              </label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.publicResults}
                onChange={(e) => setForm({ ...form, publicResults: e.target.checked })}
              />
              Autoriser l&apos;affichage public des résultats (classement, palmarès)
            </label>
          </>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={creating}
            className="bg-forest text-white text-sm px-5 py-2.5 rounded font-medium disabled:opacity-50"
          >
            {creating ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </form>
      )}

      <h2 className="text-lg font-serif font-semibold mb-4">Comptes existants ({users.length})</h2>
      <div className="overflow-x-auto border border-ink/10 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper-dim text-left">
              <th className="px-4 py-2.5 font-medium">Membre</th>
              <th className="px-4 py-2.5 font-medium">E-mail</th>
              <th className="px-4 py-2.5 font-medium">Rôle</th>
              <th className="px-4 py-2.5 font-medium">Statut</th>
              <th className="px-4 py-2.5 font-medium">Cotisation</th>
              <th className="px-4 py-2.5 font-medium">Date de naissance</th>
              <th className="px-4 py-2.5 font-medium">Place (site historique)</th>
              <th className="px-4 py-2.5 font-medium">Résultats publics</th>
              <th className="px-4 py-2.5 font-medium">Mot de passe</th>
              <th className="px-4 py-2.5 font-medium">Supprimer</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => (
              <tr key={u.id} className="border-t border-ink/10">
                <td className="px-4 py-2 whitespace-nowrap">
                  {u.member
                    ? `${u.member.firstName} ${u.member.lastName} (${u.member.nickname})`
                    : u.displayName || "—"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <input
                    type="email"
                    defaultValue={u.email}
                    disabled={busyId === u.id}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== u.email) {
                        handlePatch(u.id, { email: v });
                      } else {
                        e.target.value = u.email;
                      }
                    }}
                    className="border border-ink/15 rounded px-2 py-1 text-xs w-44"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) => handlePatch(u.id, { role: e.target.value })}
                    className="border border-ink/15 rounded px-2 py-1 text-xs bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} disabled={r === "ADMIN" && !isSuperAdmin}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  {u.member ? (
                    <select
                      value={u.member.membershipStatus}
                      disabled={busyId === u.id}
                      onChange={(e) => handlePatch(u.id, { membershipStatus: e.target.value })}
                      className="border border-ink/15 rounded px-2 py-1 text-xs bg-white"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  {u.member ? (
                    <span className="inline-flex items-center gap-1.5">
                      {COTISATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.label}
                          aria-label={opt.label}
                          aria-pressed={u.member!.cotisationStatus === opt.value}
                          disabled={busyId === u.id}
                          onClick={() => handlePatch(u.id, { cotisationStatus: opt.value })}
                          className={`w-4 h-4 rounded-full ${opt.dot} transition-transform disabled:opacity-40 ${
                            u.member!.cotisationStatus === opt.value
                              ? "ring-2 ring-offset-1 ring-ink/50 scale-110"
                              : "opacity-35 hover:opacity-70"
                          }`}
                        />
                      ))}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  {u.member ? (
                    <input
                      type="date"
                      defaultValue={u.member.birthDate ? u.member.birthDate.slice(0, 10) : ""}
                      disabled={busyId === u.id}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== (u.member!.birthDate ? u.member!.birthDate.slice(0, 10) : "")) {
                          handlePatch(u.id, { birthDate: v || null });
                        }
                      }}
                      className="border border-ink/15 rounded px-2 py-1 text-xs"
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-sage whitespace-nowrap">
                  {u.member?.legacyRankingPlace ? `${u.member.legacyRankingPlace}e` : "—"}
                </td>
                <td className="px-4 py-2">
                  {u.member ? (
                    <input
                      type="checkbox"
                      checked={u.member.publicResults}
                      disabled={busyId === u.id}
                      onChange={(e) => handlePatch(u.id, { publicResults: e.target.checked })}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handlePatch(u.id, { resetPassword: true })}
                    disabled={busyId === u.id}
                    className="text-xs text-burgundy underline underline-offset-2 disabled:opacity-50"
                  >
                    Réinitialiser
                  </button>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-sage/60">—</span>
                  ) : confirmDeleteId === u.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={busyId === u.id}
                        className="text-xs text-white bg-burgundy rounded px-2 py-1 font-medium disabled:opacity-50"
                      >
                        {busyId === u.id ? "…" : "Confirmer"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-sage underline underline-offset-2"
                      >
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(u.id)}
                      disabled={busyId === u.id}
                      className="text-xs text-burgundy underline underline-offset-2 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.68rem] text-sage/70 mt-3">
        Le rôle détermine les droits sur le site : INVITE (accès au forum
        uniquement, sans fiche membre), MEMBRE (accès standard), RESPONSABLE
        (peut publier des actus poker), BUREAU (gère aussi les portraits),
        ADMIN (accès complet, y compris cette page). L&apos;adresse e-mail est
        modifiable directement dans le tableau (cliquez, modifiez, puis
        sortez du champ pour enregistrer). La suppression d&apos;un
        compte est définitive (fiche membre, résultats et messages liés
        compris), utile pour retirer un compte de test. La « Place (site
        historique) » est resynchronisée automatiquement chaque jour depuis
        le classement du site historique, non modifiable ici. La colonne
        « Cotisation » (vert = payée, orange = partielle, rouge = non payée)
        est visible par le membre concerné, à côté de son pseudo, sur la
        page d&apos;accueil une fois connecté.
      </p>
    </div>
  );
}
