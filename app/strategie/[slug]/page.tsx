import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelStyles, LEVEL_LABEL, type QuizQuestion } from "@/lib/strategieLevels";
import { articleJsonLd, jsonLdScriptProps } from "@/lib/seo";
import ShareButtons from "@/components/ShareButtons";
import GlossaryText from "@/components/GlossaryText";
import ArticleQuiz from "@/components/ArticleQuiz";
import OutsCalculator from "@/components/OutsCalculator";
import LoginGate from "@/components/LoginGate";
import LikeButton from "@/components/LikeButton";

export const dynamic = "force-dynamic";

// Article(s) sur lesquels le glossaire ne doit pas s'appliquer (ce serait
// circulaire) et/ou qui embarquent un outil dédié.
const GLOSSARY_DISABLED_SLUGS = new Set(["lexique-poker-essentiel"]);
const OUTS_CALCULATOR_SLUG = "comprendre-cotes-et-outs";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const article = await prisma.strategieArticle.findUnique({ where: { slug: params.slug } });
  if (!article || article.status !== "PUBLIE") return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/strategie/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
    },
  };
}

export default async function StrategieArticlePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const article = await prisma.strategieArticle.findUnique({ where: { slug: params.slug } });
  if (!article || article.status !== "PUBLIE") notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  // Débutant et Intermédiaire restent accessibles sans connexion — seul le
  // niveau Avancé reste réservé aux connectés.
  if (article.level === "AVANCE" && !session?.user) {
    return (
      <LoginGate
        title="Article réservé aux connectés"
        description="Cet article de stratégie (niveau Avancé) est réservé aux membres et aux invités connectés. Les articles niveau Débutant et Intermédiaire restent accessibles à tous."
      />
    );
  }

  const content = article.content as string[];
  const quiz = (article.quiz as QuizQuestion[] | null) ?? [];
  const glossaryDisabled = GLOSSARY_DISABLED_SLUGS.has(article.slug);

  const [likeCount, likedByUser] = await Promise.all([
    prisma.strategieArticleLike.count({ where: { articleId: article.id } }),
    userId
      ? prisma.strategieArticleLike.findUnique({ where: { articleId_userId: { articleId: article.id, userId } } })
      : Promise.resolve(null),
  ]);

  // Articles à suggérer en fin de lecture : même niveau en priorité, sinon
  // les plus récents.
  const others = await prisma.strategieArticle.findMany({
    where: { status: "PUBLIE", slug: { not: article.slug } },
    orderBy: { createdAt: "desc" },
  });
  const sameLevel = others.filter((a) => a.level === article.level);
  const rest = others.filter((a) => a.level !== article.level);
  const related = [...sameLevel, ...rest].slice(0, 3);

  return (
    <div className="px-7 py-14">
      <script
        {...jsonLdScriptProps(
          articleJsonLd({
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt,
            updatedAt: article.updatedAt.toISOString(),
          })
        )}
      />
      <div className="max-w-2xl mx-auto panel">
        <Link
          href="/strategie"
          className="text-sage text-xs font-medium mb-6 inline-block underline underline-offset-4"
        >
          ← Stratégie &amp; pédagogie poker
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[0.62rem] tracking-widest uppercase font-semibold border rounded-full px-2.5 py-1 ${levelStyles[article.level]}`}>
            {LEVEL_LABEL[article.level]}
          </span>
          <span className="text-[0.65rem] tracking-widest uppercase text-burgundy font-semibold">
            Lecture {article.readingTime}
          </span>
        </div>
        <h1 className="text-3xl mb-6 font-serif">{article.title}</h1>

        <div className="mb-8 border-l-[3px] border-brass bg-brass/[0.08] rounded-r-lg px-5 py-4">
          <div className="text-[0.62rem] tracking-widest uppercase text-[#8a6412] font-semibold mb-1.5">
            À retenir
          </div>
          <p className="text-ink/85 text-sm leading-relaxed">{article.takeaway}</p>
        </div>

        <div className="space-y-5">
          {content.map((paragraph, i) => (
            <p key={i} className="text-ink/85 text-sm leading-relaxed">
              <GlossaryText text={paragraph} disabled={glossaryDisabled} />
            </p>
          ))}
        </div>

        {article.slug === OUTS_CALCULATOR_SLUG && <OutsCalculator />}

        <div className="mt-10 pt-6 border-t border-ink/10 flex items-center justify-between flex-wrap gap-3">
          <ShareButtons path={`/strategie/${article.slug}`} title={article.title} />
          <LikeButton
            endpoint={`/api/strategie/${article.id}/like`}
            initialCount={likeCount}
            initialLiked={!!likedByUser}
            isLoggedIn={!!userId}
          />
        </div>

        <div className="mt-8 pt-8 border-t border-ink/10 flex flex-wrap gap-3">
          <Link
            href="/calendrier"
            className="bg-forest text-white px-6 py-2.5 rounded text-sm font-medium"
          >
            Voir le calendrier des manches
          </Link>
          <Link
            href="/strategie"
            className="border border-ink/15 px-6 py-2.5 rounded text-sm font-medium"
          >
            D&apos;autres articles
          </Link>
          <Link
            href={`/forum?newTopic=${encodeURIComponent(article.title)}`}
            className="border border-ink/15 px-6 py-2.5 rounded text-sm font-medium"
          >
            En discuter sur le forum
          </Link>
        </div>

        {quiz.length > 0 && <ArticleQuiz quiz={quiz} />}

        {related.length > 0 && (
          <div className="mt-10 pt-8 border-t border-ink/10">
            <h2 className="text-lg font-serif font-semibold mb-4">À lire aussi</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map((a) => (
                <Link
                  key={a.slug}
                  href={`/strategie/${a.slug}`}
                  className="card-hover block border border-ink/10 rounded-lg p-4"
                >
                  <span className={`text-[0.58rem] tracking-widest uppercase font-semibold border rounded-full px-2 py-0.5 ${levelStyles[a.level]}`}>
                    {LEVEL_LABEL[a.level]}
                  </span>
                  <h3 className="text-sm font-serif font-semibold leading-snug mt-2 mb-1">
                    {a.title}
                  </h3>
                  <span className="text-forest text-xs font-medium underline underline-offset-4">
                    Lire →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
