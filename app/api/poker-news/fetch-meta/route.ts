import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";

/**
 * GET /api/poker-news/fetch-meta?url=... — pour les sources sans flux RSS
 * (Winamax notamment) : récupère juste les balises Open Graph (og:title,
 * og:description, og:image) de la page pour pré-remplir le formulaire
 * d'ajout manuel. On ne récupère qu'un résumé public destiné à l'aperçu de
 * lien (le même mécanisme que l'aperçu d'un lien partagé sur Slack ou
 * Twitter) — jamais le contenu complet de l'article.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; APCVPokerBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    const pick = (prop: string) => {
      const re = new RegExp(
        `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`,
        "i"
      );
      const match = html.match(re) || html.match(new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`,
        "i"
      ));
      return match ? match[1] : null;
    };

    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);

    return NextResponse.json({
      title: pick("og:title") || (titleMatch ? titleMatch[1] : null),
      summary: pick("og:description"),
      imageUrl: pick("og:image"),
      sourceUrl: url,
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible de récupérer les informations de ce lien." },
      { status: 502 }
    );
  }
}
