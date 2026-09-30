import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Flux RSS de la Gazette Poker (voir audit-site-apcv.md) : permet de
// relayer automatiquement chaque actu publiée ailleurs (Discord, réseaux
// sociaux, lecteur RSS) sans travail manuel supplémentaire, et donne à
// Google une source de plus pour repérer le contenu récent du site. Reprend
// les mêmes actus que /poker-news (statut PUBLIE), triées de la plus
// récente à la plus ancienne, limitées aux 30 dernières pour rester léger.
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const items = await prisma.pokerNewsItem.findMany({
    where: { status: "PUBLIE" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  const rssItems = items
    .map((item) => {
      const link = item.sourceUrl;
      const pubDate = (item.publishedAt ?? item.fetchedAt).toUTCString();
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.summary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Gazette Poker — Amical Poker Club</title>
    <link>${SITE_URL}/poker-news</link>
    <description>Actualités poker sélectionnées par l'Amical Poker Club de Villecresnes.</description>
    <language>fr-FR</language>
${rssItems}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
