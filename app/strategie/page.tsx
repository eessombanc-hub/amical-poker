import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  STRATEGIE_LEVELS,
  LEVEL_LABEL,
  LEVEL_INTRO,
  levelStyles,
  levelStylesDark,
  type StrategieLevelValue,
} from "@/lib/strategieLevels";
import MarkSectionSeen from "@/components/MarkSectionSeen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stratégie & pédagogie poker",
  description:
    "Règles, lexique et stratégie du Texas Hold'em expliqués simplement par l'Amical Poker Club, pour progresser avant chaque manche.",
  alternates: { canonical: "/strategie" },
};

async function getArticles() {
  try {
    return await prisma.strategieArticle.findMany({
      where: { status: "PUBLIE" },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return [];
  }
}

// Lit et valide le niveau choisi dans les pastilles de filtre (?niveau=...).
// Chaîne vide = pas de filtre, tous les niveaux affichés (comportement par
// défaut).
function parseLevel(v: string | undefined): StrategieLevelValue | "" {
  return (STRATEGIE_LEVELS as readonly string[]).includes(v ?? "") ? (v as StrategieLevelValue) : "";
}

export default async function StrategiePage(props: {
  searchParams?: Promise<{ niveau?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;
  const isMember = session?.user
    ? !!(await prisma.member.findUnique({ where: { userId: (session.user as any).id as string } }))
    : false;

  const allArticles = await getArticles();
  // Les niveaux Débutant et Intermédiaire sont accessibles sans connexion —
  // seul le niveau Avancé reste réservé aux connectés.
  const articles = isLoggedIn
    ? allArticles
    : allArticles.filter((a) => a.level === "DEBUTANT" || a.level === "INTERMEDIAIRE");
  const activeLevel = parseLevel(searchParams?.niveau);
  const visibleLevels = isLoggedIn ? STRATEGIE_LEVELS : (["DEBUTANT", "INTERMEDIAIRE"] as const);

  const featuredIndex = articles.findIndex((a) => a.featured);
  const heroIndex = featuredIndex >= 0 ? featuredIndex : 0;
  // Avec un niveau choisi, la mise en avant n'a plus de sens (elle pourrait
  // appartenir à un autre niveau) : on ne montre alors que les articles du
  // niveau filtré, sans article vedette.
  const hero = activeLevel ? null : articles[heroIndex];
  const rest = activeLevel
    ? articles.filter((a) => a.level === activeLevel)
    : articles.filter((_, i) => i !== heroIndex);

  const byLevel = STRATEGIE_LEVELS.map((level) => ({
    level,
    articles: rest.filter((a) => a.level === level),
  })).filter((g) => g.articles.length > 0);

  return (
    <>
      <MarkSectionSeen section="strategie" />

      {/* ── MASTHEAD ── même code, mêmes animations et couleurs que la
          Gazette Poker (voir app/poker-news/page.tsx) : titre doré animé
          directement sur le fond dégradé sombre du site, pastilles de
          navigation rapide juste en dessous — ici par niveau plutôt que
          par catégorie. ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-1/4 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(10,222,124,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
                Progresser au poker
              </div>
              <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight md:leading-tight pb-1 mb-2 max-w-xl">
                Stratégie &amp; pédagogie poker
              </h1>
              <p className="text-white/70 text-sm mt-4 max-w-lg">
                Des articles de fond, écrits par le club, pour comprendre les
                règles, le vocabulaire et les bases stratégiques du Texas
                Hold&apos;em, que vous découvriez le jeu ou cherchiez à
                progresser avant la prochaine manche.
              </p>
            </div>
            {isMember && (
              <Link
                href="/proposer-contenu?type=STRATEGIE"
                className="text-xs text-forest-glow underline underline-offset-4 font-medium whitespace-nowrap"
              >
                Proposer un article →
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/strategie"
              className={`text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                !activeLevel
                  ? "bg-brass text-ink border-brass"
                  : "border-brass/50 text-brass hover:bg-brass hover:text-ink"
              }`}
            >
              Tous les niveaux
            </Link>
            {visibleLevels.map((level) => (
              <Link
                key={level}
                href={`/strategie?niveau=${level}`}
                className={`text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  activeLevel === level
                    ? "bg-brass text-ink border-brass"
                    : "border-brass/50 text-brass hover:bg-brass hover:text-ink"
                }`}
              >
                {LEVEL_LABEL[level]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!isLoggedIn && (
        <section className="px-7 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="border border-brass/30 bg-white/5 rounded-lg px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <p className="text-white/70 text-sm">
                Les articles de niveau Avancé sont réservés aux membres et aux
                invités connectés.
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href="/connexion"
                  className="text-xs font-medium text-forest-glow underline underline-offset-4"
                >
                  Se connecter
                </Link>
                <span className="text-white/30">·</span>
                <Link
                  href="/demande-adhesion"
                  className="text-xs font-medium text-forest-glow underline underline-offset-4"
                >
                  Rejoindre le club
                </Link>
                <span className="text-white/30">·</span>
                <Link
                  href="/demande-invite"
                  className="text-xs font-medium text-forest-glow underline underline-offset-4"
                >
                  Accès invité
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {articles.length === 0 && (
        <section className="px-7 pb-14">
          <div className="max-w-6xl mx-auto">
            <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
              Aucun article publié pour le moment. Revenez bientôt !
            </p>
          </div>
        </section>
      )}

      {activeLevel && byLevel.length === 0 && (
        <section className="px-7 pb-14">
          <div className="max-w-6xl mx-auto">
            <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
              Aucun article publié pour ce niveau pour le moment.
            </p>
          </div>
        </section>
      )}

      {/* ── ARTICLE À LA UNE ── même carte "cover story" sombre et
          contrastée que la Gazette, posée directement sur le fond du
          site (pas de panneau clair). ─────────────────────────────────── */}
      {hero && (
        <section className="px-7 pb-4">
          <div className="max-w-6xl mx-auto">
            <Link
              href={`/strategie/${hero.slug}`}
              className="card-hover group grid md:grid-cols-2 gap-0 bg-noir border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="h-56 md:h-full bg-gradient-to-br from-noir via-forest-2/40 to-noir flex items-center justify-center text-white/10 text-8xl font-serif">
                ♠
              </div>
              <div className="p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[0.65rem] tracking-widest uppercase font-semibold mb-3">
                  <span className={`border rounded-full px-2.5 py-1 ${levelStylesDark[hero.level]}`}>
                    {LEVEL_LABEL[hero.level]}
                  </span>
                  <span className="text-white/50">Pour commencer · lecture {hero.readingTime}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-semibold leading-snug mb-3 text-white group-hover:text-brass-light transition-colors">
                  {hero.title}
                </h2>
                <p className="text-white/70 text-sm leading-relaxed">{hero.excerpt}</p>
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
          {byLevel.map(({ level, articles: levelArticles }) => (
            <section key={level} className="mb-14">
              <div className="flex items-center gap-3 mb-1">
                <span
                  className={`text-[0.65rem] tracking-widest uppercase font-semibold border rounded-full px-2.5 py-1 ${levelStyles[level]}`}
                >
                  {LEVEL_LABEL[level]}
                </span>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <p className="text-white/60 text-xs mb-5">{LEVEL_INTRO[level]}</p>
              <div className="grid md:grid-cols-2 gap-5">
                {levelArticles.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/strategie/${a.slug}`}
                    className="card-hover block bg-white text-ink border border-white/10 rounded-lg p-6"
                  >
                    <div className="text-[0.65rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
                      Lecture {a.readingTime}
                    </div>
                    <h2 className="text-lg font-serif font-semibold leading-snug mb-2">{a.title}</h2>
                    <p className="text-sage text-sm line-clamp-3">{a.excerpt}</p>
                    <span className="text-forest text-xs font-medium mt-3 inline-block underline underline-offset-4">
                      Lire l&apos;article →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
