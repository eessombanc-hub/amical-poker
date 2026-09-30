import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/strategie/:id/like — bascule le "j'aime" de l'utilisateur
 * connecté sur un article de stratégie (identifié par son id, pas son
 * slug, pour rester au même paramètre dynamique que
 * app/api/strategie/[id]/route.ts — deux segments [slug] et [id]
 * cohabitant sous app/api/strategie/ n'est pas autorisé par Next.js).
 * Même principe que /api/news/:id/like : un like par compte et par
 * article (contrainte unique StrategieArticleLike.articleId+userId).
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Connectez-vous pour aimer cet article." }, { status: 401 });
  }

  const article = await prisma.strategieArticle.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });
  if (!article || article.status !== "PUBLIE") {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }

  const existing = await prisma.strategieArticleLike.findUnique({
    where: { articleId_userId: { articleId: article.id, userId } },
  });

  if (existing) {
    await prisma.strategieArticleLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.strategieArticleLike.create({ data: { articleId: article.id, userId } });
  }

  const count = await prisma.strategieArticleLike.count({ where: { articleId: article.id } });
  return NextResponse.json({ liked: !existing, count });
}
