import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RoundResultsTable from "@/components/RoundResultsTable";
import LoginGate from "@/components/LoginGate";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = {
  MTT: "MTT",
  DEEPSTACK: "Deepstack",
  CFEPA: "CFEPA",
};

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const round = await prisma.round.findUnique({
    where: { id: params.id },
    include: { season: true },
  });
  if (!round) return {};
  const label = round.label ?? `Manche ${round.number}`;
  return {
    title: `Classement, ${label} (${round.season.label})`,
    description: `Classement de la manche ${round.number} de l'Amical Poker Club, disputée le ${new Date(
      round.date
    ).toLocaleDateString("fr-FR")} à ${round.location}.`,
    alternates: { canonical: `/classement/manche/${round.id}` },
  };
}

// Sous-page de classement dédiée à une manche — voir /classement. Remplace
// le tableau qui s'affichait autrefois dans /admin/resultats (désormais
// réservé au journal des busts) : ce classement, lui, est public et respecte
// la même règle RGPD que la page /classement (résultats visibles seulement
// pour les membres ayant autorisé leur publication).
export default async function ClassementManchePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <LoginGate
        title="Classement réservé aux connectés"
        description="Le classement d'une manche est réservé aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  const round = await prisma.round.findUnique({
    where: { id: params.id },
    include: {
      season: true,
      results: {
        // Tous les résultats, y compris les membres sans consentement RGPD
        // (pseudo masqué par "Privé" à l'affichage) — les exclure créerait
        // des trous dans les places affichées. Voir /classement.
        include: { member: { select: { id: true, nickname: true, publicResults: true } } },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!round) notFound();

  // Manche groupée (ex. Deepstack Day 1/Day 2, voir Round.groupId) : le
  // classement (Result) ne vit que sur la manche la plus récente du groupe
  // (la "canonique") — voir lib/ranking.ts. Si cette manche-ci n'est pas la
  // canonique, on ne veut pas afficher "aucun résultat" (trompeur, puisque le
  // tournoi peut très bien être terminé) : on redirige vers la page de la
  // manche canonique, qui porte le classement combiné des deux journées.
  let canonicalRound: { id: string; number: number; label: string | null } | null = null;
  let groupRoundIds = [round.id];
  if (round.groupId) {
    const siblings = await prisma.round.findMany({
      where: { groupId: round.groupId, seasonId: round.seasonId },
      select: { id: true, number: true, date: true, label: true },
    });
    groupRoundIds = siblings.map((r) => r.id);
    const canonical = siblings.reduce((latest, r) => (r.date > latest.date ? r : latest), siblings[0]);
    if (canonical && canonical.id !== round.id) {
      canonicalRound = canonical;
    }
  }

  // Qui a éliminé qui (voir prisma/schema.prisma, RoundBust) — pour la
  // colonne "Killé par" du tableau ci-dessous. Les busts d'une manche
  // groupée peuvent être répartis sur le Day 1 ET le Day 2 alors que les
  // Result ne vivent que sur la manche canonique : on interroge donc tout
  // le groupe. killerMemberId est nul quand l'éliminé n'a pas été killé par
  // un autre joueur identifié (ex. élimination par les blindes) — le
  // vainqueur, lui, n'a simplement aucune ligne de bust (jamais busté).
  const busts = canonicalRound
    ? []
    : await prisma.roundBust.findMany({
        where: { roundId: { in: groupRoundIds } },
        select: {
          bustedMemberId: true,
          killerMemberId: true,
          killerMember: { select: { nickname: true, publicResults: true } },
        },
      });
  const killerByBustedId = new Map(busts.map((b) => [b.bustedMemberId, b]));

  return (
    <div className="px-7 py-14">
      <div className="max-w-2xl mx-auto panel">
        <Link
          href="/classement"
          className="text-sage text-xs font-medium mb-6 inline-block underline underline-offset-4"
        >
          ← Classement
        </Link>
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Saison {round.season.label}
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

        {canonicalRound ? (
          <div className="border border-ink/10 rounded-lg px-4 py-8 text-center text-sage text-sm">
            Cette manche fait partie d&apos;un tournoi sur deux soirées. Son
            classement combiné se trouve sur la page de la{" "}
            <Link
              href={`/classement/manche/${canonicalRound.id}`}
              className="text-burgundy font-medium underline underline-offset-4"
            >
              {canonicalRound.label ?? `Manche ${canonicalRound.number}`}
            </Link>
            .
          </div>
        ) : round.results.length > 0 ? (
          <>
            <p className="text-xs text-sage/80 mb-3">Cliquez sur un intitulé de colonne pour trier le tableau.</p>
            <RoundResultsTable
              rows={round.results.map((r) => {
                const bust = killerByBustedId.get(r.member.id);
                const killerName = !bust
                  ? null
                  : !bust.killerMemberId
                  ? "Blindes"
                  : bust.killerMember?.publicResults
                  ? bust.killerMember.nickname
                  : "Privé";
                return {
                  id: r.id,
                  memberId: r.member.id,
                  position: r.position,
                  displayName: r.member.publicResults ? r.member.nickname : "Privé",
                  isPublic: r.member.publicResults,
                  points: r.points,
                  bonusPoints: r.bonusPoints,
                  kills: r.kills,
                  killerName,
                };
              })}
            />
          </>
        ) : (
          <div className="border border-ink/10 rounded-lg px-4 py-8 text-center text-sage text-sm">
            Aucun résultat pour cette manche pour l&apos;instant.
          </div>
        )}

        <p className="text-[0.68rem] text-sage/70 mt-4">
          Le pseudo des membres n&apos;ayant pas encore autorisé la publication
          de leurs résultats (RGPD) est masqué par « Privé ».
        </p>
      </div>
    </div>
  );
}
