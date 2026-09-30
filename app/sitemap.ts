import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/association`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/calendrier`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/classement`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/resultats`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/actualites`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/poker-news`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/strategie`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/vie-du-club`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/evenements`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/galerie`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/partenaires`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/boutique`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ] as const;

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((entry) => ({
    ...entry,
    lastModified: now,
  }));

  let strategieRoutes: MetadataRoute.Sitemap = [];
  try {
    const articles = await prisma.strategieArticle.findMany({
      where: { status: "PUBLIE" },
      select: { slug: true, updatedAt: true },
    });
    strategieRoutes = articles.map((a) => ({
      url: `${SITE_URL}/strategie/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    }));
  } catch {
    strategieRoutes = [];
  }

  // Sous-pages de classement par manche et par événement — voir
  // app/classement/manche/[id] et app/classement/evenement/[id].
  let roundRoutes: MetadataRoute.Sitemap = [];
  try {
    const rounds = await prisma.round.findMany({ select: { id: true, date: true } });
    roundRoutes = rounds.map((r) => ({
      url: `${SITE_URL}/classement/manche/${r.id}`,
      lastModified: r.date,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  } catch {
    roundRoutes = [];
  }

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const events = await prisma.event.findMany({ select: { id: true, date: true } });
    eventRoutes = events.map((ev) => ({
      url: `${SITE_URL}/classement/evenement/${ev.id}`,
      lastModified: ev.date,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  } catch {
    eventRoutes = [];
  }

  return [...staticEntries, ...strategieRoutes, ...roundRoutes, ...eventRoutes];
}
