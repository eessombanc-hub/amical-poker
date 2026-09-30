import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pruneOldPublishedPokerNews } from "@/lib/contentPruning";

const patchSchema = z.object({
  action: z.enum(["publier", "rejeter"]),
});

// PATCH /api/poker-news/:id — valider (publier) ou rejeter une actu en attente. Réservé BUREAU/ADMIN.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = (session.user as any).id as string;

  const item = await prisma.pokerNewsItem.update({
    where: { id: params.id },
    data:
      parsed.data.action === "publier"
        ? { status: "PUBLIE", publishedAt: new Date(), validatedById: userId }
        : { status: "REJETE", validatedById: userId },
  });

  // Ne garde que les 15 actus Gazette Poker publiées les plus récentes —
  // voir lib/contentPruning.ts.
  if (parsed.data.action === "publier") {
    after(() => pruneOldPublishedPokerNews());
  }

  return NextResponse.json(item);
}

// DELETE /api/poker-news/:id — supprime une actu. Réservé BUREAU/ADMIN.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  await prisma.pokerNewsItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
