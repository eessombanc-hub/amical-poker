import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Avatar from "@/components/Avatar";
import CancelRegistrationButton from "@/components/CancelRegistrationButton";
import AdminUnregisterButton from "@/components/AdminUnregisterButton";
import CfepaRoundRolesPanel, { type CfepaRegisteredPlayer } from "@/components/CfepaRoundRolesPanel";
import SitngoRegistrationPanel from "@/components/SitngoRegistrationPanel";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = {
  MTT: "MTT",
  DEEPSTACK: "Deepstack",
  CFEPA: "CFEPA",
  SITNGO: "Sit&Go",
};

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const round = await prisma.round.findUnique({ where: { id: params.id } });
  if (!round) return {};
  const label = round.label ?? `Manche ${round.number}`;
  return {
    title: `Joueurs inscrits, ${label}`,
    description: `Liste des joueurs inscrits à la manche du ${new Date(
      round.date
    ).toLocaleDateString("fr-FR")} de l'Amical Poker Club à Villecresnes.`,
    alternates: { canonical: `/calendrier/manche/${round.id}` },
  };
}

// Sous-page du calendrier listant, manche par manche, les joueurs inscrits
// au fur et à mesure des inscriptions (voir /api/rounds/[id]/register),
// avec avatar, dans l'ordre d'inscription. Le membre connecté y retrouve un
// bouton pour annuler sa propre inscription si besoin.
export default async function CalendrierManchePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const round = await prisma.round.findUnique({
    where: { id: params.id },
    include: {
      season: true,
      // Sit&Go (voir Round.linkedDeepstackRoundId) : affiché en tête de page
      // pour rappeler à quel Deepstack ce sit&go est lié.
      linkedDeepstackRound: { select: { id: true, label: true, number: true, date: true } },
    },
  });
  if (!round) notFound();

  const registrations = await prisma.roundRegistration.findMany({
    where: { roundId: round.id, status: { in: ["INSCRIT", "LISTE_ATTENTE"] } },
    include: { member: { select: { id: true, nickname: true, photoUrl: true } } },
    orderBy: { timestamp: "asc" },
  });
  // Joueurs inscrits : classés par ordre alphabétique pour faciliter la
  // recherche visuelle une fois la place confirmée. La liste d'attente,
  // elle, reste triée par ordre d'inscription (timestamp) : ce rang reflète
  // la priorité de promotion en cas de désistement, l'alphabétiser serait
  // trompeur.
  const inscrits = registrations
    .filter((r) => r.status === "INSCRIT")
    .sort((a, b) => a.member.nickname.localeCompare(b.member.nickname, "fr", { sensitivity: "base" }));
  const listeAttente = registrations.filter((r) => r.status === "LISTE_ATTENTE");

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;
  // Saisie des résultats : réservée au bureau, aux responsables et à l'admin
  // (voir app/admin/resultats/page.tsx, même contrôle d'accès côté serveur).
  const canEnterResults = hasRole(role, "RESPONSABLE");
  const currentMember = userId
    ? await prisma.member.findUnique({ where: { userId }, select: { id: true } })
    : null;
  const myRegistration = currentMember
    ? registrations.find((r) => r.memberId === currentMember.id)
    : null;

  // Attribution capitaine/matin/après-midi de l'Équipe CFEPA pour cette
  // manche — voir components/CfepaRoundRolesPanel.tsx, réservée aux manches
  // de format CFEPA. Le vivier proposé n'est PAS l'Équipe CFEPA entière mais
  // uniquement les membres déjà INSCRITS à cette manche précise (voir
  // `inscrits` ci-dessus) : seule l'inscription à cette manche donne accès à
  // la liste, comme demandé (voir aussi app/api/admin/cfepa-round-roles, qui
  // vérifie la même condition côté serveur). canEnterResults (RESPONSABLE+)
  // sert aussi de seuil pour l'édition ici, même logique que la saisie des
  // résultats.
  const isCfepaRound = round.format === "CFEPA";
  const cfepaRegisteredPlayers: CfepaRegisteredPlayer[] = isCfepaRound
    ? inscrits.map((r) => ({ id: r.memberId, nickname: r.member.nickname, photoUrl: r.member.photoUrl }))
    : [];
  const cfepaAssignments: { id: string; memberId: string; role: "CAPITAINE" | "MATIN" | "APRES_MIDI" }[] = isCfepaRound
    ? await prisma.cfepaRoundRole.findMany({
        where: { roundId: round.id },
        select: { id: true, memberId: true, role: true },
      })
    : [];
  const showCfepaSection = isCfepaRound && (canEnterResults || cfepaAssignments.length > 0);

  // Sit&Go (voir Round.linkedDeepstackRoundId, RoundFormat.SITNGO) : liste
  // des membres actifs éligibles à l'inscription, calculée côté serveur
  // (voir lib/ranking.ts, isEligibleForSitngo pour la même règle appliquée
  // un membre à la fois côté API) — un membre est éligible s'il n'est pas
  // déjà inscrit ICI, et s'il n'est pas actuellement engagé (inscrit et pas
  // encore busté) dans le Deepstack lié, Day 1 et Day 2 confondus (un
  // Deepstack sur deux soirées ne redemande pas d'inscription pour le
  // Day 2 — voir app/calendrier/page.tsx, isContinuationDay).
  const isSitngoRound = round.format === "SITNGO";
  let eligibleMembersForSitngo: { id: string; nickname: string; firstName: string; lastName: string }[] = [];
  if (isSitngoRound && canEnterResults && round.linkedDeepstackRoundId) {
    const linkedDeepstack = await prisma.round.findUnique({
      where: { id: round.linkedDeepstackRoundId },
      select: { id: true, groupId: true },
    });
    const groupRoundIds = linkedDeepstack
      ? linkedDeepstack.groupId
        ? (
            await prisma.round.findMany({ where: { groupId: linkedDeepstack.groupId }, select: { id: true } })
          ).map((r) => r.id)
        : [linkedDeepstack.id]
      : [];
    const [activeRegistrations, busts, allActiveMembers] = await Promise.all([
      groupRoundIds.length > 0
        ? prisma.roundRegistration.findMany({
            where: { roundId: { in: groupRoundIds }, status: "INSCRIT" },
            select: { memberId: true },
          })
        : Promise.resolve([]),
      groupRoundIds.length > 0
        ? prisma.roundBust.findMany({ where: { roundId: { in: groupRoundIds } }, select: { bustedMemberId: true } })
        : Promise.resolve([]),
      prisma.member.findMany({
        where: { membershipStatus: "ACTIF" },
        orderBy: { nickname: "asc" },
        select: { id: true, nickname: true, firstName: true, lastName: true },
      }),
    ]);
    const bustedIds = new Set(busts.map((b) => b.bustedMemberId));
    const stillInDeepstackIds = new Set(
      activeRegistrations.map((r) => r.memberId).filter((id) => !bustedIds.has(id))
    );
    const alreadyInSitngoIds = new Set(registrations.map((r) => r.memberId));
    eligibleMembersForSitngo = allActiveMembers.filter(
      (m) => !stillInDeepstackIds.has(m.id) && !alreadyInSitngoIds.has(m.id)
    );
  }

  return (
    <div className="px-7 py-14">
      <div className="max-w-2xl mx-auto panel">
        <Link
          href="/calendrier"
          className="text-sage text-xs font-medium mb-6 inline-block underline underline-offset-4"
        >
          ← Calendrier
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
          <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold">
            Saison {round.season.label}
          </div>
          {/* Une manche CFEPA ne fait pas partie du tournoi interne du club
              (pas de classement/points associés) : pas de saisie de
              résultat pour elle. */}
          {canEnterResults && !isCfepaRound && (
            <Link
              href={`/admin/resultats?manche=${round.id}`}
              className="bg-forest/10 text-forest border border-forest/30 rounded px-3.5 py-1.5 text-xs font-medium"
            >
              Saisir un résultat →
            </Link>
          )}
        </div>
        <h1 className="text-3xl mb-2">{round.label ?? `Manche ${round.number}`}</h1>
        <p className="text-sage text-sm mb-8">
          {new Date(round.date).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {" · "}
          {round.location}
          {" · "}
          {FORMAT_LABEL[round.format] ?? round.format}
        </p>

        {isSitngoRound && round.linkedDeepstackRound && (
          <p className="text-xs text-sage mb-6">
            Sit&amp;Go joué en marge du{" "}
            <Link
              href={`/calendrier/manche/${round.linkedDeepstackRound.id}`}
              className="underline underline-offset-2 text-forest-2 font-medium"
            >
              {round.linkedDeepstackRound.label ?? `Manche ${round.linkedDeepstackRound.number}`}
            </Link>
            . Inscriptions réservées au bureau/responsables/admin, uniquement
            pour les joueurs qui ne participent pas, ou plus, à ce Deepstack.
          </p>
        )}

        {isSitngoRound && canEnterResults && (
          <SitngoRegistrationPanel roundId={round.id} eligibleMembers={eligibleMembersForSitngo} />
        )}

        {myRegistration && (
          <CancelRegistrationButton
            roundId={round.id}
            status={myRegistration.status as "INSCRIT" | "LISTE_ATTENTE"}
          />
        )}

        {showCfepaSection && (
          <>
            <h2 className="text-base font-serif font-semibold mb-3">
              Équipe CFEPA — capitaine, matin &amp; après-midi
            </h2>
            <CfepaRoundRolesPanel
              roundId={round.id}
              registeredPlayers={cfepaRegisteredPlayers}
              initialAssignments={cfepaAssignments}
              isModerator={canEnterResults}
            />
          </>
        )}

        <h2 className="text-base font-serif font-semibold mb-3">
          Joueurs inscrits{inscrits.length > 0 && ` (${inscrits.length}/${round.maxSeats})`}
        </h2>
        {inscrits.length > 0 ? (
          <ul className="space-y-2 mb-8">
            {inscrits.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center gap-3 border border-ink/10 rounded-lg px-3.5 py-2.5"
              >
                <span className="text-xs text-sage/70 font-mono-club w-5">{i + 1}</span>
                <Avatar photoUrl={r.member.photoUrl} name={r.member.nickname} size={32} />
                <span className="text-sm font-medium">{r.member.nickname}</span>
                {canEnterResults && (
                  <span className="ml-auto">
                    <AdminUnregisterButton roundId={round.id} memberId={r.memberId} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sage text-sm mb-8">Aucun joueur inscrit pour l&apos;instant.</p>
        )}

        {listeAttente.length > 0 && (
          <>
            <h2 className="text-base font-serif font-semibold mb-3">
              Liste d&apos;attente ({listeAttente.length})
            </h2>
            <ul className="space-y-2">
              {listeAttente.map((r, i) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 border border-ink/10 rounded-lg px-3.5 py-2.5"
                >
                  <span className="text-xs text-sage/70 font-mono-club w-5">{i + 1}</span>
                  <Avatar photoUrl={r.member.photoUrl} name={r.member.nickname} size={32} />
                  <span className="text-sm font-medium">{r.member.nickname}</span>
                  {canEnterResults && (
                    <span className="ml-auto">
                      <AdminUnregisterButton roundId={round.id} memberId={r.memberId} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
