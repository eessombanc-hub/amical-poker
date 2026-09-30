import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LikeButton from "@/components/LikeButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Actualités du club",
  description:
    "Les annonces, résultats et temps forts de la vie associative de l'Amical Poker Club à Villecresnes.",
  alternates: { canonical: "/actualites" },
};

const CATEGORY_LABEL: Record<string, string> = {
  VIE_DU_CLUB: "Vie du club",
  RESULTATS: "Résultats",
  EVENEMENTS: "Événements",
  INFORMATIONS: "Informations",
  COMMUNICATION_BUREAU: "Communication du bureau",
};

export default async function ActualitesPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;

  const news = await prisma.news.findMany({
    where: { status: "PUBLIE" },
    orderBy: { createdAt: "desc" },
  });

  // Compteurs de "j'aime" par actu, plus la liste de celles aimées par
  // l'utilisateur connecté (voir components/NewsLikeButton.tsx) — deux
  // requêtes groupées plutôt qu'une par actu.
  const newsIds = news.map((n) => n.id);
  const [likeCounts, likedByUser] = await Promise.all([
    newsIds.length > 0
      ? prisma.newsLike.groupBy({ by: ["newsId"], where: { newsId: { in: newsIds } }, _count: true })
      : Promise.resolve([]),
    userId && newsIds.length > 0
      ? prisma.newsLike.findMany({ where: { userId, newsId: { in: newsIds } }, select: { newsId: true } })
      : Promise.resolve([]),
  ]);
  const countByNewsId = new Map(likeCounts.map((l) => [l.newsId, l._count]));
  const likedNewsIds = new Set(likedByUser.map((l) => l.newsId));

  return (
    <>
      {/* ── MASTHEAD ── mêmes codes que la Gazette / Stratégie / Classement /
          Calendrier : titre doré animé sur le fond dégradé sombre du site. ── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(240,180,41,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
            Vie du club
          </div>
          <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2 max-w-xl">
            Actualités
          </h1>
          <p className="text-white/70 text-sm max-w-lg">
            Les annonces, résultats et temps forts de la vie associative du
            club.
          </p>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-3xl mx-auto space-y-5">
          {news.map((n) => (
            <article
              key={n.id}
              id={n.id}
              className="card-hover bg-white text-ink border border-white/10 rounded-lg p-6 scroll-mt-24"
            >
              <div className="text-xs uppercase tracking-wide text-burgundy font-semibold mb-2 flex items-center gap-2">
                {CATEGORY_LABEL[n.category]}
                {n.autoImported && (
                  <span className="text-[0.6rem] normal-case tracking-normal bg-forest/10 text-forest px-1.5 py-0.5 rounded">
                    Depuis l&apos;ancien site
                  </span>
                )}
              </div>
              <h2 className="text-xl font-serif font-semibold mb-2">{n.title}</h2>
              <p className="text-sage text-sm whitespace-pre-line mb-4">{n.body}</p>
              <LikeButton
                endpoint={`/api/news/${n.id}/like`}
                initialCount={countByNewsId.get(n.id) ?? 0}
                initialLiked={likedNewsIds.has(n.id)}
                isLoggedIn={!!userId}
              />
            </article>
          ))}
          {news.length === 0 && (
            <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
              Aucune actualité publiée pour le moment.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
