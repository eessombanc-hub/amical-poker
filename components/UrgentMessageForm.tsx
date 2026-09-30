"use client";

import { useMemo, useState } from "react";

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
};

type Target = "ALL" | "ROLE" | "MEMBERS";

const ROLES = ["MEMBRE", "RESPONSABLE", "BUREAU", "ADMIN"] as const;

const ROLE_LABEL: Record<(typeof ROLES)[number], string> = {
  MEMBRE: "Membres",
  RESPONSABLE: "Responsables",
  BUREAU: "Bureau",
  ADMIN: "Administrateurs",
};

// Formulaire de /admin/message-urgent — envoie un message urgent à tout ou
// partie des membres, selon le choix de destinataires ci-dessous (voir
// app/api/admin/urgent-message/route.ts), affiché en popup à leur prochaine
// connexion (voir components/UrgentMessagePopup.tsx).
export default function UrgentMessageForm({ members }: { members: MemberOption[] }) {
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Target>("ALL");
  const [role, setRole] = useState<(typeof ROLES)[number]>("MEMBRE");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      `${m.firstName} ${m.lastName} ${m.nickname}`.toLowerCase().includes(q)
    );
  }, [members, search]);

  function toggleMember(id: string) {
    setSelectedMemberIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  function recipientsSummary() {
    if (target === "ROLE") return `au rôle « ${ROLE_LABEL[role]} »`;
    if (target === "MEMBERS") {
      return selectedMemberIds.length > 0
        ? `à ${selectedMemberIds.length} membre${selectedMemberIds.length > 1 ? "s" : ""} sélectionné${selectedMemberIds.length > 1 ? "s" : ""}`
        : "à un membre";
    }
    return "à l'ensemble des membres";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (message.trim().length < 5) {
      setError("Merci de saisir un message d'au moins 5 caractères.");
      return;
    }
    if (target === "MEMBERS" && selectedMemberIds.length === 0) {
      setError("Merci de sélectionner au moins un membre.");
      return;
    }

    if (
      !window.confirm(
        `Ce message va s'afficher en popup ${recipientsSummary()}, à leur connexion, jusqu'à ce qu'ils le referment. Confirmer l'envoi ?`
      )
    ) {
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/urgent-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message.trim(),
        target,
        role: target === "ROLE" ? role : undefined,
        memberIds: target === "MEMBERS" ? selectedMemberIds : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "L'envoi a échoué.");
      return;
    }
    setSuccess(data.message || "Message envoyé.");
    setMessage("");
    setSelectedMemberIds([]);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-paper-dim border border-ink/10 text-ink p-9 rounded-lg">
      <div className="mb-5">
        <label className="block text-xs tracking-wide uppercase text-sage mb-2">
          Destinataires
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {(
            [
              { value: "ALL", label: "Tous les membres" },
              { value: "ROLE", label: "Par rôle" },
              { value: "MEMBERS", label: "Membres spécifiques" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTarget(opt.value)}
              className={`text-xs font-medium px-3.5 py-2 rounded-full border transition-colors ${
                target === opt.value
                  ? "bg-burgundy text-white border-burgundy"
                  : "border-ink/15 text-ink/70 hover:border-burgundy/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {target === "ROLE" && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
            className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        )}

        {target === "MEMBERS" && (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un membre…"
              className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-2.5 text-sm mb-2"
            />
            <div className="max-h-56 overflow-y-auto border border-ink/15 rounded bg-white divide-y divide-ink/5">
              {filteredMembers.length === 0 && (
                <p className="text-sage text-xs px-3.5 py-3">Aucun membre trouvé.</p>
              )}
              {filteredMembers.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm cursor-pointer hover:bg-paper-dim"
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                  />
                  <span>
                    {m.firstName} {m.lastName} « {m.nickname} »
                  </span>
                </label>
              ))}
            </div>
            {selectedMemberIds.length > 0 && (
              <p className="text-xs text-sage mt-1.5">
                {selectedMemberIds.length} membre{selectedMemberIds.length > 1 ? "s" : ""} sélectionné
                {selectedMemberIds.length > 1 ? "s" : ""}.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mb-5">
        <label className="block text-xs tracking-wide uppercase text-sage mb-1.5">
          Message urgent
        </label>
        <textarea
          required
          minLength={5}
          maxLength={1000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex. : La manche de ce soir est annulée en raison de..."
          className="w-full bg-white border border-ink/15 text-ink rounded px-3.5 py-3 text-sm"
        />
        <p className="text-sage text-xs mt-1.5">
          S&apos;affichera en popup à la prochaine connexion des destinataires
          choisis ci-dessus, jusqu&apos;à ce qu&apos;ils cliquent sur
          « J&apos;ai compris ».
        </p>
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {success && <p className="text-forest-2 text-sm mb-3">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-burgundy text-white font-semibold rounded px-4 py-3.5 text-sm mt-2 disabled:opacity-60"
      >
        {loading ? "Envoi…" : `→ Envoyer ${recipientsSummary()}`}
      </button>
    </form>
  );
}
