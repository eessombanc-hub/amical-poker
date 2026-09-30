import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ShareButtons from "@/components/ShareButtons";
import LoginGate from "@/components/LoginGate";

export const dynamic = "force-dynamic";

async function getItem(id: string) {
  try {
    return await prisma.pokerNewsItem.findFirst({
      where: { id, status: "PUBLIE" },
    });
  } catch {
    return null;
  }
}

function formatDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const item = await getItem(params.id);
  if (!item) return { title: "Actu introuvable" };
  return {
    title: item.title,
    description: item.summary.slice(0, 160),
    alternates: { canonical: `/poker-news/${item.id}` },
    openGraph: {
      title: item.title,
      description: item.summary.slice(0, 160),
      images: item.imageUrl ? [item.imageUrl] : undefined,
    },
  };
}

export default async function PokerNewsItemPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <LoginGate
        title="Gazette Poker réservée aux connectés"
        description="Cet article est réservé aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  const item = await getItem(params.id);
  if (!item) notFound();

  return (
    <div className="px-7 py-14">
      <div className="max-w-2xl mx-auto panel">
        <Link href="/poker-news" className="text-sage text-xs underline underline-offset-4 hover:text-forest">
          ← Toutes les actus
        </Link>

        <div className="flex items-center gap-2 text-[0.65rem] tracking-widest uppercase text-burgundy font-semibold mt-6 mb-3">
          <span className="bg-burgundy/10 text-burgundy px-2 py-1 rounded">{item.category}</span>
          <span className="text-sage">
            {item.sourceName} · {formatDate(item.publishedAt)}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-serif font-semibold leading-snug mb-6">{item.title}</h1>

        {item.imageUrl && (
          <div
            className="h-56 md:h-72 rounded-lg mb-6 bg-forest bg-gradient-to-br from-forest to-forest-2 bg-cover bg-center"
            style={{ backgroundImage: `url(${item.imageUrl})` }}
          />
        )}

        <p className="text-ink/80 text-base leading-relaxed mb-8">{item.summary}</p>

        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block border border-forest text-forest-2 px-6 py-3 rounded text-sm font-medium hover:bg-forest hover:text-white transition-colors"
        >
          Lire l&apos;article complet sur {item.sourceName} →
        </a>

        <div className="mt-8 pt-6 border-t border-ink/10">
          <ShareButtons path={`/poker-news/${item.id}`} title={item.title} />
        </div>

        <div className="mt-14 border-t border-ink/10 pt-8 text-center">
          <p className="text-sage text-sm mb-4">
            Envie de vivre le poker autrement qu&apos;à travers un écran ?
          </p>
          <Link
            href="/demande-adhesion"
            className="btn-glow inline-block bg-gradient-to-r from-brass to-brass-light text-ink font-semibold px-7 py-3 rounded text-sm"
          >
            Rejoindre le club →
          </Link>
        </div>
      </div>
    </div>
  );
}
