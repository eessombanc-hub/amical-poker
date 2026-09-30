import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pruneOldPublishedPokerNews } from "@/lib/contentPruning";

const newsSchema = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().min(10).max(1200),
  sourceName: z.string().min(2).max(80),
  sourceUrl: z.string().url(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  category: z.string().min(1),
});

// GET /api/poker-news — liste publique des actus publiées.
// GET /api/poker-news?all=1 — réservé BUREAU/ADMIN : toutes les actus (y compris à valider / rejetées).
export async function GET(req: NextRequest) {
  const wantsAll = req.nextUrl.searchParams.get("all") === "1";

  if (wantsAll) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }
    const items = await prisma.pokerNewsItem.findMany({ orderBy: { fetchedAt: "desc" } });
    return NextResponse.json(items);
  }

  const items = await prisma.pokerNewsItem.findMany({
    where: { status: "PUBLIE" },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json(items);
}

// POST /api/poker-news — publication manuelle d'une actu poker (RESPONSABLE minimum).
// Un membre RESPONSABLE crée une actu "à valider" ; BUREAU/ADMIN publie directement.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json(
      { error: "Réservé aux responsables et au bureau." },
      { status: 403 }
    );
  }

  const parsed = newsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id as string;
  const submittedByName = (session.user as any).nickname || session.user.name || session.user.email;
  const autoPublish = hasRole(role, "BUREAU");

  const item = await prisma.pokerNewsItem.create({
    data: {
      ...parsed.data,
      imageUrl: parsed.data.imageUrl || null,
      submittedById: userId,
      submittedByName,
      status: autoPublish ? "PUBLIE" : "A_VALIDER",
      publishedAt: autoPublish ? new Date() : null,
      validatedById: autoPublish ? userId : null,
    },
  });

  // Ne garde que les 15 actus Gazette Poker publiées les plus récentes —
  // voir lib/contentPruning.ts.
  if (autoPublish) {
    after(() => pruneOldPublishedPokerNews());
  }

  return NextResponse.json(item, { status: 201 });
}
