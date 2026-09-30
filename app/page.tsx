import Link from "next/link";
import { getServerSession } from "next-auth";
import Logo from "@/components/Logo";
import RegisterButton from "@/components/RegisterButton";
import BirthdayPopup from "@/components/BirthdayPopup";
import MemberLoginCard from "@/components/MemberLoginCard";
import NewsTicker, { type TickerItem } from "@/components/NewsTicker";
import HelperMascot from "@/components/HelperMascot";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonLdScriptProps, roundEventJsonLd } from "@/lib/seo";
import { LEVEL_LABEL, levelStyles } from "@/lib/strategieLevels";

export const dynamic = "force-dynamic";

// Questions fréquentes affichées en accordéon sur l'accueil — réponses
// basées uniquement sur des informations déjà présentes ailleurs sur le
// site (association, adhésion, invité, classement), sans rien inventer.
const FAQ_ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Comment rejoindre le club ?",
    a: (
      <>
        Il suffit de faire une{" "}
        <Link href="/demande-adhesion" className="underline underline-offset-2 text-forest-2">
          demande d&apos;adhésion
        </Link>{" "}
        : choisissez un pseudo, un e-mail et un mot de passe, et le bureau
        examine et valide votre entrée dans le club.
      </>
    ),
  },
  {
    q: "Faut-il être un joueur expérimenté ?",
    a: (
      <>
        Non, l&apos;Amical Poker Club est avant tout une association loi 1901
        conviviale : on y vient pour jouer et partager un bon moment. La
        rubrique{" "}
        <Link href="/strategie" className="underline underline-offset-2 text-forest-2">
          Stratégie
        </Link>{" "}
        explique les règles et les bases pour les nouveaux venus.
      </>
    ),
  },
  {
    q: "Je ne suis pas encore membre, puis-je quand même accéder au forum ?",
    a: (
      <>
        Oui : une{" "}
        <Link href="/demande-invite" className="underline underline-offset-2 text-forest-2">
          demande d&apos;accès invité
        </Link>{" "}
        vous permet de participer aux discussions du forum sans être membre à
        part entière du club.
      </>
    ),
  },
  {
    q: "Où et quand se déroulent les manches ?",
    a: (
      <>
        À Villecresnes, tout au long de la saison. Toutes les dates, horaires
        et lieux à venir sont détaillés sur le{" "}
        <Link href="/calendrier" className="underline underline-offset-2 text-forest-2">
          calendrier
        </Link>
        .
      </>
    ),
  },
  {
    q: "Comment fonctionne le classement ?",
    a: (
      <>
        Chaque manche rapporte des points selon la position finale, cumulés
        sur la saison. Le détail est consultable sur la page{" "}
        <Link href="/classement" className="underline underline-offset-2 text-forest-2">
          Classement
        </Link>
        .
      </>
    ),
  },
];

async function getNextRound() {
  try {
    return await prisma.round.findFirst({
      where: { status: { in: ["INSCRIPTIONS_OUVERTES", "A_VENIR"] } },
      orderBy: { date: "asc" },
      include: { _count: { select: { registrations: true } } },
    });
  } catch {
    // Base de données non configurée (ex: build sans DATABASE_URL) — on affiche la page quand même.
    return null;
  }
}

async function getLatestNews() {
  try {
    // Pas de limite ici : le bandeau "en direct" doit pouvoir montrer
    // jusqu'à 8 actus, comme sur la page Gazette Poker (voir tickerItems
    // plus bas) — c'est l'aperçu en 3 cartes, juste en dessous sur cette
    // page, qui se limite lui-même aux 3 premières (voir newsHighlight
    // plus bas, qui écarte aussi la catégorie "Sport" de ces deux blocs).
    return await prisma.pokerNewsItem.findMany({
      where: { status: "PUBLIE" },
      orderBy: { publishedAt: "desc" },
    });
  } catch {
    return [];
  }
}

// Preuve sociale : classement en cours + dernier vainqueur, pour montrer
// dès l'accueil que des membres réels jouent (et gagnent) au club.
async function getClubPerformances() {
  try {
    const season = await prisma.season.findFirst({ where: { isActive: true } });
    if (!season) return { season: null, topRankings: [], lastRound: null };

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

    return { season, topRankings, lastRound };
  } catch {
    return { season: null, topRankings: [], lastRound: null };
  }
}

type LegacyRankingRow = { place: string; joueur: string; points: string };

// Repli : tant que le classement officiel (Ranking) n'a pas de premiers
// résultats, on montre le podium importé du site historique (voir
// lib/jimdoSync.ts, syncClassement) plutôt qu'une section vide.
async function getLegacyTopRanking() {
  try {
    const snapshot = await prisma.legacyRankingSnapshot.findFirst();
    const rows = (snapshot?.rows as LegacyRankingRow[] | null) ?? [];
    return rows.slice(0, 3);
  } catch {
    return [];
  }
}

// Chiffres clés du club affichés en bandeau sur l'accueil — toujours
// visibles (contrairement aux sections "prochaine manche"/"classement" qui
// dépendent d'une saison ou d'une manche active), pour que la page ne
// paraisse jamais vide même sans donnée en cours.
async function getClubStats() {
  try {
    const [activeMembers, roundsPlayed, seasons] = await Promise.all([
      prisma.member.count({ where: { membershipStatus: "ACTIF" } }),
      prisma.round.count({ where: { status: "TERMINEE" } }),
      prisma.season.count(),
    ]);
    return { activeMembers, roundsPlayed, seasons };
  } catch {
    return { activeMembers: 0, roundsPlayed: 0, seasons: 0 };
  }
}

// Connexions des dernières 24h, pour un aperçu d'activité en temps quasi réel
// sur l'accueil — distingue les membres (rôle >= MEMBRE, avec fiche Member)
// des accès invité (rôle INVITE, forum uniquement — voir prisma/schema.prisma,
// enum Role). Basé sur User.lastLoginAt, mis à jour à chaque connexion
// réussie (voir lib/auth.ts).
async function getRecentLogins() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [members, invites] = await Promise.all([
      prisma.user.count({ where: { lastLoginAt: { gte: since }, role: { not: "INVITE" } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: since }, role: "INVITE" } }),
    ]);
    return { members, invites };
  } catch {
    return { members: 0, invites: 0 };
  }
}

async function getStrategieOverview() {
  try {
    const articles = await prisma.strategieArticle.findMany({
      where: { status: "PUBLIE" },
      orderBy: { createdAt: "asc" },
    });
    const featured = articles.find((a) => a.featured) ?? articles[0] ?? null;
    return { count: articles.length, featured };
  } catch {
    return { count: 0, featured: null };
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

const MEDALS = ["🥇", "🥈", "🥉"];

// Membres actifs fêtant leur anniversaire aujourd'hui (jour/mois — l'année de
// naissance n'est jamais affichée publiquement). Filtré en mémoire car la
// comparaison jour/mois sur une date n'est pas portable en requête Prisma.
async function getBirthdaysToday() {
  try {
    const today = new Date();
    const members = await prisma.member.findMany({
      where: { membershipStatus: "ACTIF", birthDate: { not: null } },
      select: { nickname: true, birthDate: true, photoUrl: true },
    });
    return members.filter(
      (m) =>
        m.birthDate!.getMonth() === today.getMonth() &&
        m.birthDate!.getDate() === today.getDate()
    );
  } catch {
    return [];
  }
}

// Membre actuellement connecté (nul si non connecté, ou connecté en simple
// INVITE sans fiche Member) — sert uniquement à griser le bouton
// d'inscription de la prochaine manche s'il y est déjà inscrit (voir plus
// bas). La cotisation, elle, ne s'affiche plus sur l'accueil : voir
// app/espace-membre/page.tsx.
async function getCurrentMember() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return null;
    return await prisma.member.findUnique({
      where: { userId },
      select: { id: true, cfepaTeam: true },
    });
  } catch {
    return null;
  }
}

// Statut d'inscription du membre connecté pour la prochaine manche (voir
// components/RegisterButton.tsx, prop initialStatus) — pour griser le
// bouton "S'inscrire" du hero dès le chargement si le membre est déjà
// inscrit ou en liste d'attente, pas seulement après un clic dans la même
// session.
async function getMyNextRoundStatus(memberId: string | undefined, roundId: string | undefined) {
  if (!memberId || !roundId) return null;
  try {
    const registration = await prisma.roundRegistration.findUnique({
      where: { roundId_memberId: { roundId, memberId } },
      select: { status: true },
    });
    return registration && registration.status !== "ANNULE"
      ? (registration.status as "INSCRIT" | "LISTE_ATTENTE")
      : null;
  } catch {
    return null;
  }
}

// Place du membre connecté au classement de la saison en cours — remplace
// le bouton "Rejoindre le club" du hero par un raccourci vers SON classement
// une fois connecté (ce bouton n'a plus de sens pour un membre déjà dans le
// club). Calculé sur l'intégralité du classement (pas seulement le top 3
// public de getClubPerformances) et sans filtre publicResults : un membre
// voit toujours sa propre place, qu'il ait choisi de la rendre publique aux
// autres ou non.
async function getMyRanking(memberId: string | undefined, seasonId: string | undefined) {
  if (!memberId || !seasonId) return null;
  try {
    const rankings = await prisma.ranking.findMany({
      where: { seasonId },
      orderBy: { totalPoints: "desc" },
      select: { memberId: true },
    });
    const index = rankings.findIndex((r) => r.memberId === memberId);
    if (index === -1) return null;
    return { rank: index + 1, total: rankings.length };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [round, news, { season, topRankings, lastRound }, portraits, birthdays, stats, strategie, recentLogins, currentMember] =
    await Promise.all([
      getNextRound(),
      getLatestNews(),
      getClubPerformances(),
      getPortraits(),
      getBirthdaysToday(),
      getClubStats(),
      getStrategieOverview(),
      getRecentLogins(),
      getCurrentMember(),
    ]);
  const myNextRoundStatus = await getMyNextRoundStatus(currentMember?.id, round?.id);
  const myRanking = await getMyRanking(currentMember?.id, season?.id);
  // Manche CFEPA (Championnat de France par Équipe de Poker Associatif) :
  // inscriptions réservées à l'Équipe CFEPA (voir Member.cfepaTeam) — si la
  // prochaine manche du club en est une, le bouton "S'inscrire" du hero et
  // de la section "Prochaine manche" est remplacé par une mention explicite
  // pour qui n'en fait pas partie (même logique que app/calendrier/page.tsx).
  const nextRoundReservedToCfepa = round?.format === "CFEPA" && !currentMember?.cfepaTeam;
  // Le bandeau "en direct" et l'aperçu 3 cartes de l'accueil doivent rester
  // centrés sur le poker : l'actu sport généraliste (catégorie "Sport", flux
  // L'Équipe) reste consultable dans sa section dédiée sur /poker-news, mais
  // ne doit pas passer devant les vraies actus poker dès la page d'accueil.
  const newsHighlight = news.filter((n) => n.category !== "Sport");
  const tickerItems: TickerItem[] = newsHighlight.slice(0, 8).map((n) => ({
    id: n.id,
    title: n.title,
    category: n.category,
    sourceName: n.sourceName,
    sourceUrl: n.sourceUrl,
    summary: n.summary,
    imageUrl: n.imageUrl,
  }));
  const winner = lastRound?.results[0];
  const hasPerformances = topRankings.length > 0 || !!winner;
  const legacyTopRanking = hasPerformances ? [] : await getLegacyTopRanking();
  const hasSocialProof = hasPerformances || portraits.length > 0 || legacyTopRanking.length > 0;
  const featuredArticle = strategie.featured;

  const dateStr = round
    ? new Date(round.date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div>
      {round && (
        <script
          {...jsonLdScriptProps(
            roundEventJsonLd({
              id: round.id,
              number: round.number,
              date: round.date,
              startTime: round.startTime,
              location: round.location,
              format: round.format,
              maxSeats: round.maxSeats,
              registrationsCount: round._count.registrations,
            })
          )}
        />
      )}
      <BirthdayPopup birthdays={birthdays.map((m) => ({ name: m.nickname, photoUrl: m.photoUrl }))} />
      {/* ── BANDEAU ACTUS "EN DIRECT" (repris de la Gazette Poker) ───── */}
      <NewsTicker items={tickerItems} />
      {/* ── HERO ────────────────────────────────── */}
      <section className="relative overflow-hidden flex items-center justify-center px-7 py-10 min-h-[calc(100vh-136px)] lg:min-h-[calc(100vh-166px)] bg-[linear-gradient(155deg,#04140c_0%,#063d27_25%,#050505_50%,#2a0008_75%,#7a0012_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[720px] rounded-full opacity-50 blur-3xl animate-glow-pulse"
          style={{ background: "radial-gradient(circle, rgba(10,222,124,0.45) 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 w-[520px] h-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,31,61,0.35) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto flex flex-col items-center text-center gap-4">
          <div className="animate-fade-in-up">
            <Logo size={100} animated halo />
          </div>
          <div className="w-full animate-fade-in-up [animation-delay:120ms]">
            <h1 className="font-titre-club text-royal-shine animate-royal-shine text-4xl md:text-6xl leading-[1.15] drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]">
              Amical Poker Club
            </h1>
            <p className="font-signature text-royal-shine animate-royal-shine text-2xl md:text-3xl leading-[1.5] mt-3 md:mt-3 pb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              Le poker se joue en bonne compagnie
            </p>
            <p className="text-white/75 text-sm md:text-base mt-4 max-w-xl mx-auto">
              Une saison, des manches, un classement et surtout une bande de
              passionnés qui aiment se retrouver autour d&apos;un tapis vert.
              Rejoignez le club et suivez toute l&apos;actualité poker.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center mt-1 animate-fade-in-up [animation-delay:240ms]">
            {currentMember ? (
              <Link
                href="/classement"
                className="btn-glow bg-gradient-to-r from-brass to-brass-light text-ink font-semibold px-6 py-2.5 rounded text-sm shadow-[0_8px_24px_-8px_rgba(240,180,41,0.6)]"
              >
                {myRanking
                  ? `🏆 ${myRanking.rank}${myRanking.rank === 1 ? "er" : "e"} au classement (sur ${myRanking.total}) →`
                  : "Voir le classement →"}
              </Link>
            ) : (
              <Link
                href="/demande-adhesion"
                className="btn-glow bg-gradient-to-r from-brass to-brass-light text-ink font-semibold px-6 py-2.5 rounded text-sm shadow-[0_8px_24px_-8px_rgba(240,180,41,0.6)]"
              >
                Rejoindre le club →
              </Link>
            )}
            {round && (
              nextRoundReservedToCfepa ? (
                <span className="text-brass text-xs uppercase tracking-widest font-semibold px-6 py-3">
                  Prochaine manche réservée à l&apos;Équipe CFEPA
                </span>
              ) : (
                <RegisterButton
                  roundId={round.id}
                  isFull={round._count.registrations >= round.maxSeats}
                  initialStatus={myNextRoundStatus}
                  variant="heroPill"
                />
              )
            )}
            <Link
              href="/calendrier"
              className="btn-glow bg-forest text-white px-6 py-2.5 rounded text-sm font-medium"
            >
              Voir le calendrier
            </Link>
            <Link
              href="/strategie"
              className="border border-forest text-forest-glow px-6 py-2.5 rounded text-sm font-medium transition-colors hover:bg-forest hover:text-white"
            >
              Fiches stratégie
            </Link>
            <Link
              href="/poker-news"
              className="border border-forest text-forest-glow px-6 py-2.5 rounded text-sm font-medium transition-colors hover:bg-forest hover:text-white"
            >
              Gazette Poker
            </Link>
            <Link
              href="/forum"
              className="border border-forest text-forest-glow px-6 py-2.5 rounded text-sm font-medium transition-colors hover:bg-forest hover:text-white"
            >
              Forum
            </Link>
            <Link
              href="/espace-membre"
              className="text-white/70 px-6 py-2.5 rounded text-sm font-medium underline underline-offset-4 hover:text-brass transition-colors"
            >
              Espace membre →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CHIFFRES CLÉS ───────────────────────────── */}
      <section className="px-7 py-16 border-t border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: "👥", value: stats.activeMembers, label: "Membres actifs" },
            { icon: "🃏", value: stats.roundsPlayed, label: "Manches jouées" },
            { icon: "📅", value: stats.seasons, label: stats.seasons > 1 ? "Saisons" : "Saison" },
            { icon: "📚", value: strategie.count, label: "Fiches stratégie" },
          ].map((s) => (
            <div key={s.label} className="card-hover bg-white border border-ink/10 rounded-lg p-6 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-serif font-bold text-3xl md:text-4xl text-forest-2">{s.value}</div>
              <div className="text-sage text-xs uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ACTIVITÉ RÉCENTE (24H) ─────────────────── */}
      <section className="px-7 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-5">
          {[
            { icon: "🟢", value: recentLogins.members, label: "Membres connectés (24h)" },
            { icon: "🔵", value: recentLogins.invites, label: "Invités connectés (24h)" },
          ].map((s) => (
            <div key={s.label} className="card-hover bg-white border border-ink/10 rounded-lg p-6 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-serif font-bold text-3xl md:text-4xl text-forest-2">{s.value}</div>
              <div className="text-sage text-xs uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROCHAINE MANCHE ───────────────────────── */}
      {round && (
        <section className="px-7 py-16 border-t border-white/10">
          <div className="relative max-w-4xl mx-auto overflow-hidden gradient-flash animate-gradient-pan text-white rounded-lg p-9 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-[0_20px_45px_-20px_rgba(10,222,124,0.55)]">
            <div>
              <div className="inline-flex items-center gap-2 text-[0.7rem] tracking-widest uppercase text-white/80 font-semibold mb-2">
                {round.status === "INSCRIPTIONS_OUVERTES" && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-brass animate-badge-pulse" />
                )}
                Prochaine manche, Manche {round.number}
              </div>
              <h2 className="text-2xl md:text-3xl text-white capitalize">{dateStr}</h2>
              <p className="text-white/80 text-sm mt-3">
                Ouverture des portes {round.openTime} · Départ {round.startTime} ·{" "}
                {round.location}
              </p>
              <p className="text-white/60 text-xs mt-2 font-mono-club">
                {round._count.registrations}/{round.maxSeats} places prises · Format{" "}
                {round.format}
              </p>
            </div>
            {nextRoundReservedToCfepa ? (
              <span className="text-white text-xs uppercase tracking-widest font-semibold bg-white/10 border border-white/30 rounded-full px-5 py-2.5 whitespace-nowrap">
                Réservé à l&apos;Équipe CFEPA
              </span>
            ) : (
              <RegisterButton
                roundId={round.id}
                isFull={round._count.registrations >= round.maxSeats}
                initialStatus={myNextRoundStatus}
                variant="onDark"
              />
            )}
          </div>
        </section>
      )}

      {/* ── ACTUS POKER (aperçu) ───────────────────── */}
      {news.length > 0 && (
        <section className="px-7 py-16 border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-7">
              <h2 className="text-2xl">Gazette Poker</h2>
              <Link href="/poker-news" className="text-forest text-sm font-medium underline underline-offset-4">
                Toute la gazette →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {newsHighlight.slice(0, 3).map((n) => (
                <Link
                  key={n.id}
                  href={`/poker-news/${n.id}`}
                  className="card-hover block bg-white border border-ink/10 rounded-lg p-5"
                >
                  <div className="text-[0.65rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
                    {n.category} · {n.sourceName}
                  </div>
                  <h3 className="text-base font-serif font-semibold text-ink leading-snug mb-2">{n.title}</h3>
                  <p className="text-sage text-sm line-clamp-3">{n.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── APERÇU STRATÉGIE ────────────────────────── */}
      {featuredArticle && (
        <section className="px-7 py-16 border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-7">
              <h2 className="text-2xl">Stratégie &amp; pédagogie</h2>
              <Link href="/strategie" className="text-forest text-sm font-medium underline underline-offset-4">
                Toute la stratégie →
              </Link>
            </div>
            <Link
              href={`/strategie/${featuredArticle.slug}`}
              className="card-hover group block bg-white border border-ink/10 rounded-lg p-7 md:p-9"
            >
              <div
                className={`inline-block text-[0.62rem] tracking-widest uppercase font-semibold px-2.5 py-1 rounded-full border mb-3 ${levelStyles[featuredArticle.level]}`}
              >
                {LEVEL_LABEL[featuredArticle.level]}
              </div>
              <h3 className="text-xl md:text-2xl text-ink group-hover:text-forest transition-colors mb-2">
                {featuredArticle.title}
              </h3>
              <p className="text-sage text-sm max-w-2xl mb-3">{featuredArticle.excerpt}</p>
              <div className="text-xs text-sage font-mono-club">{featuredArticle.readingTime} de lecture</div>
            </Link>
          </div>
        </section>
      )}

      {/* ── LA COMMUNAUTÉ EN ACTION (preuve sociale) ── */}
      {hasSocialProof && (
        <section className="px-7 py-16 border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-7">
              <h2 className="text-2xl">La communauté en action</h2>
              <Link href="/poker-news" className="text-forest text-sm font-medium underline underline-offset-4">
                Voir toutes les performances →
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {topRankings.length > 0 && (
                <div className="bg-white border border-forest/20 rounded-lg p-6">
                  <div className="text-[0.62rem] tracking-widest uppercase text-forest-2 font-semibold mb-4">
                    Top classement {season?.label ?? ""}
                  </div>
                  <div className="space-y-3">
                    {topRankings.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-3">
                        <span className="text-xl w-7 flex-shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-ink truncate">
                            {r.member.firstName} {r.member.nickname ? `« ${r.member.nickname} »` : ""}
                          </div>
                          <div className="text-xs text-sage">{r.totalPoints} pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {legacyTopRanking.length > 0 && (
                <div className="bg-white border border-forest/20 rounded-lg p-6">
                  <div className="text-[0.62rem] tracking-widest uppercase text-forest-2 font-semibold mb-4">
                    Top classement (ancien site)
                  </div>
                  <div className="space-y-3">
                    {legacyTopRanking.map((r, i) => (
                      <div key={r.place} className="flex items-center gap-3">
                        <span className="text-xl w-7 flex-shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-ink truncate">{r.joueur}</div>
                          <div className="text-xs text-sage">{r.points} pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/classement"
                    className="inline-block mt-4 text-forest-2 text-xs font-medium underline underline-offset-4"
                  >
                    Voir le classement complet →
                  </Link>
                </div>
              )}
              {winner && lastRound && (
                <div className="bg-white border border-burgundy/20 rounded-lg p-6">
                  <div className="text-[0.62rem] tracking-widest uppercase text-burgundy font-semibold mb-4">
                    Dernière manche · Manche {lastRound.number}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-7 flex-shrink-0">🏆</span>
                    <div>
                      <div className="font-medium text-sm text-ink">
                        {winner.member.firstName} {winner.member.nickname ? `« ${winner.member.nickname} »` : ""}
                      </div>
                      <div className="text-xs text-sage">
                        Vainqueur du{" "}
                        {new Date(lastRound.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {portraits.map((p) => (
                <Link
                  key={p.id}
                  href="/vie-du-club"
                  className="card-hover group flex items-center gap-4 bg-white border border-ink/10 rounded-lg p-6"
                >
                  <div
                    className="w-14 h-14 rounded-full flex-shrink-0 bg-paper-dim bg-cover bg-center flex items-center justify-center text-forest/30 text-xl font-serif"
                    style={p.photoUrl ? { backgroundImage: `url(${p.photoUrl})` } : undefined}
                  >
                    {!p.photoUrl && "♠"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-serif font-semibold text-sm text-ink group-hover:text-forest transition-colors truncate">
                      {p.displayName}
                    </div>
                    {p.role && <div className="text-xs text-sage">{p.role}</div>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ RAPIDE ──────────────────────────────── */}
      <section className="px-7 py-16 border-t border-ink/10 bg-paper-dim">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl text-ink mb-7 text-center">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group bg-white border border-ink/10 rounded-lg px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium text-ink text-sm">
                  {item.q}
                  <span className="text-sage text-lg leading-none flex-shrink-0 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-sage text-sm mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── REJOINDRE / DÉJÀ MEMBRE ──────────────────── */}
      <section className="px-7 py-16 border-t border-ink/10 bg-paper-dim">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 text-center">
          <div className="md:border-r md:border-ink/10 md:pr-10">
            <div className="text-[0.68rem] tracking-widest uppercase text-brass font-semibold mb-2">
              Nouveau venu
            </div>
            <h2 className="text-2xl text-ink mb-3">Votre place vous attend</h2>
            <p className="text-sage text-sm max-w-sm mx-auto mb-6">
              Choisissez un pseudo, un e-mail et un mot de passe : le bureau
              examine votre demande et valide votre entrée dans le club.
            </p>
            <Link
              href="/demande-adhesion"
              className="btn-glow inline-block bg-gradient-to-r from-brass to-brass-light text-ink font-semibold px-8 py-3 rounded text-sm"
            >
              Faire une demande d&apos;adhésion
            </Link>
            <p className="text-sage text-xs mt-5 mb-2">
              Juste envie de suivre le forum, sans devenir membre à part entière ?
            </p>
            <Link
              href="/demande-invite"
              className="inline-block border border-ink/15 text-ink px-6 py-2.5 rounded text-sm font-medium hover:bg-white transition-colors"
            >
              Demander un accès invité →
            </Link>
          </div>
          <div className="md:pl-10">
            <div className="text-[0.68rem] tracking-widest uppercase text-sage font-semibold mb-2">
              Déjà membre
            </div>
            <h2 className="text-2xl text-ink mb-3">Bon retour parmi nous</h2>
            <p className="text-sage text-sm max-w-sm mx-auto mb-6">
              Connectez-vous pour vous inscrire aux manches, consulter le
              classement de la saison et échanger sur le forum du club.
            </p>
            <MemberLoginCard />
          </div>
        </div>
      </section>

      {/* ── MASCOTTE D'AIDE À LA RECHERCHE (coin de l'accueil) ──── */}
      <HelperMascot />
    </div>
  );
}
