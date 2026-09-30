import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyBureauNewsPublished } from "@/lib/socialAnnounce";
import { pruneOldPublishedNews } from "@/lib/contentPruning";
import { z } from "zod";

const bodySchema = z.object({ status: z.enum(["PUBLIE", "DEPUBLIE", "BROUILLON"]) });

/**
 * PATCH /api/news/:id — publie/dépublie une actu (utilisé notamment pour
 * relire et valider les annonces importées automatiquement depuis le site
 * historique, cf. /admin/site-historique). Réservé au bureau.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const before = await prisma.news.findUnique({ where: { id: params.id } });

  const news = await prisma.news.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      publishAt: parsed.data.status === "PUBLIE" ? new Date() : undefined,
    },
  });

  // Annonce réseaux sociaux uniquement au moment où l'actu bascule
  // réellement en publié (jamais sur une republication ou une dépublication)
  // — voir lib/socialAnnounce.ts. Best-effort, ne bloque jamais la réponse.
  if (parsed.data.status === "PUBLIE" && before?.status !== "PUBLIE") {
    after(() => notifyBureauNewsPublished({ id: news.id, title: news.title, body: news.body }));
    // Ne garde que les 15 actualités publiées les plus récentes — voir
    // lib/contentPruning.ts.
    after(() => pruneOldPublishedNews());
  }

  return NextResponse.json({ news });
}
