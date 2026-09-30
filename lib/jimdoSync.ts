import * as cheerio from "cheerio";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Synchronisation avec l'ancien site du club (Jimdo), qui reste la
 * référence pour certaines informations : annonces du bureau, partenaires,
 * calendrier détaillé, photos. Jimdo ne propose ni flux RSS ni API : on
 * récupère donc directement le HTML public des pages du site — un site qui
 * appartient au club lui-même, donc sans les réserves qui s'appliquent aux
 * sources externes (voir lib/pokerNewsSync.ts pour Winamax).
 *
 * Chaque page est identifiée par son URL (`sourceUrl`, unique en base) et
 * un hash de son contenu texte (`sourceHash`) : si le hash n'a pas changé
 * depuis le dernier passage, on ne touche à rien. Le HTML de ce site étant
 * généré par l'éditeur Jimdo Creator, le conteneur `#cc-tp-content` (le
 * bloc de contenu de la page, hors navigation/pied de page/barre latérale)
 * est stable d'une page à l'autre — si Jimdo change un jour cette
 * structure, seul ce fichier aura besoin d'être ajusté.
 */

const BASE_URL = "https://amicalpokerclub.jimdofree.com";

// Page de la saison en cours sur le site historique — sert à la fois de
// repère pour trouver le lien "Calendrier" (syncCalendrier) et de source
// directe pour le tableau de classement (syncClassement), affiché sur cette
// même page. À mettre à jour à chaque nouvelle saison.
const CURRENT_SEASON_URL = BASE_URL + "/saison-2026-2027-1/";

const UA =
  "Mozilla/5.0 (compatible; APCV-SiteSync/1.0; +https://amicalpokerclub.jimdofree.com)";

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function fetchPage(url: string): Promise<ReturnType<typeof cheerio.load>> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  const html = await res.text();
  return cheerio.load(html);
}

/**
 * Racine du contenu d'une page — hors navigation/pied de page/barre latérale.
 * Jimdo insère, à côté du vrai texte, un <script> de configuration pour
 * chaque image ("module_imageSubtitle" etc.) : cheerio traite ce script
 * comme un nœud de texte ordinaire, donc sans le retirer, `.text()` renvoie
 * du code JS mélangé au vrai contenu (voire à sa place). On travaille sur un
 * clone pour ne pas perturber les autres extractions (tableaux, images) qui
 * lisent aussi cette racine.
 */
function contentRoot($: ReturnType<typeof cheerio.load>) {
  const root = $("#cc-tp-content").first().clone();
  root.find("script, style, noscript").remove();
  return root;
}

/** Premier lien externe cliquable (<a href="http…">) dans la racine donnée, s'il existe. */
function firstAnchorHref(root: ReturnType<typeof contentRoot>): string | null {
  const href = root.find('a[href^="http"]').first().attr("href");
  return href || null;
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Résout un href tel qu'émis par Jimdo (parfois absolu, parfois relatif au
 * site — Jimdo a changé ce comportement selon les pages/mises à jour) en URL
 * absolue sur le site historique. Retourne null pour un lien externe.
 */
function resolveJimdoHref(href: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, BASE_URL);
    return url.origin === new URL(BASE_URL).origin ? url.toString() : null;
  } catch {
    return null;
  }
}

function subnavLinks($: ReturnType<typeof cheerio.load>): { text: string; href: string }[] {
  const links: { text: string; href: string }[] = [];
  $("#cc-tp-subnav a, #cc-tp-sidebar a").each((_, el) => {
    const rawHref = $(el).attr("href") || "";
    const text = cleanText($(el).text());
    const href = resolveJimdoHref(rawHref);
    if (!text || !href) return;
    links.push({ text, href });
  });
  return links;
}

export type SyncResult = {
  section: string;
  found: number;
  created: number;
  updated: number;
  // Nombre de fiches Member mises à jour par rapprochement de nom — voir
  // matchMemberIdByName, utilisé par syncClassement.
  membersMatched?: number;
  error?: string;
};

/** Normalise un nom pour comparaison : minuscules, sans accents, espaces réduits. */
export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type MatchableMember = { id: string; firstName: string; lastName: string; nickname: string };

/**
 * Retrouve la fiche Member correspondant à un nom tel qu'il apparaît dans le
 * tableau de classement du site historique (ex. "Jean DUPONT", "Dupont Jean"
 * ou un pseudo). Comparaison exacte d'abord (pseudo, "prénom nom", "nom
 * prénom"), puis, seulement si un seul membre correspond, un repli plus
 * souple (prénom ET nom retrouvés comme mots entiers dans le texte) — pour
 * ne jamais rattacher une place de classement au mauvais membre en cas
 * d'ambiguïté.
 */
function matchMemberIdByName(rawName: string, members: MatchableMember[]): string | null {
  const needle = normalizeName(rawName);
  if (!needle) return null;

  for (const m of members) {
    const nickname = normalizeName(m.nickname);
    const fl = normalizeName(`${m.firstName} ${m.lastName}`);
    const lf = normalizeName(`${m.lastName} ${m.firstName}`);
    if (needle === nickname || needle === fl || needle === lf) return m.id;
  }

  const candidates = members.filter((m) => {
    const first = normalizeName(m.firstName);
    const last = normalizeName(m.lastName);
    const words = needle.split(" ");
    return words.includes(first) && words.includes(last);
  });
  return candidates.length === 1 ? candidates[0].id : null;
}

// ── 1. Annonces (Infos / Édito) → News (statut BROUILLON pour relecture) ──

const ANNOUNCEMENT_PAGES = [
  { url: BASE_URL + "/", category: "INFORMATIONS" as const, fallbackTitle: "Infos du site historique" },
  { url: BASE_URL + "/edito/", category: "VIE_DU_CLUB" as const, fallbackTitle: "Édito du site historique" },
];

export async function syncAnnonces(): Promise<SyncResult> {
  let created = 0;
  let updated = 0;
  let found = 0;
  try {
    for (const page of ANNOUNCEMENT_PAGES) {
      const $ = await fetchPage(page.url);
      const text = cleanText(contentRoot($).text());
      if (!text) continue;
      found++;
      const title = cleanText($("title").first().text()).split(" - ")[0] || page.fallbackTitle;
      const hash = sha256(text);
      const body = text.slice(0, 4000);

      const existing = await prisma.news.findUnique({ where: { sourceUrl: page.url } });
      if (!existing) {
        await prisma.news.create({
          data: {
            title,
            body,
            category: page.category,
            authorId: "sync-jimdo",
            status: "BROUILLON", // relecture obligatoire par le bureau avant publication
            autoImported: true,
            sourceUrl: page.url,
            sourceHash: hash,
          },
        });
        created++;
      } else if (existing.sourceHash !== hash) {
        await prisma.news.update({
          where: { id: existing.id },
          data: { title, body, sourceHash: hash, status: "BROUILLON" },
        });
        updated++;
      }
    }
    return { section: "Annonces (Infos/Édito)", found, created, updated };
  } catch (err) {
    return {
      section: "Annonces (Infos/Édito)",
      found,
      created,
      updated,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

// ── 2. Partenaires → Partner (publiés directement : simple annuaire) ──────

export async function syncPartenaires(): Promise<SyncResult> {
  let created = 0;
  let updated = 0;
  let found = 0;
  try {
    const indexUrl = BASE_URL + "/partenaires/";
    const $index = await fetchPage(indexUrl);
    const links = subnavLinks($index).filter((l) => l.href.includes("/partenaires/") && l.href !== indexUrl);
    found = links.length;

    for (let i = 0; i < links.length; i++) {
      const { text: name, href } = links[i];
      const $ = await fetchPage(href);
      const root = contentRoot($);
      const rawText = cleanText(root.text());
      const logoUrl = root.find("img").first().attr("src") || null;
      // Le site historique donne son lien tantôt comme vrai <a href>, tantôt
      // comme simple texte brut ("http://…") dans un paragraphe — on essaie
      // le vrai lien d'abord, puis on retombe sur le texte.
      const urlMatch = rawText.match(/https?:\/\/[^\s]+/);
      const textUrl = urlMatch ? urlMatch[0].replace(/[).,;]+$/, "") : null;
      const websiteUrl = firstAnchorHref(root) || textUrl;
      const description = (textUrl ? rawText.replace(textUrl, "") : rawText).trim().slice(0, 1000) || null;
      const hash = sha256(rawText);

      const existing = await prisma.partner.findUnique({ where: { sourceUrl: href } });
      if (!existing) {
        await prisma.partner.create({
          data: { name, description, logoUrl, websiteUrl, position: i, sourceUrl: href, sourceHash: hash },
        });
        created++;
      } else if (existing.sourceHash !== hash) {
        await prisma.partner.update({
          where: { id: existing.id },
          data: { name, description, logoUrl, websiteUrl, position: i, sourceHash: hash },
        });
        updated++;
      }
    }
    return { section: "Partenaires", found, created, updated };
  } catch (err) {
    return {
      section: "Partenaires",
      found,
      created,
      updated,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

// ── 3. Calendrier détaillé → LegacyCalendarSnapshot (référence, lecture seule) ──

export async function syncCalendrier(): Promise<SyncResult> {
  try {
    const seasonUrl = CURRENT_SEASON_URL;
    const $season = await fetchPage(seasonUrl);
    const calLink = subnavLinks($season).find((l) => /calendrier/i.test(l.text));
    if (!calLink) {
      return { section: "Calendrier détaillé", found: 0, created: 0, updated: 0, error: "Page calendrier introuvable" };
    }

    const $ = await fetchPage(calLink.href);
    const root = contentRoot($);
    const rawText = cleanText(root.text());
    const hash = sha256(rawText);

    const existing = await prisma.legacyCalendarSnapshot.findUnique({ where: { sourceUrl: calLink.href } });
    if (existing && existing.sourceHash === hash) {
      return { section: "Calendrier détaillé", found: 1, created: 0, updated: 0 };
    }

    // Essai d'extraction en tableau structuré (lignes <tr>) — repli sur le texte brut sinon.
    let rows: { date: string; tournoi: string; heure: string; lieu: string }[] | null = null;
    const trs = root.find("table tr").toArray();
    if (trs.length > 1) {
      const parsed = trs
        .slice(1)
        .map((tr) => {
          const cells = $(tr)
            .find("td, th")
            .toArray()
            .map((td) => cleanText($(td).text()));
          return { date: cells[0] || "", tournoi: cells[1] || "", heure: cells[2] || "", lieu: cells[3] || "" };
        })
        .filter((r) => r.date);
      if (parsed.length > 0) rows = parsed;
    }

    const data = {
      label: cleanText($("title").first().text()).split(" - ")[0] || "Calendrier",
      sourceHash: hash,
      rows: rows as any,
      rawText: rawText.slice(0, 8000),
    };

    if (!existing) {
      await prisma.legacyCalendarSnapshot.create({ data: { ...data, sourceUrl: calLink.href } });
      return { section: "Calendrier détaillé", found: 1, created: 1, updated: 0 };
    }
    await prisma.legacyCalendarSnapshot.update({ where: { id: existing.id }, data });
    return { section: "Calendrier détaillé", found: 1, created: 0, updated: 1 };
  } catch (err) {
    return {
      section: "Calendrier détaillé",
      found: 0,
      created: 0,
      updated: 0,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

// ── 4. Classement de la saison → LegacyRankingSnapshot + fiches Member ──
//
// Le site historique publie un tableau unique (généré par un export
// "tableizer") combinant deux classements côte à côte sur la page de la
// saison en cours : le classement général (points) sur les colonnes 0-7,
// puis — après une colonne vide de séparation — le classement "têtes" (KO)
// sur les colonnes 9-12. En plus de la photo brute (LegacyRankingSnapshot),
// chaque ligne du classement général est rapprochée par nom d'une fiche
// Member (voir matchMemberIdByName) pour tenir sa place de classement
// (Member.legacyRankingPlace) automatiquement à jour à chaque synchronisation
// — y compris quand la page du site historique n'a pas changé depuis la
// dernière fois, pour couvrir le cas d'un nouveau membre créé entre-temps.

export async function syncClassement(): Promise<SyncResult> {
  try {
    const seasonUrl = CURRENT_SEASON_URL;
    const $ = await fetchPage(seasonUrl);
    const root = contentRoot($);
    const rawText = cleanText(root.text());
    const hash = sha256(rawText);

    const existing = await prisma.legacyRankingSnapshot.findUnique({ where: { sourceUrl: seasonUrl } });
    const unchanged = !!existing && existing.sourceHash === hash;

    let rows: Record<string, string>[] | null = unchanged ? (existing!.rows as any) : null;
    let headsRows: Record<string, string>[] | null = unchanged ? (existing!.headsRows as any) : null;

    if (!unchanged) {
      const trs = root.find("table tbody tr").toArray();
      if (trs.length > 0) {
        const parsedRows: Record<string, string>[] = [];
        const parsedHeads: Record<string, string>[] = [];
        for (const tr of trs) {
          const cells = $(tr)
            .find("td")
            .toArray()
            .map((td) => cleanText($(td).text()));
          if (cells[0] && cells[1]) {
            parsedRows.push({
              place: cells[0],
              joueur: cells[1],
              points: cells[2] || "",
              pj: cells[3] || "",
              pg: cells[4] || "",
              bonus: cells[5] || "",
              ratio: cells[6] || "",
              tf: cells[7] || "",
            });
          }
          if (cells[9] && cells[10]) {
            parsedHeads.push({
              place: cells[9],
              joueur: cells[10],
              tetes: cells[11] || "",
              ratio: cells[12] || "",
            });
          }
        }
        if (parsedRows.length > 0) rows = parsedRows;
        if (parsedHeads.length > 0) headsRows = parsedHeads;
      }

      const data = {
        label: `Classement, ${cleanText($("title").first().text()).split(" - ")[0] || "Saison en cours"}`,
        sourceHash: hash,
        rows: rows as any,
        headsRows: headsRows as any,
        rawText: rawText.slice(0, 8000),
      };
      if (!existing) {
        await prisma.legacyRankingSnapshot.create({ data: { ...data, sourceUrl: seasonUrl } });
      } else {
        await prisma.legacyRankingSnapshot.update({ where: { id: existing.id }, data });
      }
    }

    // Rapprochement par nom → fiches Member (place de classement uniquement,
    // jamais les points — ceux-ci restent portés par Ranking, recalculé
    // depuis les résultats saisis sur ce site une fois la saison en cours).
    let membersMatched = 0;
    if (rows && rows.length > 0) {
      const members = await prisma.member.findMany({
        select: { id: true, firstName: true, lastName: true, nickname: true },
      });
      for (const row of rows) {
        const place = parseInt(row.place, 10);
        if (!row.joueur || Number.isNaN(place)) continue;
        const memberId = matchMemberIdByName(row.joueur, members);
        if (!memberId) continue;
        await prisma.member.update({
          where: { id: memberId },
          data: { legacyRankingPlace: place, legacyRankingUpdatedAt: new Date() },
        });
        membersMatched++;
      }
    }

    return {
      section: "Classement (site historique)",
      found: 1,
      created: !existing && !unchanged ? 1 : 0,
      updated: existing && !unchanged ? 1 : 0,
      membersMatched,
    };
  } catch (err) {
    return {
      section: "Classement (site historique)",
      found: 0,
      created: 0,
      updated: 0,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

// ── 5. Photos → Photo (publiées directement dans un album dédié) ─────────

const LEGACY_ALBUM_TITLE = "Photos historiques (site Jimdo)";

export async function syncPhotos(): Promise<SyncResult> {
  let created = 0;
  let found = 0;
  try {
    const $ = await fetchPage(BASE_URL + "/photos/");
    const root = contentRoot($);
    const srcs = Array.from(
      new Set(
        root
          .find("img")
          .toArray()
          .map((img) => $(img).attr("src") || "")
          .filter((src) => src.startsWith("http"))
      )
    );
    found = srcs.length;
    if (srcs.length === 0) return { section: "Photos (galerie)", found: 0, created: 0, updated: 0 };

    let album = await prisma.album.findFirst({ where: { title: LEGACY_ALBUM_TITLE } });
    if (!album) {
      album = await prisma.album.create({ data: { title: LEGACY_ALBUM_TITLE } });
    }

    for (const src of srcs) {
      const existing = await prisma.photo.findUnique({ where: { sourceUrl: src } });
      if (existing) continue;
      await prisma.photo.create({ data: { albumId: album.id, photoUrl: src, sourceUrl: src } });
      created++;
    }
    return { section: "Photos (galerie)", found, created, updated: 0 };
  } catch (err) {
    return {
      section: "Photos (galerie)",
      found,
      created,
      updated: 0,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

// ── 6. Boutique (t-shirt/polo/veste/écusson) → LegacyBoutiqueSnapshot ────
//
// Page unique listant les articles sous forme de paragraphes "Nom : prix
// euros" (ou "Nom à prix euros l'unité" pour l'écusson), chacun suivi de
// précisions de tailles puis, pour les vêtements floqués, d'un lien vers le
// fournisseur (textileeurope.com). On tente une extraction ligne par ligne ;
// le texte brut complet (conditions de commande, contact du bureau...) reste
// de toute façon conservé en repli.

const BOUTIQUE_URL = BASE_URL + "/infos/commande-vetements-apcv/";

type BoutiqueItem = { name: string; price: string; sizes: string | null; productUrl: string | null };

function extractBoutiqueItems(root: ReturnType<typeof contentRoot>, $: ReturnType<typeof cheerio.load>): BoutiqueItem[] {
  const paragraphs = root.find("p").toArray();
  const items: BoutiqueItem[] = [];
  const priceRegex = /^(.+?)\s*(?::|à)\s*(\d+)\s*(?:€|euros?)/i;

  for (let i = 0; i < paragraphs.length; i++) {
    const text = cleanText($(paragraphs[i]).text());
    if (!text) continue;
    const match = text.match(priceRegex);
    if (!match) continue;

    const name = match[1].trim();
    const price = `${match[2]} €`;
    let sizes: string | null = null;
    let productUrl: string | null = null;

    for (let j = i + 1; j < Math.min(i + 6, paragraphs.length); j++) {
      const nextText = cleanText($(paragraphs[j]).text());
      // On s'arrête si on tombe sur le prochain article avant d'avoir tout trouvé.
      if (j > i + 1 && priceRegex.test(nextText)) break;
      if (!sizes && /homme|femme/i.test(nextText)) sizes = nextText;
      if (!productUrl) {
        const href = $(paragraphs[j]).find('a[href^="http"]').first().attr("href");
        if (href) productUrl = href;
      }
      if (sizes && productUrl) break;
    }

    items.push({ name, price, sizes, productUrl });
  }
  return items;
}

export async function syncBoutique(): Promise<SyncResult> {
  try {
    const $ = await fetchPage(BOUTIQUE_URL);
    const root = contentRoot($);
    const rawText = cleanText(root.text());
    if (!rawText) return { section: "Boutique (vêtements APCV)", found: 0, created: 0, updated: 0 };
    const hash = sha256(rawText);

    const existing = await prisma.legacyBoutiqueSnapshot.findUnique({ where: { sourceUrl: BOUTIQUE_URL } });
    if (existing && existing.sourceHash === hash) {
      return { section: "Boutique (vêtements APCV)", found: 1, created: 0, updated: 0 };
    }

    const items = extractBoutiqueItems(root, $);
    const data = {
      label: "Boutique, vêtements APCV",
      sourceHash: hash,
      items: (items.length > 0 ? items : null) as any,
      rawText: rawText.slice(0, 8000),
    };

    if (!existing) {
      await prisma.legacyBoutiqueSnapshot.create({ data: { ...data, sourceUrl: BOUTIQUE_URL } });
      return { section: "Boutique (vêtements APCV)", found: 1, created: 1, updated: 0 };
    }
    await prisma.legacyBoutiqueSnapshot.update({ where: { id: existing.id }, data });
    return { section: "Boutique (vêtements APCV)", found: 1, created: 0, updated: 1 };
  } catch (err) {
    return {
      section: "Boutique (vêtements APCV)",
      found: 0,
      created: 0,
      updated: 0,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

export async function syncJimdoSite(): Promise<SyncResult[]> {
  return [
    await syncAnnonces(),
    await syncPartenaires(),
    await syncCalendrier(),
    await syncClassement(),
    await syncPhotos(),
    await syncBoutique(),
  ];
}
