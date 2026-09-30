import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/news/drafts — actus importées automatiquement (site historique)
 * en attente de relecture par le bureau. Réservé au bureau.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }
  const drafts = await prisma.news.findMany({
    where: { status: "BROUILLON", autoImported: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(drafts);
}
