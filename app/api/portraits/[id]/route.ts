import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyBureauPortraitPublished } from "@/lib/socialAnnounce";
import { z } from "zod";

const bodySchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.string().optional().nullable(),
  bio: z.string().min(1).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  published: z.boolean().optional(),
  position: z.number().int().optional(),
});

/** PATCH /api/portraits/:id — modifie un portrait (publication, contenu…). */
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

  const before = await prisma.portrait.findUnique({ where: { id: params.id } });

  const { photoUrl, ...rest } = parsed.data;
  const portrait = await prisma.portrait.update({
    where: { id: params.id },
    data: { ...rest, ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}) },
  });

  // Annonce réseaux sociaux uniquement au moment où le portrait bascule
  // réellement en publié — voir lib/socialAnnounce.ts. Best-effort, ne
  // bloque jamais la réponse.
  if (portrait.published && !before?.published) {
    after(() =>
      notifyBureauPortraitPublished({
        id: portrait.id,
        displayName: portrait.displayName,
        role: portrait.role,
        bio: portrait.bio,
      })
    );
  }

  return NextResponse.json({ portrait });
}

/** DELETE /api/portraits/:id — supprime un portrait. */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }
  await prisma.portrait.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
