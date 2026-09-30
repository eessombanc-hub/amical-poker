import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRankChanges } from "@/lib/ranking";
import { normalizeName } from "@/lib/jimdoSync";
import RankingPodium from "@/components/RankingPodium";
import RankingTable from "@/components/RankingTable";
import ClassementMancheSelect from "@/components/ClassementMancheSelect";
import LoginGate from "@/components/LoginGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Classement & palmarès",
  description:
    "Classement de la saison en cours et palmarès des saisons précédentes de l'Amical Poker Club, le club de poker de Villecresnes.",
  alternates: { canonical: "/classement" },
};

type LegacyRankingRow = { place: string; joueur: string; points: string; pj: string; tf: string };
// Classement "têtes" (KO), publié à côté du classement général sur le site
// historique — voir lib/jimdoSync.ts, syncClassement. Rapproché ici par nom
// aux lignes du classement général pour afficher une colonne Kills, comme
// sur le tableau interne (§ Ranking.totalKills).
type LegacyHeadsRow = { place: string; joueur: string; tetes: string; ratio: string };

export default async function ClassementPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <LoginGate
        title="Classement réservé aux connectés"
        description="Le classement et le palmarès du club sont réservés aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  const season = await prisma.season.findFirst({ where: { isActive: true } });
  // On affiche TOUS les classés, y compris les membres n'ayant pas encore
  // autorisé la publication de leurs résultats (RGPD) — les en exclure
  // faussait le classement (places qui sautent, podium incomplet ou faux).
  // Voir plus bas : leur pseudo est simplement masqué par "Privé", le reste
  // de la ligne (points, kills…) reste affiché pour que les chiffres du
  // classement restent exacts.
  const rankings = season
    ? await prisma.ranking.findMany({
        where: { seasonId: season.id },
        include: { member: true },
        orderBy: { totalPoints: "desc" },
      })
    : [];

  // Évolution de chaque place depuis la dernière manche jouée — voir
  // lib/ranking.ts, computeRankChanges.
  const rankChanges = season ? await computeRankChanges(season.id) : new Map<string, number>();

  // Classement parallèle Sit&Go (RoundFormat.SITNGO) — voir
  // lib/ranking.ts, recalculateSitngoRanking : jamais mélangé au classement
  // général ci-dessus. Pas d'évolution manche par manche affichée ici (à la
  // différence du classement général) : le Sit&Go se joue trop rarement
  // pour que cette flèche soit utile pour l'instant.
  const sitngoRankings = season
    ? await prisma.sitngoRanking.findMany({
        where: { seasonId: season.id },
        include: { member: true },
        orderBy: { totalPoints: "desc" },
      })
    : [];
  const sitngoRankingRows = sitngoRankings.map((r, i) => ({
    id: r.id,
    memberId: r.memberId,
    rank: i + 1,
    evolution: undefined,
    displayName: r.member.publicResults ? r.member.nickname : "Privé",
    isPublic: r.member.publicResults,
    totalPoints: r.totalPoints,
    participations: r.participations,
    wins: r.wins,
    podiums: r.podiums,
    totalKills: r.totalKills,
    totalBonusPoints: r.totalBonusPoints,
  }));

  // La rubrique Sit&Go doit rester visible (onglet + section) dès qu'un
  // Sit&Go est programmé cette saison, même avant que le premier ne soit
  // joué — sitngoRankingRows reste vide tant qu'aucun résultat n'est saisi
  // (voir lib/ranking.ts, recalculateSitngoRanking). Sans ce guard, l'onglet
  // disparaît complètement tant qu'aucun Sit&Go n'a encore été joué, ce qui
  // donne l'impression que la fonctionnalité n'existe pas.
  const hasSitngoRounds = season
    ? (await prisma.round.count({ where: { seasonId: season.id, format: "SITNGO" } })) > 0
    : false;
  const showSitngoSection = hasSitngoRounds || sitngoRankingRows.length > 0;

  // Vainqueur de la toute dernière manche jouée (toutes saisons confondues,
  // même principe que previousFormatWinner dans lib/ranking.ts) — son nom
  // est mis en valeur en or dans le tableau ci-dessous.
  const lastRoundWinner = await prisma.result.findFirst({
    where: { position: 1 },
    orderBy: { round: { date: "desc" } },
    select: { memberId: true },
  });

  // Lignes pour le tableau triable (voir components/RankingTable) — la
  // place officielle (rank) est figée ici par points, indépendamment du tri
  // d'affichage choisi par le visiteur.
  const rankingRows = rankings.map((r, i) => ({
    id: r.id,
    memberId: r.memberId,
    rank: i + 1,
    evolution: rankChanges.get(r.memberId),
    displayName: r.member.publicResults ? r.member.nickname : "Privé",
    isPublic: r.member.publicResults,
    totalPoints: r.totalPoints,
    participations: r.participations,
    wins: r.wins,
    podiums: r.podiums,
    totalKills: r.totalKills,
    totalBonusPoints: r.totalBonusPoints,
  }));

  // Tant que les manches de la saison ne sont pas ressaisies manche par
  // manche sur le nouveau site, on affiche le classement importé tel quel
  // depuis le site historique (voir lib/jimdoSync.ts, syncClassement).
  const legacySnapshot =
    rankings.length === 0 ? await prisma.legacyRankingSnapshot.findFirst() : null;
  const legacyRows = (legacySnapshot?.rows as LegacyRankingRow[] | null) ?? [];
  const legacyHeadsRows = (legacySnapshot?.headsRows as LegacyHeadsRow[] | null) ?? [];
  const legacyKillsByName = new Map(
    legacyHeadsRows.map((h) => [normalizeName(h.joueur), h.tetes])
  );

  const pastSeasons = await prisma.season.findMany({
    where: { isActive: false },
    orderBy: { startDate: "desc" },
    take: 8,
  });
  const palmares = await Promise.all(
    pastSeasons.map(async (s) => {
      // Idem : le champion réel de la saison est affiché même sans
      // consentement RGPD, avec son pseudo masqué par "Privé" le cas
      // échéant — sinon le palmarès désignerait le mauvais champion.
      const champion = await prisma.ranking.findFirst({
        where: { seasonId: s.id },
        include: { member: true },
        orderBy: { totalPoints: "desc" },
      });
      return { season: s, champion };
    })
  );
  const palmaresWithChampion = palmares.filter((p) => p.champion);

  // Sous-rubriques classement par événement (voir
  // app/classement/evenement/[id]) — tous les événements, passés et à venir.
  const events = await prisma.event.findMany({ orderBy: { date: "desc" } });

  // Pour le menu déroulant d'accès au classement d'une manche précise (voir
  // components/ClassementMancheSelect.tsx) : toutes les manches de la
  // saison, y compris celles déjà terminées — ce sont elles qui ont un
  // classement.
  const allRoundsThisSeason = season
    ? (
        await prisma.round.findMany({
          where: { seasonId: season.id },
          orderBy: { number: "asc" },
          select: { id: true, number: true, date: true, label: true },
        })
      ).map((r) => ({ id: r.id, number: r.number, date: r.date.toISOString(), label: r.label }))
    : [];

  const hasClassement = rankings.length > 0 || legacyRows.length > 0;

  return (
    <>
      {/* ── MASTHEAD ── mêmes codes que la Gazette / Stratégie : titre doré
          animé directement sur le fond dégradé sombre du site, pastilles de
          navigation rapide en dessous. Ici, teinte dominante brass/or —
          esprit "tableau des scores" plutôt que "une" éditoriale. ────────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/3 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(240,180,41,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
            Saison {season?.label ?? ""}
          </div>
          <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2 max-w-xl">
            Classement &amp; palmarès
          </h1>
          <p className="text-white/70 text-sm max-w-lg mb-7">
            Le tableau des scores de la saison, manche après manche, et les
            champions qui ont marqué l&apos;histoire du club.
          </p>

          <div className="flex flex-wrap gap-2 mb-2">
            {hasClassement && (
              <a
                href="#classement"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-brass/50 text-brass hover:bg-brass hover:text-ink transition-colors"
              >
                Classement
              </a>
            )}
            {showSitngoSection && (
              <a
                href="#classement-sitngo"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-brass/50 text-brass hover:bg-brass hover:text-ink transition-colors"
              >
                Sit&amp;Go
              </a>
            )}
            {events.length > 0 && (
              <a
                href="#evenements"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-forest text-forest-glow hover:bg-forest hover:text-white transition-colors"
              >
                Par événement
              </a>
            )}
            {palmaresWithChampion.length > 0 && (
              <a
                href="#palmares"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-brass/50 text-brass hover:bg-brass hover:text-ink transition-colors"
              >
                Palmarès
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-5xl mx-auto">
          {/* Barre d'outils : manche précise + barème des points — pastille
              translucide posée sur le fond sombre. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-white/5 border border-white/10 rounded-lg px-5 py-4 mb-8">
            <div className="flex flex-col gap-1.5">
              <ClassementMancheSelect rounds={allRoundsThisSeason} />
              {showSitngoSection && (
                <a
                  href="#classement-sitngo"
                  className="text-xs text-forest-glow underline underline-offset-4 font-medium"
                >
                  Voir le classement des Sit&amp;Go →
                </a>
              )}
            </div>
            <a
              href="/documents/bareme-points-apcv.xlsx"
              download
              className="inline-flex items-center gap-1.5 text-brass-light text-xs font-medium underline underline-offset-2"
            >
              📄 Barème des points (MTT / Deepstack) — fichier Excel
            </a>
          </div>

          <section id="classement" className="scroll-mt-24 mb-14">
            <p className={`text-white/60 text-sm ${rankings.length > 0 ? "mb-2" : "mb-6"}`}>
              Le pseudo des membres n&apos;ayant pas encore autorisé la publication de leurs résultats (RGPD) est masqué par « Privé ».
            </p>
            {rankings.length > 0 && (
              <p className="text-xs text-white/50 mb-6">
                <span className="text-forest-glow font-semibold">▲</span> progression,{" "}
                <span className="text-crimson font-semibold">▼</span> recul, évolution depuis la dernière manche jouée.
                {" · "}Cliquez sur un intitulé de colonne pour trier le tableau.
              </p>
            )}

            {rankings.length > 0 ? (
              <div className="card-hover bg-white text-ink border border-white/10 rounded-2xl p-6 sm:p-8">
                <RankingPodium
                  first={
                    rankings[0]
                      ? {
                          name: rankings[0].member.publicResults ? rankings[0].member.nickname : "Privé",
                          value: `${rankings[0].totalPoints} pts`,
                          memberId: rankings[0].member.publicResults ? rankings[0].memberId : undefined,
                        }
                      : null
                  }
                  second={
                    rankings[1]
                      ? {
                          name: rankings[1].member.publicResults ? rankings[1].member.nickname : "Privé",
                          value: `${rankings[1].totalPoints} pts`,
                          memberId: rankings[1].member.publicResults ? rankings[1].memberId : undefined,
                        }
                      : null
                  }
                  third={
                    rankings[2]
                      ? {
                          name: rankings[2].member.publicResults ? rankings[2].member.nickname : "Privé",
                          value: `${rankings[2].totalPoints} pts`,
                          memberId: rankings[2].member.publicResults ? rankings[2].memberId : undefined,
                        }
                      : null
                  }
                />
                <RankingTable rows={rankingRows} lastRoundWinnerId={lastRoundWinner?.memberId} />
              </div>
            ) : legacyRows.length > 0 ? (
              <div className="card-hover bg-white text-ink border border-white/10 rounded-2xl p-6 sm:p-8">
                <p className="text-xs text-sage mb-3">
                  Classement importé du{" "}
                  <a
                    href="https://amicalpokerclub.jimdofree.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    ancien site du club
                  </a>
                  . Le classement officiel du nouveau site prendra le relais dès que les manches y seront saisies.
                </p>
                <RankingPodium
                  first={legacyRows[0] ? { name: legacyRows[0].joueur, value: `${legacyRows[0].points} pts` } : null}
                  second={legacyRows[1] ? { name: legacyRows[1].joueur, value: `${legacyRows[1].points} pts` } : null}
                  third={legacyRows[2] ? { name: legacyRows[2].joueur, value: `${legacyRows[2].points} pts` } : null}
                />
                <div className="border border-ink/10 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-paper-dim text-left text-xs uppercase tracking-wide text-sage">
                        <th className="px-2 sm:px-4 py-2.5 sm:py-3">#</th>
                        <th className="px-2 sm:px-4 py-2.5 sm:py-3">Joueur</th>
                        <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-right">Points</th>
                        <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">Participations</th>
                        <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">Table finale</th>
                        {legacyHeadsRows.length > 0 && (
                          <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-right" title="Classement têtes (KO) de l'ancien site">
                            Kills
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {legacyRows.map((r) => (
                        <tr key={r.place} className="border-t border-ink/10">
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 font-mono-club">{r.place}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 font-medium">{r.joueur}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right font-mono-club">{r.points}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">{r.pj}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">{r.tf === "1" ? "✓" : ""}</td>
                          {legacyHeadsRows.length > 0 && (
                            <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right font-mono-club">
                              {legacyKillsByName.get(normalizeName(r.joueur)) ?? "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
                Le classement sera disponible après la première manche.
              </p>
            )}
          </section>

          {showSitngoSection && (
            <section id="classement-sitngo" className="scroll-mt-24 mb-14">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">Classement Sit&amp;Go</h2>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <p className="text-white/60 text-sm mb-6 max-w-xl">
                Classement parallèle, dédié aux Sit&amp;Go joués en marge des
                Day 2 de Deepstack — indépendant du classement général
                ci-dessus.
              </p>
              {sitngoRankingRows.length > 0 ? (
                <div className="card-hover bg-white text-ink border border-white/10 rounded-2xl p-6 sm:p-8">
                  <RankingPodium
                    first={
                      sitngoRankingRows[0]
                        ? {
                            name: sitngoRankingRows[0].displayName,
                            value: `${sitngoRankingRows[0].totalPoints} pts`,
                            memberId: sitngoRankingRows[0].isPublic ? sitngoRankingRows[0].memberId : undefined,
                          }
                        : null
                    }
                    second={
                      sitngoRankingRows[1]
                        ? {
                            name: sitngoRankingRows[1].displayName,
                            value: `${sitngoRankingRows[1].totalPoints} pts`,
                            memberId: sitngoRankingRows[1].isPublic ? sitngoRankingRows[1].memberId : undefined,
                          }
                        : null
                    }
                    third={
                      sitngoRankingRows[2]
                        ? {
                            name: sitngoRankingRows[2].displayName,
                            value: `${sitngoRankingRows[2].totalPoints} pts`,
                            memberId: sitngoRankingRows[2].isPublic ? sitngoRankingRows[2].memberId : undefined,
                          }
                        : null
                    }
                  />
                  <RankingTable rows={sitngoRankingRows} />
                </div>
              ) : (
                <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
                  Le classement Sit&amp;Go sera disponible après le premier Sit&amp;Go joué.
                </p>
              )}
            </section>
          )}

          {events.length > 0 && (
            <section id="evenements" className="scroll-mt-24 mb-14">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">Classement par événement</h2>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <p className="text-white/60 text-sm mb-6 max-w-xl">
                Les événements ponctuels du club, en dehors des manches habituelles.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {events.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/classement/evenement/${ev.id}`}
                    className="card-hover block bg-white text-ink border border-white/10 rounded-lg p-5"
                  >
                    <div className="text-sm font-serif font-semibold">{ev.name}</div>
                    <div className="text-xs text-sage mt-1">
                      {new Date(ev.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}
                      {ev.location}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {palmaresWithChampion.length > 0 && (
            <section id="palmares" className="scroll-mt-24 mb-14">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">Palmarès des saisons précédentes</h2>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <p className="text-white/60 text-sm mb-6 max-w-xl">
                Un coup d&apos;œil sur les champions qui ont marqué l&apos;histoire du club, saison après saison.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {palmaresWithChampion.map(({ season: s, champion }) => (
                  <div
                    key={s.id}
                    className="card-hover bg-white text-ink border border-white/10 rounded-lg p-5 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs uppercase tracking-wide text-sage mb-1">
                        Saison {s.label}
                      </div>
                      <div className="font-serif font-semibold">
                        {champion!.member.publicResults ? champion!.member.nickname : "Privé"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.65rem] uppercase tracking-widest text-burgundy font-semibold">
                        Champion 🏆
                      </div>
                      <div className="text-sm text-sage font-mono-club">{champion!.totalPoints} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
