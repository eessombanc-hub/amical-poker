/**
 * Utilitaires SEO centralisés : URL canonique du site, construction des
 * données structurées (JSON-LD) réutilisées par plusieurs pages.
 *
 * NEXT_PUBLIC_SITE_URL doit être positionnée avec l'URL réelle de production
 * une fois le site déployé (ex: https://www.amicalpokerclub.fr). Par défaut
 * on retombe sur un domaine provisoire pour que le balisage reste valide
 * même avant le choix définitif du nom de domaine.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.amicalpokerclub.fr";

export const SITE_NAME = "Amical Poker Club";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Schema.org : l'association elle-même (utilisé sur tout le site). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "@id": `${SITE_URL}/#organisation`,
    name: SITE_NAME,
    alternateName: "APCV",
    url: SITE_URL,
    logo: absoluteUrl("/logo-apcv.png"),
    description:
      "Association de poker loi 1901 à Villecresnes : manches régulières, classement de saison et vie associative.",
    sport: "Poker",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Villecresnes",
      addressRegion: "Val-de-Marne",
      addressCountry: "FR",
    },
  };
}

export const FORMAT_LABEL: Record<string, string> = {
  MTT: "tournoi MTT",
  DEEPSTACK: "tournoi Deepstack",
  CFEPA: "CFEPA",
};

/**
 * Décalage Europe/Paris ("+01:00" en hiver, "+02:00" en été) pour une date
 * donnée, sans dépendance externe — s'appuie sur Intl, disponible nativement
 * côté serveur (Node ≥ 18).
 */
function parisUtcOffset(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = raw.match(/GMT([+-]\d+)/);
  const hours = match ? parseInt(match[1], 10) : 1;
  return `${hours >= 0 ? "+" : "-"}${String(Math.abs(hours)).padStart(2, "0")}:00`;
}

/**
 * Combine la date d'une manche (stockée sans heure, ex. "2026-09-18") avec
 * son heure d'affichage au format club ("20h45") pour obtenir l'instant réel
 * de début, en heure de Paris — round.date seul (minuit UTC) ne suffit pas.
 */
function roundStartInstant(date: Date | string, time: string): Date {
  const base = new Date(date);
  const match = time.match(/^(\d{1,2})h(\d{2})?$/i);
  const hh = String(match ? match[1].padStart(2, "0") : "20");
  const mm = match?.[2] ?? "00";
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  const offset = parisUtcOffset(base);
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:00${offset}`);
}

/** Schema.org : une manche à venir, affichée en Event pour le rich snippet. */
export function roundEventJsonLd(round: {
  id: string;
  number: number;
  date: Date | string;
  startTime: string;
  location: string;
  format: string;
  maxSeats: number;
  registrationsCount: number;
}) {
  const start = roundStartInstant(round.date, round.startTime);
  // Durée non stockée en base (seule l'heure de départ l'est) : une manche
  // de poker associatif dure en pratique plusieurs heures, on retient une
  // estimation raisonnable de 4h pour renseigner endDate.
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const formatLabel = FORMAT_LABEL[round.format] ?? round.format;
  const remaining = Math.max(0, round.maxSeats - round.registrationsCount);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${SITE_URL}/calendrier#manche-${round.number}`,
    name: `Manche ${round.number}, Amical Poker Club`,
    description: `${formatLabel} de la Manche ${round.number} de l'Amical Poker Club (association loi 1901), à ${round.location}, Villecresnes. Ouvert aux membres du club, dans une ambiance conviviale.`,
    image: [absoluteUrl("/logo-apcv.png")],
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: round.location,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Villecresnes",
        addressRegion: "Val-de-Marne",
        addressCountry: "FR",
      },
    },
    organizer: {
      "@type": "SportsOrganization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    // Pas d'artiste ni de troupe pour un tournoi de poker associatif : c'est
    // le club lui-même, via ses membres joueurs, qui « anime » la manche —
    // renseigné pour satisfaire la recommandation Google sans inventer de
    // performer fictif.
    performer: {
      "@type": "PerformingGroup",
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/calendrier`,
      price: "0",
      priceCurrency: "EUR",
      availability:
        remaining > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      validFrom: new Date().toISOString(),
    },
    remainingAttendeeCapacity: remaining,
    maximumAttendeeCapacity: round.maxSeats,
  };
}

/** Schema.org : un article de la rubrique Stratégie & pédagogie. */
export function articleJsonLd(article: {
  slug: string;
  title: string;
  excerpt: string;
  updatedAt: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE_URL}/strategie/${article.slug}#article`,
    headline: article.title,
    description: article.excerpt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo-apcv.png"),
      },
    },
    mainEntityOfPage: absoluteUrl(`/strategie/${article.slug}`),
  };
}

/** Sérialise un objet JSON-LD en balise <script> prête à insérer dans le JSX. */
export function jsonLdScriptProps(data: unknown) {
  return {
    type: "application/ld+json" as const,
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  };
}
