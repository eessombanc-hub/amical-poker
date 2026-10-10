"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EligibleMember = { id: string; nickname: string; firstName: string; lastName: string };

/**
 * Panneau "Ajouter un joueur", affiché sur la fiche de toute manche
 * classique (app/calendrier/manche/[id]/page.tsx) — réservé au bureau, aux
 * responsables et à l'admin (canEnterResults, voir hasRole(role,
 * "RESPONSABLE") dans lib/auth.ts). Permet d'inscrire sur place un joueur
 * qui ne s'était pas inscrit en ligne, sans passer par la liste d'attente
 * (voir le commentaire du POST dans app/api/admin/round-registrations) —
 * c'est la même logique que le panneau Sit&Go dédié
 * (components/SitngoRegistrationPanel.tsx), ici généralisée à toutes les
 * manches (MTT, Deepstack, CFEPA). La liste `eligibleMembers` est déjà
 * filtrée côté serveur : membres actifs pas déjà inscrits/en liste
 * d'attente sur cette manche.
 *
 * `collectStartingStack` : affiche en plus un champ "Stack de départ" —
 * activé pour le Day 2 d'un Deepstack groupé (voir
 * app/calendrier/manche/[id]/page.tsx, isDeepstackDay2), pour enregistrer
 * directement le stack conservé de la veille par chaque joueur qualifié
 * (voir prisma/schema.prisma, RoundRegistration.startingStack). Facultatif :
 * un stack peut toujours être ajouté ou corrigé après coup (voir
 * StartingStackInput, affiché sur la liste des inscrits dans ce cas).
 *
 * `restrictedToQualifiedDay2` : adapte juste les textes (liste et message
 * vide) pour un Day 2 de Deepstack, où `eligibleMembers` n'est PAS "tout
 * membre actif non inscrit" mais déjà strictement limité, côté serveur, aux
 * joueurs qualifiés — inscrits au Day 1 et pas éliminés (voir
 * lib/ranking.ts, isQualifiedForDeepstackDay2). Impossible d'y ajouter un
 * joueur quelconque : le menu ne propose jamais que ces qualifiés, et
 * l'API revérifie la même règle même si ce menu était contourné.
 */
export default function AdminRegisterPanel({
  roundId,
  eligibleMembers,
  collectStartingStack = false,
  restrictedToQualifiedDay2 = false,
}: {
  roundId: string;
  eligibleMembers: EligibleMember[];
  collectStartingStack?: boolean;
  restrictedToQualifiedDay2?: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [stack, setStack] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!selectedId) return;
    setRegistering(true);
    setError(null);
    const res = await fetch("/api/admin/round-registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundId,
        memberId: selectedId,
        ...(collectStartingStack && stack ? { startingStack: Number(stack) } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setRegistering(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "L'inscription a échoué.");
      return;
    }
    setSelectedId("");
    setStack("");
    router.refresh();
  }

  return (
    <div className="mb-8 border border-forest/20 bg-forest/5 rounded-lg p-4">
      <h2 className="text-base font-serif font-semibold mb-1">
        {restrictedToQualifiedDay2 ? "Ajouter un joueur qualifié" : "Ajouter un joueur"}
      </h2>
      <p className="text-xs text-sage mb-3">
        {restrictedToQualifiedDay2 ? (
          <>
            Réservé au bureau, aux responsables et à l&apos;admin — seuls les
            joueurs qualifiés pour ce Day 2 sont proposés ci-dessous (inscrits
            au Day 1, pas éliminés). Impossible d&apos;y ajouter un autre
            joueur.
          </>
        ) : (
          <>
            Réservé au bureau, aux responsables et à l&apos;admin — pour
            inscrire sur place un joueur présent à la table qui ne
            s&apos;était pas inscrit en ligne. Il est ajouté directement en
            inscrit, sans passer par la liste d&apos;attente.
          </>
        )}
      </p>
      {error && (
        <div className="mb-3 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {eligibleMembers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border border-ink/15 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="">Choisir un membre…</option>
            {eligibleMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nickname} ({m.firstName} {m.lastName})
              </option>
            ))}
          </select>
          {collectStartingStack && (
            <input
              type="number"
              min={0}
              step={1}
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              placeholder="Stack de départ"
              className="border border-ink/15 rounded px-3 py-2 text-sm w-36"
            />
          )}
          <button
            onClick={handleRegister}
            disabled={!selectedId || registering}
            className="text-xs bg-forest text-white rounded px-4 py-2.5 font-medium disabled:opacity-50"
          >
            {registering ? "…" : "Inscrire"}
          </button>
        </div>
      ) : (
        <p className="text-sage text-sm">
          {restrictedToQualifiedDay2
            ? "Aucun joueur qualifié restant à ajouter : tous les survivants du Day 1 sont déjà inscrits ici."
            : "Tous les membres actifs sont déjà inscrits (ou en liste d'attente) à cette manche."}
        </p>
      )}
    </div>
  );
}
