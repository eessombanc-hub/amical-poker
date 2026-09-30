import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Recherche du site utilisée par la mascotte d'accueil (components/HelperMascot.tsx).
 * Combine deux sources :
 *  - une liste statique des pages principales (toujours pertinente, même
 *    sans base de données, ex. build sans DATABASE_URL) ;
 *  - une recherche dynamique dans le contenu publié (actus poker, fiches
 *    stratégie, actualités du club) sur titre/résumé, insensible à la casse.
 * Public et en lecture seule : aucune donnée sensible, pas d'authentification
 * requise (une visiteuse ou un visiteur non connecté doit pouvoir chercher
 * "adhésion" ou "calendrier" avant même de créer un compte).
 */

export type SiteSearchResult = {
  title: string;
  description: string;
  url: string;
  kind: "page" | "actu" | "strategie" | "vie-du-club";
};

const STATIC_PAGES: SiteSearchResult[] = [
  {
    title: "Rejoindre le club",
    description: "Faire une demande d'adhésion : pseudo, e-mail, mot de passe.",
    url: "/demande-adhesion",
    kind: "page",
  },
  {
    title: "Accès invité",
    description: "Demander un accès invité pour participer au forum sans être membre.",
    url: "/demande-invite",
    kind: "page",
  },
  {
    title: "Connexion",
    description: "Se connecter à l'espace membre ou à l'espace invité du club.",
    url: "/connexion",
    kind: "page",
  },
  {
    title: "Espace membre",
    description: "Profil, inscriptions aux manches et informations réservées aux membres.",
    url: "/espace-membre",
    kind: "page",
  },
  {
    title: "Calendrier",
    description: "Toutes les dates, horaires et lieux des prochaines manches.",
    url: "/calendrier",
    kind: "page",
  },
  {
    title: "Classement",
    description: "Classement de la saison, barème des points MTT et Deepstack.",
    url: "/classement",
    kind: "page",
  },
  {
    title: "Résultats",
    description: "Résultats détaillés de chaque manche jouée.",
    url: "/resultats",
    kind: "page",
  },
  {
    title: "Gazette Poker",
    description: "Toute l'actualité poker : circuit, stratégie, résultats en direct.",
    url: "/poker-news",
    kind: "page",
  },
  {
    title: "Stratégie",
    description: "Fiches pédagogiques pour progresser, du débutant au joueur avancé.",
    url: "/strategie",
    kind: "page",
  },
  {
    title: "Actualités du club",
    description: "Les annonces et temps forts de la vie associative du club.",
    url: "/actualites",
    kind: "page",
  },
  {
    title: "Vie du club",
    description: "Portraits de membres et moments partagés au sein de l'association.",
    url: "/vie-du-club",
    kind: "page",
  },
  {
    title: "Galerie",
    description: "Photos des manches et des événements du club.",
    url: "/galerie",
    kind: "page",
  },
  {
    title: "Événements",
    description: "Les événements spéciaux organisés par le club.",
    url: "/evenements",
    kind: "page",
  },
  {
    title: "Forum",
    description: "Échanges entre membres et invités du club.",
    url: "/forum",
    kind: "page",
  },
  {
    title: "Partenaires",
    description: "Les partenaires qui soutiennent l'Amical Poker Club.",
    url: "/partenaires",
    kind: "page",
  },
  {
    title: "Boutique",
    description: "Les produits et goodies du club.",
    url: "/boutique",
    kind: "page",
  },
  {
    title: "L'association",
    description: "Présentation, bureau et statuts de l'association.",
    url: "/association",
    kind: "page",
  },
  {
    title: "Contact",
    description: "Contacter le bureau de l'Amical Poker Club.",
    url: "/contact",
    kind: "page",
  },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q") ?? "";
  const q = raw.trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const nq = normalize(q);

  const staticMatches = STATIC_PAGES.filter(
    (p) => normalize(p.title).includes(nq) || normalize(p.description).includes(nq)
  );

  let dynamicMatches: SiteSearchResult[] = [];
  try {
    const [pokerNews, strategie, news] = await Promise.all([
      prisma.pokerNewsItem.findMany({
        where: {
          status: "PUBLIE",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
      prisma.strategieArticle.findMany({
        where: {
          status: "PUBLIE",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { excerpt: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
      }),
      prisma.news.findMany({
        where: {
          status: "PUBLIE",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    dynamicMatches = [
      ...pokerNews.map((n) => ({
        title: n.title,
        description: n.summary,
        url: `/poker-news/${n.id}`,
        kind: "actu" as const,
      })),
      ...strategie.map((a) => ({
        title: a.title,
        description: a.excerpt,
        url: `/strategie/${a.slug}`,
        kind: "strategie" as const,
      })),
      ...news.map((n) => ({
        title: n.title,
        description: n.body.slice(0, 140),
        url: `/actualites#${n.id}`,
        kind: "vie-du-club" as const,
      })),
    ];
  } catch {
    // Base de données non disponible : on se contente des pages statiques.
    dynamicMatches = [];
  }

  const results = [...dynamicMatches, ...staticMatches].slice(0, 10);
  return NextResponse.json({ results });
}
