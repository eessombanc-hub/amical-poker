import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";

/**
 * Sources synchronisées automatiquement, via leur flux RSS officiel.
 *
 * Winamax.fr ne publie pas de flux RSS (vérifié) : ses actus restent donc
 * ajoutées manuellement depuis /admin/poker-news (avec un bouton "pré-remplir
 * depuis un lien" pour limiter la saisie), plutôt que scrapées — on évite
 * ainsi de dépendre de la structure HTML du site, qui peut casser l'import
 * à tout moment, et de reproduire du contenu sans l'accord de l'éditeur.
 *
 * Pour ajouter une nouvelle source : il suffit qu'elle propose un flux RSS
 * et de l'ajouter ci-dessous.
 */
export const POKER_NEWS_SOURCES = [
  {
    name: "PokerNews",
    feedUrl: "https://fr.pokernews.com/rss.php",
    defaultCategory: "Circuit",
  },
  {
    name: "CardPlayer",
    feedUrl: "https://www.cardplayer.com/poker-news.rss",
    defaultCategory: "International",
  },
  {
    // Actualité des casinos et clubs de jeux parisiens (Paris + Île-de-France,
    // dont le Casino Barrière d'Enghien-les-Bains) : tournois, ouvertures,
    // jackpots — flux RSS natif WordPress du site.
    name: "Les clubs de jeux parisiens",
    feedUrl: "https://lesclubsdejeuxparisiens.fr/feed/",
    defaultCategory: "Casino",
  },
  {
    // Actualité sportive générale (toutes disciplines) — flux RSS officiel de L'Équipe.
    name: "L'Équipe",
    feedUrl: "https://dwh.lequipe.fr/api/edito/rss?path=/Tous-sports/",
    defaultCategory: "Sport",
  },
] as const;

type ParsedItem = Parser.Item & {
  "content:encoded"?: string;
  "media:content"?: { $?: { url?: string } };
  "media:thumbnail"?: { $?: { url?: string } };
};

const parser = new Parser<Record<string, unknown>, ParsedItem>({
  customFields: {
    item: ["media:content", "media:thumbnail", "content:encoded"],
  },
  timeout: 15000,
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item: ParsedItem): string | null {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item["media:content"]?.$?.url) return item["media:content"]!.$!.url!;
  if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"]!.$!.url!;
  const html = item["content:encoded"] || item.content || "";
  const match = html.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

export type SyncResult = {
  source: string;
  found: number;
  created: number;
  error?: string;
};

/**
 * Récupère les derniers articles de chaque source RSS et crée les actus
 * manquantes (déduplication par `sourceUrl`, unique en base). Les actus
 * importées automatiquement sont publiées directement — les flux RSS sont
 * justement le moyen que ces sites proposent pour rediffuser leurs titres
 * et résumés avec un lien vers l'article original.
 * @param perSource nombre d'articles récents à considérer par flux
 */
export async function syncPokerNews(perSource = 10): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const source of POKER_NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.feedUrl);
      const items = (feed.items || []).slice(0, perSource);
      let created = 0;

      for (const item of items) {
        if (!item.link || !item.title) continue;

        const rawSummary = item.contentSnippet || stripHtml(item.content || item.summary || "");
        const summary = rawSummary.slice(0, 600) || item.title;

        const existing = await prisma.pokerNewsItem.findUnique({
          where: { sourceUrl: item.link },
        });
        if (existing) continue;

        await prisma.pokerNewsItem.create({
          data: {
            title: item.title.slice(0, 160),
            summary,
            sourceName: source.name,
            sourceUrl: item.link,
            imageUrl: extractImage(item),
            category: item.categories?.[0] || source.defaultCategory,
            status: "PUBLIE",
            autoImported: true,
            submittedByName: `Synchronisation automatique, ${source.name}`,
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          },
        });
        created++;
      }

      results.push({ source: source.name, found: items.length, created });
    } catch (err) {
      results.push({
        source: source.name,
        found: 0,
        created: 0,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }

  return results;
}

// Le ménage après synchro (ne garder que les publications les plus
// récentes) vit désormais dans lib/contentPruning.ts (pruneOldPublishedPokerNews),
// partagé avec les autres points de publication — voir
// app/api/poker-news/sync/route.ts.
