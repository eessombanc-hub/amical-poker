import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/gallery/photos/:id/like — bascule le "j'aime" de l'utilisateur
 * connecté sur une photo de la Galerie (app/galerie). Même principe que
 * /api/news/:id/like : un like par compte et par photo (contrainte unique
 * PhotoLike.photoId+userId, voir prisma/schema.prisma). Ouvert à tout
 * compte connecté (membre ou invité), la Galerie leur étant réservée à
 * tous deux.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Connectez-vous pour aimer une photo." }, { status: 401 });
  }

  const photo = await prisma.photo.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!photo) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  const existing = await prisma.photoLike.findUnique({
    where: { photoId_userId: { photoId: params.id, userId } },
  });

  if (existing) {
    await prisma.photoLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.photoLike.create({ data: { photoId: params.id, userId } });
  }

  const count = await prisma.photoLike.count({ where: { photoId: params.id } });
  return NextResponse.json({ liked: !existing, count });
}
