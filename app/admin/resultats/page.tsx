import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ResultsAdminPanel from "@/components/ResultsAdminPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminResultatsPage(props: {
  searchParams?: Promise<{ manche?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "RESPONSABLE")) redirect("/espace-membre");

  // L'admin garde accès à la saisie de toutes les manches (sélecteur complet,
  // comme avant). Le bureau et les responsables, eux, ne peuvent saisir que
  // la manche pour laquelle ils sont arrivés ici — via le bouton "Saisir un
  // résultat" du calendrier ou d'une fiche manche (?manche=<id>) — sans
  // pouvoir basculer sur une autre manche : on exige donc ce paramètre et on
  // ne charge que la manche demandée (et ses éventuelles manches sœurs de
  // groupe, ex. Deepstack Day 1/2, pour un statut "clôturée" correct).
  const isAdmin = hasRole(role, "ADMIN");
  const requestedRoundId = searchParams?.manche;
  if (!isAdmin && !requestedRoundId) redirect("/calendrier");

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });

  const roundInclude = {
    season: { select: { label: true } },
    registrations: {
      where: { status: "INSCRIT" as const },
      include: { member: { select: { id: true, firstName: true, lastName: true, nickname: true } } },
    },
    results: {
      include: { member: { select: { id: true, firstName: true, lastName: true, nickname: true } } },
    },
  };

  // Une manche CFEPA ne fait pas partie du tournoi interne du club (pas de
  // classement/points associés, voir lib/ranking.ts) : jamais proposée ici,
  // ni pour l'admin (sélecteur complet) ni pour un accès verrouillé sur une
  // manche précise (lien "Saisir un résultat", retiré pour ce format — voir
  // app/calendrier/page.tsx et app/calendrier/manche/[id]/page.tsx).
  const rawRounds = isAdmin
    ? activeSeason
      ? await prisma.round.findMany({
          where: { seasonId: activeSeason.id, format: { not: "CFEPA" } },
          orderBy: { date: "desc" },
          include: roundInclude,
        })
      : []
    : await (async () => {
        const targetRound = await prisma.round.findUnique({
          where: { id: requestedRoundId! },
          select: { groupId: true, format: true },
        });
        if (!targetRound || targetRound.format === "CFEPA") redirect("/calendrier");
        return prisma.round.findMany({
          where: targetRound.groupId
            ? { OR: [{ id: requestedRoundId! }, { groupId: targetRound.groupId }] }
            : { id: requestedRoundId! },
          orderBy: { date: "desc" },
          include: roundInclude,
        });
      })();

  // Une manche est "clôturée" (verrouillée à la saisie) dès qu'un vainqueur
  // (place 1) existe pour son tournoi — voir lib/ranking.ts. Pour une manche
  // groupée (Round.groupId, ex. Deepstack Day 1/Day 2), le Result ne vit que
  // sur la manche canonique du groupe (le Day 2) : on calcule donc d'abord
  // qui, dans chaque groupe, a déjà un vainqueur, puis on répercute ce statut
  // sur TOUTES les manches du groupe (Day 1 y compris) pour qu'elles se
  // verrouillent ensemble une fois le tournoi terminé.
  const groupHasWinner = new Map<string, boolean>();
  for (const r of rawRounds) {
    if (r.groupId && r.results.some((res) => res.position === 1)) {
      groupHasWinner.set(r.groupId, true);
    }
  }
  const rounds = rawRounds.map((r) => ({
    ...r,
    closed: r.results.some((res) => res.position === 1) || (r.groupId ? !!groupHasWinner.get(r.groupId) : false),
  }));

  const members = await prisma.member.findMany({
    where: { membershipStatus: "ACTIF" },
    orderBy: { nickname: "asc" },
    select: { id: true, firstName: true, lastName: true, nickname: true },
  });

  // Pour le bureau/responsable (verrouillé sur une manche), le libellé de
  // saison vient de la manche elle-même — utile même si elle appartient à
  // une saison qui n'est plus "active". Pour l'admin, on garde la saison
  // active affichée comme avant.
  const seasonLabel = isAdmin ? activeSeason?.label : rounds[0]?.season.label ?? activeSeason?.label;
  const canRenderPanel = isAdmin ? !!activeSeason : rounds.length > 0;

  return (
    <div className="px-7 py-14">
      <div className="max-w-5xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Saisie des résultats</h1>
        <p className="text-sage text-sm mb-8 max-w-2xl">
          {isAdmin
            ? <>Choisissez une manche puis saisissez le journal des busts</>
            : <>Saisissez le journal des busts de cette manche</>}
          {" "}: le pseudo qui élimine, le pseudo qui l&apos;a killé. La place, les
          points et les kills se calculent automatiquement à partir de cet
          ordre. Plus aucune saisie manuelle de place, points ou kills.
          Le classement de la manche et celui de la saison (points,
          victoires, podiums, kills) sont recalculés automatiquement à
          chaque bust saisi ou supprimé, et consultables sur la page
          publique <span className="font-medium">/classement</span>.
        </p>
        {canRenderPanel ? (
          <ResultsAdminPanel
            seasonLabel={seasonLabel ?? ""}
            initialRounds={JSON.parse(JSON.stringify(rounds))}
            members={JSON.parse(JSON.stringify(members))}
            initialRoundId={searchParams?.manche}
            lockedRoundId={isAdmin ? undefined : requestedRoundId}
          />
        ) : (
          <div className="border border-ink/10 rounded-lg px-4 py-8 text-center text-sage text-sm">
            Aucune saison active. Créez d&apos;abord une saison pour pouvoir y
            rattacher des manches et des résultats.
          </div>
        )}
      </div>
    </div>
  );
}
