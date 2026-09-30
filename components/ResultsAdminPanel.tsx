"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; firstName: string; lastName: string; nickname: string };

type ResultRow = {
  id: string;
  memberId: string;
  position: number;
  points: number;
  kills: number;
  notes: string | null;
  member: Member;
};

type Round = {
  id: string;
  number: number;
  date: string;
  location: string;
  status: string;
  groupId: string | null;
  closed: boolean;
  registrations: { memberId: string; member: Member }[];
  results: ResultRow[];
};

// Ligne d'affichage du classement de la manche — purement lecture seule :
// place, points et kills sont désormais toujours dérivés automatiquement du
// journal des busts (voir lib/ranking.ts, syncPositionsFromBusts /
// syncKillsFromBusts), plus aucune saisie manuelle n'existe ici.
type Row = {
  memberId: string;
  nickname: string;
  position: number | null;
  points: number | null;
  kills: number | null;
};

type Bust = {
  id: string;
  bustedMemberId: string;
  bustedMember: { id: string; nickname: string };
  killerMemberId: string | null;
  killerMember: { id: string; nickname: string } | null;
  position: number;
};

// Le statut "clôturée" (vainqueur déterminé) est désormais calculé côté
// serveur — voir app/admin/resultats/page.tsx — car pour une manche groupée
// (Round.groupId, ex. Deepstack Day 1/Day 2) le Result ne vit que sur la
// manche canonique du groupe : seul le serveur, qui voit toutes les manches
// du groupe à la fois, peut répercuter correctement la clôture sur le Day 1
// une fois le Day 2 terminé. Une manche clôturée devient non sélectionnable
// pour la saisie afin d'éviter toute modification accidentelle a posteriori
// de son journal de busts (voir sélection ci-dessous et le verrouillage de la
// section "Journal des busts").

// Pour l'affichage du sélecteur : au sein d'un même groupe (ex. un
// Deepstack sur deux soirées), indique "Jour 1/2", "Jour 2/2", etc., en
// ordonnant les manches du groupe par date. Retourne null pour une manche
// autonome (pas de groupId).
function groupDayLabel(round: Round, allRounds: Round[]): string | null {
  if (!round.groupId) return null;
  const siblings = allRounds
    .filter((r) => r.groupId === round.groupId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const idx = siblings.findIndex((r) => r.id === round.id);
  if (idx === -1 || siblings.length < 2) return null;
  return `Jour ${idx + 1}/${siblings.length}`;
}

// Fusionne inscrits en ligne + participants ajoutés manuellement à la
// manche (voir addParticipant) avec les derniers résultats connus
// (liveResults, rechargés après chaque bust — voir loadResults) pour obtenir
// le classement affiché de la manche, toujours à jour.
function buildRows(round: Round, extra: Member[], liveResults: ResultRow[]): Row[] {
  const rows = new Map<string, Row>();

  for (const reg of round.registrations) {
    rows.set(reg.memberId, {
      memberId: reg.memberId,
      nickname: reg.member.nickname,
      position: null,
      points: null,
      kills: null,
    });
  }
  for (const m of extra) {
    if (!rows.has(m.id)) {
      rows.set(m.id, { memberId: m.id, nickname: m.nickname, position: null, points: null, kills: null });
    }
  }
  for (const r of liveResults) {
    rows.set(r.memberId, {
      memberId: r.memberId,
      nickname: r.member.nickname,
      position: r.position,
      points: r.points,
      kills: r.kills,
    });
  }

  return [...rows.values()].sort((a, b) => {
    const ap = a.position ?? Infinity;
    const bp = b.position ?? Infinity;
    if (ap !== bp) return ap - bp;
    return a.nickname.localeCompare(b.nickname);
  });
}

export default function ResultsAdminPanel({
  seasonLabel,
  initialRounds,
  members,
  initialRoundId,
  lockedRoundId,
}: {
  seasonLabel: string;
  initialRounds: Round[];
  members: Member[];
  // Manche à présélectionner à l'ouverture, ex. arrivée depuis le bouton
  // "Saisir un résultat" du calendrier ou d'une fiche manche
  // (/admin/resultats?manche=<id>) — voir app/admin/resultats/page.tsx.
  // Ignorée si la manche est déjà clôturée ou introuvable.
  initialRoundId?: string;
  // Si fourni (bureau/responsable, non admin), le sélecteur de manche est
  // masqué et la saisie reste bloquée sur cette manche : impossible de
  // basculer sur une autre. `initialRounds` ne contient alors, côté serveur,
  // que cette manche (et ses éventuelles sœurs de groupe) — voir
  // app/admin/resultats/page.tsx. Seul l'admin (lockedRoundId absent)
  // conserve le sélecteur complet.
  lockedRoundId?: string;
}) {
  const router = useRouter();
  const [rounds] = useState(initialRounds);
  // Sélectionne par défaut la manche demandée dans l'URL si elle est encore
  // ouverte à la saisie, sinon la première manche non clôturée (les manches
  // clôturées ne sont plus proposées à la saisie — voir round.closed,
  // calculé côté serveur dans app/admin/resultats/page.tsx). Verrouillée sur
  // lockedRoundId quand fourni, y compris si cette manche est déjà clôturée
  // (on affiche alors son journal en lecture seule plutôt que de basculer
  // silencieusement sur une autre manche).
  const [selectedRoundId, setSelectedRoundId] = useState<string>(() => {
    if (lockedRoundId) return lockedRoundId;
    const requested = initialRoundId ? rounds.find((r) => r.id === initialRoundId && !r.closed) : null;
    return requested?.id ?? rounds.find((r) => !r.closed)?.id ?? "";
  });
  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const [error, setError] = useState<string | null>(null);

  // ── Participants ajoutés manuellement (joueurs présents mais non inscrits
  // en ligne) et derniers résultats connus — rechargés après chaque bust
  // pour que le classement affiché reste toujours synchronisé.
  const [extraParticipants, setExtraParticipants] = useState<Member[]>([]);
  const [liveResults, setLiveResults] = useState<ResultRow[]>([]);
  const [addParticipantId, setAddParticipantId] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);

  const rows = useMemo(
    () => (selectedRound ? buildRows(selectedRound, extraParticipants, liveResults) : []),
    [selectedRound, extraParticipants, liveResults]
  );

  // ── Journal des busts ────────────────────────────────────────────
  const [busts, setBusts] = useState<Bust[]>([]);
  const [loadingBusts, setLoadingBusts] = useState(false);
  const [bustError, setBustError] = useState<string | null>(null);
  const [bustBustedId, setBustBustedId] = useState("");
  const [bustKillerId, setBustKillerId] = useState("");
  const [savingBust, setSavingBust] = useState(false);
  const [deletingBustId, setDeletingBustId] = useState<string | null>(null);

  async function loadBusts(roundId: string) {
    setLoadingBusts(true);
    setBustError(null);
    try {
      const res = await fetch(`/api/admin/busts?roundId=${roundId}`);
      const data = await res.json().catch(() => []);
      setBusts(res.ok ? data : []);
    } finally {
      setLoadingBusts(false);
    }
  }

  // Classement de la manche (place / points / kills), toujours à jour —
  // rechargé après chaque bust ajouté ou supprimé pour que la sélection
  // "A busté" / "Killé par" reste synchronisée avec ce qui est affiché.
  async function loadResults(roundId: string) {
    const res = await fetch(`/api/results?roundId=${roundId}`);
    const data = await res.json().catch(() => []);
    setLiveResults(res.ok ? data : []);
  }

  useEffect(() => {
    if (selectedRoundId) {
      loadBusts(selectedRoundId);
      loadResults(selectedRoundId);
    } else {
      setBusts([]);
      setLiveResults([]);
    }
    setBustBustedId("");
    setBustKillerId("");
    setExtraParticipants([]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoundId]);

  async function saveBust() {
    if (!selectedRound || !bustBustedId) return;
    if (!bustKillerId) {
      setBustError("Le killer est obligatoire.");
      return;
    }
    if (bustKillerId === bustBustedId) {
      setBustError("Un joueur ne peut pas s'être killé lui-même.");
      return;
    }
    setBustError(null);
    setSavingBust(true);
    const res = await fetch("/api/admin/busts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundId: selectedRound.id,
        bustedMemberId: bustBustedId,
        killerMemberId: bustKillerId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingBust(false);
    if (!res.ok) {
      setBustError(data.error || "L'enregistrement du bust a échoué.");
      return;
    }
    setBustBustedId("");
    setBustKillerId("");
    await Promise.all([loadBusts(selectedRound.id), loadResults(selectedRound.id)]);
    router.refresh();
  }

  async function deleteBust(id: string) {
    if (!selectedRound) return;
    setDeletingBustId(id);
    const res = await fetch(`/api/admin/busts?id=${id}`, { method: "DELETE" });
    setDeletingBustId(null);
    if (!res.ok) {
      setBustError("La suppression a échoué.");
      return;
    }
    await Promise.all([loadBusts(selectedRound.id), loadResults(selectedRound.id)]);
    router.refresh();
  }

  // Le journal des busts ne propose que les joueurs présents à cette manche
  // (inscrits, plus ceux ajoutés manuellement ci-dessous) — jamais tout le
  // fichier des membres — et retire au fur et à mesure les joueurs déjà
  // bustés : un joueur éliminé ne peut plus ni buster à son tour, ni être
  // désigné comme killer d'une élimination suivante puisqu'il n'est plus à
  // la table.
  const bustedMemberOptions = useMemo(() => {
    const alreadyBusted = new Set(busts.map((b) => b.bustedMemberId));
    return rows
      .map((r) => ({ id: r.memberId, nickname: r.nickname }))
      .filter((m) => !alreadyBusted.has(m.id))
      .sort((a, b) => a.nickname.localeCompare(b.nickname));
  }, [rows, busts]);

  function selectRound(id: string) {
    setSelectedRoundId(id);
  }

  const availableToAdd = useMemo(
    () => members.filter((m) => !rows.some((r) => r.memberId === m.id)),
    [members, rows]
  );

  // Manche clôturée (vainqueur déterminé) : le journal des busts, l'ajout de
  // joueur présent et la suppression de bust sont verrouillés en lecture
  // seule pour cette manche.
  const locked = selectedRound ? selectedRound.closed : false;

  async function addParticipant() {
    if (!selectedRound || !addParticipantId) return;
    setError(null);
    setAddingParticipant(true);
    const res = await fetch("/api/admin/round-registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId: selectedRound.id, memberId: addParticipantId }),
    });
    setAddingParticipant(false);
    if (!res.ok) {
      setError("L'ajout du joueur a échoué.");
      return;
    }
    const m = members.find((mm) => mm.id === addParticipantId);
    if (m) setExtraParticipants((xs) => [...xs, m]);
    setAddParticipantId("");
  }

  return (
    <div>
      {rounds.length === 0 ? (
        <div className="border border-ink/10 rounded-lg px-4 py-8 text-center text-sage text-sm">
          Aucune manche programmée pour la saison {seasonLabel}.
        </div>
      ) : (
        <>
          <div className="mb-8">
            <label className="text-xs uppercase tracking-wide text-sage mb-1 block">Manche</label>
            {lockedRoundId ? (
              // Bureau/responsable : pas de sélecteur, verrouillé sur la
              // manche pour laquelle ils sont arrivés ici (voir bouton
              // "Saisir un résultat" du calendrier / de la fiche manche).
              <div className="w-full sm:w-auto border border-ink/15 rounded px-3 py-2 text-sm bg-paper-dim">
                {selectedRound ? (
                  <>
                    Manche {selectedRound.number}
                    {groupDayLabel(selectedRound, rounds) ? ` (${groupDayLabel(selectedRound, rounds)})` : ""},{" "}
                    {new Date(selectedRound.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    ({selectedRound.location})
                    {selectedRound.closed && ", Clôturée"}
                  </>
                ) : (
                  "Manche introuvable."
                )}
              </div>
            ) : (
              <select
                value={selectedRoundId}
                onChange={(e) => selectRound(e.target.value)}
                className="w-full sm:w-auto border border-ink/15 rounded px-3 py-2 text-sm bg-white"
              >
                {rounds.map((r) => {
                  const dayLabel = groupDayLabel(r, rounds);
                  return (
                    <option key={r.id} value={r.id} disabled={r.closed}>
                      Manche {r.number}
                      {dayLabel ? ` (${dayLabel})` : ""},{" "}
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}{" "}
                      ({r.location}){" "}
                      {r.closed
                        ? ", Clôturée"
                        : r.results.length > 0
                        ? `, en cours (${r.results.length} bust(s))`
                        : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {!selectedRound && !lockedRoundId && rounds.every((r) => r.closed) && (
            <div className="border border-ink/10 rounded-lg px-4 py-8 text-center text-sage text-sm">
              Toutes les manches de cette saison sont clôturées. Leur journal
              de busts n&apos;est plus modifiable.
            </div>
          )}

          {selectedRound && (
            <>
              {error && (
                <div className="mb-6 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* ── Journal des busts ──────────────────────────── */}
              <div className="mb-10 border border-ink/10 rounded-lg p-5">
                <h2 className="text-base font-serif font-semibold mb-1">Journal des busts</h2>
                <p className="text-xs text-sage mb-4">
                  Pour chaque élimination : le pseudo qui bust et le pseudo
                  qui l&apos;a killé. Saisissez les busts dans
                  l&apos;ordre où ils se produisent. La place et les points
                  se calculent automatiquement à partir de cet ordre et du
                  barème de la saison (le premier bust prend la dernière
                  place, et ainsi de suite jusqu&apos;au vainqueur, placé 1er
                  dès qu&apos;il ne reste plus que lui), et se répercutent
                  aussitôt, avec les kills, dans le classement de la manche
                  ci-dessous.
                </p>

                {locked && (
                  <div className="mb-4 border border-amber-300 bg-amber-50 text-amber-800 text-sm rounded-lg px-4 py-2.5">
                    Cette manche est clôturée (un vainqueur a été déterminé).
                    Son journal de busts n&apos;est plus modifiable.
                  </div>
                )}

                {bustError && (
                  <div className="mb-4 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2.5">
                    {bustError}
                  </div>
                )}

                {loadingBusts ? (
                  <p className="text-sage text-sm mb-4">Chargement…</p>
                ) : busts.length > 0 ? (
                  <div className="overflow-x-auto border border-ink/10 rounded-lg mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-paper-dim text-left">
                          <th className="px-4 py-2 font-medium w-20">Place</th>
                          <th className="px-4 py-2 font-medium">A busté</th>
                          <th className="px-4 py-2 font-medium">Killé par</th>
                          <th className="px-4 py-2 font-medium w-24">&nbsp;</th>
                        </tr>
                      </thead>
                      <tbody>
                        {busts.map((b) => (
                          <tr key={b.id} className="border-t border-ink/10">
                            <td className="px-4 py-2 font-mono-club">{b.position}</td>
                            <td className="px-4 py-2 font-medium">{b.bustedMember.nickname}</td>
                            <td className="px-4 py-2 text-sage">{b.killerMember?.nickname ?? "—"}</td>
                            <td className="px-4 py-2">
                              {!locked && (
                                <button
                                  onClick={() => deleteBust(b.id)}
                                  disabled={deletingBustId === b.id}
                                  className="text-xs text-crimson underline underline-offset-2 disabled:opacity-50"
                                >
                                  {deletingBustId === b.id ? "…" : "Supprimer"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sage text-sm mb-4">Aucun bust saisi pour cette manche.</p>
                )}

                {!locked && (
                  <div className="flex flex-wrap items-end gap-2.5">
                    <div>
                      <label className="text-xs text-sage mb-1 block">A busté</label>
                      <select
                        value={bustBustedId}
                        onChange={(e) => setBustBustedId(e.target.value)}
                        className="border border-ink/15 rounded px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Choisir un joueur…</option>
                        {bustedMemberOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nickname}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-sage mb-1 block">Killé par</label>
                      <select
                        value={bustKillerId}
                        onChange={(e) => setBustKillerId(e.target.value)}
                        className="border border-ink/15 rounded px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Choisir le killer…</option>
                        {bustedMemberOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nickname}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={saveBust}
                      disabled={savingBust || !bustBustedId || !bustKillerId}
                      className="text-xs bg-forest text-white rounded px-4 py-2.5 font-medium disabled:opacity-50"
                    >
                      {savingBust ? "…" : "Ajouter le bust"}
                    </button>
                  </div>
                )}
              </div>

              {rows.length === 0 && (
                <div className="mb-8 border border-ink/10 rounded-lg px-4 py-6 text-center text-sage text-sm">
                  Aucun joueur inscrit à cette manche. Ajoutez-en un ci-dessous.
                </div>
              )}

              {!locked && availableToAdd.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={addParticipantId}
                    onChange={(e) => setAddParticipantId(e.target.value)}
                    className="border border-ink/15 rounded px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Ajouter un joueur présent, non inscrit en ligne…</option>
                    {availableToAdd.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nickname} ({m.firstName} {m.lastName})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addParticipant}
                    disabled={!addParticipantId || addingParticipant}
                    className="text-xs border border-ink/15 rounded px-3 py-2 disabled:opacity-50"
                  >
                    {addingParticipant ? "…" : "Ajouter"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <p className="text-[0.68rem] text-sage/70 mt-8">
        Le classement de la manche (place, points, kills) comme celui de la
        saison sont recalculés automatiquement après chaque bust saisi ou
        supprimé. Retrouvez-les sur la page{" "}
        <span className="font-medium">/classement</span>, qui propose
        désormais une sous-page dédiée à chaque manche.
      </p>
    </div>
  );
}
