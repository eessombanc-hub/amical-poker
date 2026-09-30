"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RequestRow = {
  id: string;
  type: "ADHESION" | "INVITE_FORUM";
  firstName: string | null;
  lastName: string | null;
  nickname: string;
  email: string;
  birthDate: string | null;
  createdAt: string;
};

/** Âge en années révolues à la date du jour. */
function getAge(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const ROLES = ["MEMBRE", "RESPONSABLE", "BUREAU", "ADMIN"] as const;

export default function MembershipRequestsPanel({
  initialRequests,
  isSuperAdmin,
}: {
  initialRequests: RequestRow[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [openId, setOpenId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("MEMBRE");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openValidation(r: RequestRow) {
    setOpenId(r.id);
    setFirstName(r.firstName || "");
    setLastName(r.lastName || "");
    setRole("MEMBRE");
    setError(null);
  }

  async function handleValidate(id: string) {
    const request = requests.find((r) => r.id === id);
    const isInvite = request?.type === "INVITE_FORUM";
    // Repli uniquement : les demandes envoyées via le formulaire actuel
    // fournissent déjà prénom/nom (voir request.firstName/lastName).
    const needsManualName = !isInvite && !(request?.firstName && request?.lastName);

    if (needsManualName && (!firstName.trim() || !lastName.trim())) {
      setError("Le prénom et le nom sont obligatoires pour créer l'espace membre.");
      return;
    }
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/membership-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isInvite ? { action: "valider" } : { action: "valider", firstName, lastName, role }
      ),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "La validation a échoué.");
      return;
    }
    setRequests((rs) => rs.filter((r) => r.id !== id));
    setOpenId(null);
    router.refresh();
  }

  async function handleReject(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/membership-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refuser" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Le refus a échoué.");
      return;
    }
    setRequests((rs) => rs.filter((r) => r.id !== id));
    if (openId === id) setOpenId(null);
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <p className="text-sage text-sm">
        Aucune demande d&apos;adhésion en attente pour le moment.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="border border-ink/10 rounded-lg p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[0.6rem] tracking-widest uppercase font-semibold border rounded-full px-2 py-0.5 ${
                      r.type === "INVITE_FORUM"
                        ? "bg-brass/15 text-[#8a6412] border-brass/40"
                        : "bg-forest/10 text-forest border-forest/30"
                    }`}
                  >
                    {r.type === "INVITE_FORUM" ? "Accès invité" : "Adhésion"}
                  </span>
                </div>
                <div className="font-medium">
                  {r.firstName && r.lastName ? `${r.firstName} ${r.lastName} « ${r.nickname} »` : r.nickname}
                </div>
                <div className="text-sm text-sage">{r.email}</div>
                <div className="text-xs text-sage/70 mt-0.5">
                  {r.type === "INVITE_FORUM" ? (
                    "Accès invité, pas de fiche membre, forum uniquement"
                  ) : r.birthDate ? (
                    <>
                      Né(e) le{" "}
                      {new Date(r.birthDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      ({getAge(r.birthDate)} ans)
                    </>
                  ) : (
                    "Date de naissance non renseignée (demande envoyée avant l'ajout de ce champ)"
                  )}
                </div>
                <div className="text-xs text-sage/70 mt-0.5">
                  Demande envoyée le{" "}
                  {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                {openId !== r.id && (
                  <button
                    onClick={() => openValidation(r)}
                    disabled={busyId === r.id}
                    className="bg-forest text-white text-sm px-4 py-2 rounded font-medium disabled:opacity-50"
                  >
                    Valider
                  </button>
                )}
                <button
                  onClick={() => handleReject(r.id)}
                  disabled={busyId === r.id}
                  className="border border-burgundy/40 text-burgundy text-sm px-4 py-2 rounded font-medium disabled:opacity-50"
                >
                  Refuser
                </button>
              </div>
            </div>

            {openId === r.id && r.type === "INVITE_FORUM" && (
              <div className="mt-4 pt-4 border-t border-ink/10">
                <p className="text-sage text-xs mb-3">
                  Aucune fiche membre ne sera créée, juste un compte de
                  connexion, rôle <strong>INVITE</strong>, donnant accès au
                  forum sous le nom « {r.nickname} ».
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleValidate(r.id)}
                    disabled={busyId === r.id}
                    className="bg-forest text-white text-sm px-5 py-2.5 rounded font-medium disabled:opacity-50"
                  >
                    {busyId === r.id ? "Création…" : "Confirmer l'accès invité"}
                  </button>
                  <button
                    onClick={() => setOpenId(null)}
                    className="text-sm text-sage underline underline-offset-2"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {openId === r.id && r.type === "ADHESION" && (
              <div className="mt-4 pt-4 border-t border-ink/10 grid sm:grid-cols-3 gap-3">
                {r.firstName && r.lastName ? (
                  <div className="sm:col-span-2 flex items-end">
                    <p className="text-sm text-ink">
                      Créera l&apos;espace membre de <strong>{r.firstName} {r.lastName}</strong>{" "}
                      (pseudo « {r.nickname} »).
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Prénom</label>
                      <input
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Nom</label>
                      <input
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full border border-ink/15 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Rôle</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                    className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white"
                  >
                    {ROLES.map((rr) => (
                      <option key={rr} value={rr} disabled={rr === "ADMIN" && !isSuperAdmin}>
                        {rr}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3 flex gap-2 mt-1">
                  <button
                    onClick={() => handleValidate(r.id)}
                    disabled={busyId === r.id}
                    className="bg-forest text-white text-sm px-5 py-2.5 rounded font-medium disabled:opacity-50"
                  >
                    {busyId === r.id ? "Création…" : "Confirmer la création de l'espace membre"}
                  </button>
                  <button
                    onClick={() => setOpenId(null)}
                    className="text-sm text-sage underline underline-offset-2"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
