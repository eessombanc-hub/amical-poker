import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewsTicker, { type TickerItem } from "@/components/NewsTicker";
import MarkSectionSeen from "@/components/MarkSectionSeen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gazette Poker",
  description:
    "L'actualité du poker et du sport, sélectionnée pour la communauté de l'Amical Poker Club — résultats, performances, portraits et événements.",
  alternates: {
    canonical: "/poker-news",
    // Permet aux lecteurs de flux et à certains outils de découvrir
    // automatiquement /poker-news/rss.xml (voir app/poker-news/rss.xml/route.ts).
    types: { "application/rss+xml": "/poker-news/rss.xml" },
  },
};

const CATEGORIES = ["Circuit", "Résultats", "Stratégie", "Interviews", "Online", "Casino", "Sport", "Divers"];

const MEDALS = ["🥇", "🥈", "🥉"];

// Sélection d'événements poker majeurs (circuit européen/international) à
// affiner au fil de l'année — sert de repère pour les membres en plus du
// calendrier propre au club.
const UPCOMING_EVENTS = [
  {
    name: "WSOP Circuit Paris",
    place: "Paris",
    period: "Automne 2026",
    note: "Étape parisienne du circuit mondial, plusieurs bracelets à la clé.",
  },
  {
    name: "Barrière Poker Tour",
    place: "Casino Barrière Enghien-les-Bains",
    period: "Toute l'année",
    note: "Étapes régulières du circuit Barrière, format accessible.",
  },
  {
    name: "UltraStack Series",
    place: "Casino Barrière Enghien-les-Bains",
    period: "Plusieurs sessions/an",
    note: "Format deepstack à petite mise, apprécié des joueurs de club.",
  },
  {
    name: "EPT Paris",
    place: "Paris",
    period: "Février",
    note: "Étape de l'European Poker Tour, le rendez-vous phare en France.",
  },
];

async function getNews() {
  try {
    return await prisma.pokerNewsItem.findMany({
      where: { status: "PUBLIE" },
      orderBy: { publishedAt: "desc" },
    });
  } catch {
    return [];
  }
}

async function getClubPerformances() {
  try {
    const season = await prisma.season.findFirst({ where: { isActive: true } });
    if (!season) return { season: null, topRankings: [], lastRound: null, sitngoRankings: [] };

    const topRankings = await prisma.ranking.findMany({
      where: { seasonId: season.id, member: { publicResults: true } },
      include: { member: true },
      orderBy: { totalPoints: "desc" },
      take: 3,
    });

    const lastRound = await prisma.round.findFirst({
      where: { seasonId: season.id, status: "TERMINEE" },
      orderBy: { date: "desc" },
      include: {
        results: {
          where: { position: 1, member: { publicResults: true } },
          include: { member: true },
        },
      },
    });

    // Classement Sit&Go (voir /classement, section dédiée) — repris ici en
    // aperçu (top 3) dans la même logique que "Top classement en cours"
    // ci-dessous, avec un lien vers le classement complet.
    const sitngoRankings = await prisma.sitngoRanking.findMany({
      where: { seasonId: season.id, member: { publicResults: true } },
      include: { member: true },
      orderBy: { totalPoints: "desc" },
      take: 3,
    });

    return { season, topRankings, lastRound, sitngoRankings };
  } catch {
    return { season: null, topRankings: [], lastRound: null, sitngoRankings: [] };
  }
}

async function getPortraits() {
  try {
    return await prisma.portrait.findMany({
      where: { published: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: 2,
    });
  } catch {
    return [];
  }
}

function formatDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

type NewsItem = Awaited<ReturnType<typeof getNews>>[number];

// Une section "actus" pour une catégorie donnée (ex. Circuit, Résultats…) —
// factorisée pour être affichée à la fois en premier (Circuit, voir plus
// bas) et pour le reste des catégories en bas de page. Les cartes sont en
// blanc (lisibilité) posées directement sur le fond sombre de la page, façon
// site sportif : d'où le bg-white/text-ink explicites (plus de grand panneau
// clair englobant toute la page comme avant).
function CategorySection({ category, items }: { category: string; items: NewsItem[] }) {
  return (
    <section id={`cat-${category}`} className="scroll-mt-24 mb-14">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-xl md:text-2xl font-serif font-semibold">{category}</h2>
        <span className="h-px flex-1 bg-white/15" />
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {items.map((n) => (
          <Link
            key={n.id}
            href={`/poker-news/${n.id}`}
            className="card-hover group block bg-white text-ink border border-white/10 rounded-lg overflow-hidden"
          >
            <div
              className="h-36 bg-paper-dim flex items-center justify-center text-forest/20 text-5xl font-serif"
              style={
                n.imageUrl
                  ? { backgroundImage: `url(${n.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : undefined
              }
            >
              {!n.imageUrl && "♠"}
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 text-[0.62rem] tracking-widest uppercase font-semibold mb-2">
                <span className="bg-crimson/10 text-crimson-dark px-2 py-0.5 rounded">{n.category}</span>
                <span className="text-sage">{n.sourceName}</span>
              </div>
              <h3 className="text-base font-serif font-semibold leading-snug mb-2 group-hover:text-forest-2 transition-colors">
                {n.title}
              </h3>
              <p className="text-sage text-sm line-clamp-3">{n.summary}</p>
              <div className="text-[0.68rem] text-sage/70 mt-3 font-mono-club">
                {formatDate(n.publishedAt)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function PokerNewsPage() {
  const session = await getServerSession(authOptions);
  const isMember = session?.user
    ? !!(await prisma.member.findUnique({ where: { userId: (session.user as any).id as string } }))
    : false;

  // Gazette Poker rendue publique (voir audit-site-apcv.md) : les actus
  // poker n'ont aucune raison d'être réservées aux connectés — seules les
  // pages avec des données propres aux membres (classement, espace membre)
  // le restent. "Proposer une actu" reste réservé aux membres (isMember).
  const [news, { season, topRankings, lastRound, sitngoRankings }, portraits] = await Promise.all([
    getNews(),
    getClubPerformances(),
    getPortraits(),
  ]);
  // Le bandeau "en direct" et l'article mis en avant ne doivent pas être
  // noyés par l'actu sport généraliste (catégorie "Sport", flux L'Équipe) :
  // elle reste consultable dans sa propre section plus bas (byCategory),
  // mais ne doit pas passer devant les vraies actus poker en tête de page.
  const highlightPool = news.filter((n) => n.category !== "Sport");
  const featured = highlightPool[0] ?? news[0];
  const rest = news.filter((n) => n.id !== featured?.id);

  const tickerItems: TickerItem[] = highlightPool.slice(0, 8).map((n) => ({
    id: n.id,
    title: n.title,
    category: n.category,
    sourceName: n.sourceName,
    sourceUrl: n.sourceUrl,
    summary: n.summary,
    imageUrl: n.imageUrl,
  }));

  const byCategory = CATEGORIES.map((cat) => ({
    category: cat,
    items: rest.filter((n) => n.category === cat),
  })).filter((g) => g.items.length > 0);

  // Ordre demandé sur la page : les infos Circuit d'abord, puis les
  // performances du club, puis les événements à venir. Le reste des
  // catégories (Résultats, Stratégie, etc.) suit en bas de page comme avant.
  const circuitGroup = byCategory.find((g) => g.category === "Circuit") ?? null;
  const otherCategories = byCategory.filter((g) => g.category !== "Circuit");

  const winner = lastRound?.results[0];
  const hasPerformances = topRankings.length > 0 || !!winner || sitngoRankings.length > 0;

  return (
    <>
      <MarkSectionSeen section="poker-news" />
      <NewsTicker items={tickerItems} />

      {/* ── MASTHEAD ── directement sur le fond dégradé sombre du site,
          façon "une" de site sportif : gros titre doré animé, bandeau de
          navigation rapide par catégorie/rubrique juste en dessous. ────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(240,180,41,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
                Le mag du club
              </div>
              <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl">Gazette Poker</h1>
              <p className="text-white/70 text-sm mt-3 max-w-lg">
                L&apos;actualité du poker et du sport, sélectionnée pour la
                communauté.
              </p>
            </div>
            {isMember && (
              <Link
                href="/proposer-contenu?type=ACTU_POKER"
                className="text-xs text-forest-glow underline underline-offset-4 font-medium whitespace-nowrap"
              >
                Proposer une actu →
              </Link>
            )}
          </div>

          {byCategory.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {byCategory.map((g) => (
                <a
                  key={g.category}
                  href={`#cat-${g.category}`}
                  className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-brass/50 text-brass hover:bg-brass hover:text-ink transition-colors"
                >
                  {g.category}
                </a>
              ))}
              <a
                href="#performances"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-forest text-forest-glow hover:bg-forest hover:text-white transition-colors"
              >
                Performances
              </a>
              <a
                href="#evenements"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-forest text-forest-glow hover:bg-forest hover:text-white transition-colors"
              >
                Événements
              </a>
            </div>
          )}
        </div>
      </section>

      {news.length === 0 && (
        <section className="px-7 pb-14">
          <div className="max-w-6xl mx-auto">
            <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
              Aucune actu publiée pour le moment. Revenez bientôt !
            </p>
          </div>
        </section>
      )}

      {/* ── ARTICLE À LA UNE ── carte "cover story" sombre et contrastée,
          posée directement sur le fond du site (pas de panneau clair). ──── */}
      {featured && (
        <section className="px-7 pb-4">
          <div className="max-w-6xl mx-auto">
            <Link
              href={`/poker-news/${featured.id}`}
              className="card-hover group grid md:grid-cols-2 gap-0 bg-noir border border-white/10 rounded-2xl overflow-hidden"
            >
              <div
                className="h-56 md:h-full bg-gradient-to-br from-noir via-crimson-dark to-noir flex items-center justify-center text-white/10 text-8xl font-serif"
                style={
                  featured.imageUrl
                    ? {
                        backgroundImage: `url(${featured.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                {!featured.imageUrl && "♠"}
              </div>
              <div className="p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[0.65rem] tracking-widest uppercase font-semibold mb-3">
                  <span className="bg-crimson text-white px-2 py-1 rounded">
                    {featured.category}
                  </span>
                  <span className="text-white/50">
                    {featured.sourceName} · {formatDate(featured.publishedAt)}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-semibold leading-snug mb-3 text-white group-hover:text-brass-light transition-colors">
                  {featured.title}
                </h2>
                <p className="text-white/70 text-sm leading-relaxed">{featured.summary}</p>
                <span className="text-brass-light text-sm font-medium mt-4 underline underline-offset-4">
                  Lire l&apos;article →
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      <div className="px-7 py-10">
        <div className="max-w-6xl mx-auto">
          {/* Infos Circuit — mises en avant en premier */}
          {circuitGroup && <CategorySection category={circuitGroup.category} items={circuitGroup.items} />}

          {/* Performances du club — façon tableau de scores de site sportif */}
          <section id="performances" className="scroll-mt-24 mb-14">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-serif font-semibold">Performances du club</h2>
              <span className="h-px flex-1 bg-white/15" />
              {season && (
                <span className="text-[0.65rem] tracking-widest uppercase text-brass font-medium">
                  Saison {season.label}
                </span>
              )}
            </div>

            {hasPerformances ? (
              <div className="grid md:grid-cols-2 gap-5">
                {topRankings.length > 0 && (
                  <div className="card-hover bg-white text-ink rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-2 text-[0.62rem] tracking-widest uppercase text-forest-2 font-bold mb-4">
                      <span className="inline-block w-2 h-2 rounded-full bg-forest animate-badge-pulse" />
                      Top classement en cours
                    </div>
                    <div className="space-y-3">
                      {topRankings.map((r, i) => (
                        <div key={r.id} className="flex items-center gap-3">
                          <span className="text-xl w-7 flex-shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">
                              {r.member.firstName} {r.member.nickname ? `« ${r.member.nickname} »` : ""}
                            </div>
                            <div className="text-xs text-sage">
                              {r.totalPoints} pts · {r.participations} manche(s) · {r.wins} victoire(s)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/classement"
                      className="inline-block mt-5 text-forest-2 text-xs font-medium underline underline-offset-4"
                    >
                      Voir le classement complet →
                    </Link>
                  </div>
                )}

                {winner && lastRound && (
                  <div className="card-hover bg-white text-ink rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-2 text-[0.62rem] tracking-widest uppercase text-crimson font-bold mb-4">
                      <span className="inline-block w-2 h-2 rounded-full bg-crimson animate-badge-pulse" />
                      Dernière manche · Manche {lastRound.number}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-7 flex-shrink-0">🏆</span>
                      <div>
                        <div className="font-medium text-sm">
                          {winner.member.firstName} {winner.member.nickname ? `« ${winner.member.nickname} »` : ""}
                        </div>
                        <div className="text-xs text-sage">
                          Vainqueur du {new Date(lastRound.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}{" "}
                          à {lastRound.location}
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/resultats"
                      className="inline-block mt-5 text-crimson text-xs font-medium underline underline-offset-4"
                    >
                      Voir tous les résultats →
                    </Link>
                  </div>
                )}

                {sitngoRankings.length > 0 && (
                  <div className="card-hover bg-white text-ink rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-2 text-[0.62rem] tracking-widest uppercase text-brass-light font-bold mb-4">
                      <span className="inline-block w-2 h-2 rounded-full bg-brass animate-badge-pulse" />
                      Top classement Sit&amp;Go
                    </div>
                    <div className="space-y-3">
                      {sitngoRankings.map((r, i) => (
                        <div key={r.id} className="flex items-center gap-3">
                          <span className="text-xl w-7 flex-shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">
                              {r.member.firstName} {r.member.nickname ? `« ${r.member.nickname} »` : ""}
                            </div>
                            <div className="text-xs text-sage">
                              {r.totalPoints} pts · {r.participations} sit&amp;go(s) · {r.wins} victoire(s)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/classement#classement-sitngo"
                      className="inline-block mt-5 text-brass-light text-xs font-medium underline underline-offset-4"
                    >
                      Voir le classement Sit&amp;Go →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-6">
                Les performances de la saison en cours s&apos;afficheront ici dès les premiers résultats validés.
              </p>
            )}
          </section>

          {/* Portraits & coulisses */}
          {portraits.length > 0 && (
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">Portraits &amp; coulisses</h2>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {portraits.map((p) => (
                  <Link
                    key={p.id}
                    href="/vie-du-club"
                    className="card-hover group flex items-center gap-4 bg-white text-ink border border-white/10 rounded-lg p-5"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex-shrink-0 bg-paper-dim bg-cover bg-center flex items-center justify-center text-forest/30 text-2xl font-serif"
                      style={p.photoUrl ? { backgroundImage: `url(${p.photoUrl})` } : undefined}
                    >
                      {!p.photoUrl && "♠"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif font-semibold text-base group-hover:text-forest-2 transition-colors truncate">
                        {p.displayName}
                      </div>
                      {p.role && <div className="text-xs text-sage mb-1">{p.role}</div>}
                      <p className="text-sage text-xs line-clamp-2">{p.bio}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/vie-du-club"
                className="inline-block mt-5 text-forest-glow text-xs font-medium underline underline-offset-4"
              >
                Découvrir tous les portraits →
              </Link>
            </section>
          )}

          {/* Événements à venir */}
          <section id="evenements" className="scroll-mt-24 mb-14">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-serif font-semibold">Événements à venir</h2>
              <span className="h-px flex-1 bg-white/15" />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {UPCOMING_EVENTS.map((ev) => (
                <div key={ev.name} className="bg-white text-ink border border-white/10 rounded-lg p-5">
                  <div className="text-[0.62rem] tracking-widest uppercase text-brass-light bg-ink/90 inline-block px-2 py-0.5 rounded font-semibold mb-2">
                    {ev.period}
                  </div>
                  <div className="font-serif font-semibold text-base mb-1">{ev.name}</div>
                  <div className="text-xs text-sage mb-2">{ev.place}</div>
                  <p className="text-sage text-xs leading-relaxed">{ev.note}</p>
                </div>
              ))}
            </div>
            <p className="text-white/60 text-xs mt-5">
              Envie de jouer près de chez vous ? Consultez aussi le{" "}
              <Link href="/calendrier" className="text-forest-glow underline underline-offset-4">
                calendrier des manches du club
              </Link>
              .
            </p>
          </section>

          {/* Autres actus groupées par catégorie */}
          {otherCategories.map((g) => (
            <CategorySection key={g.category} category={g.category} items={g.items} />
          ))}
        </div>
      </div>
    </>
  );
}
