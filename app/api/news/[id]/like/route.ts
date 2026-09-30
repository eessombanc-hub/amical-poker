import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/news/:id/like — bascule le "j'aime" de l'utilisateur connecté
 * sur une actu (app/actualites). Un like par compte et par actu (contrainte
 * unique NewsLike.newsId+userId, voir prisma/schema.prisma) : ce endpoint
 * crée le like s'il n'existe pas encore, le retire sinon. Réservé aux
 * comptes connectés (membres et invités) — les visiteurs anonymes voient le
 * nombre de "j'aime" mais doivent se connecter pour en poser un.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Connectez-vous pour aimer une actualité." }, { status: 401 });
  }

  const news = await prisma.news.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!news || news.status !== "PUBLIE") {
    return NextResponse.json({ error: "Actualité introuvable." }, { status: 404 });
  }

  const existing = await prisma.newsLike.findUnique({
    where: { newsId_userId: { newsId: params.id, userId } },
  });

  if (existing) {
    await prisma.newsLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.newsLike.create({ data: { newsId: params.id, userId } });
  }

  const count = await prisma.newsLike.count({ where: { newsId: params.id } });
  return NextResponse.json({ liked: !existing, count });
}
