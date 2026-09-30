import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyBureauPortraitPublished } from "@/lib/socialAnnounce";
import { z } from "zod";

const bodySchema = z.object({
  displayName: z.string().min(1),
  role: z.string().optional().nullable(),
  bio: z.string().min(1),
  photoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  published: z.boolean().optional(),
});

/** GET /api/portraits — liste tous les portraits (bureau, pour administration). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }
  const portraits = await prisma.portrait.findMany({ orderBy: [{ position: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json({ portraits });
}

/** POST /api/portraits — crée un nouveau portrait (bureau uniquement). */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "BUREAU")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const portrait = await prisma.portrait.create({
    data: {
      displayName: parsed.data.displayName,
      role: parsed.data.role || null,
      bio: parsed.data.bio,
      photoUrl: parsed.data.photoUrl || null,
      published: parsed.data.published ?? false,
    },
  });

  // Annonce réseaux sociaux si le portrait est créé déjà publié — voir
  // lib/socialAnnounce.ts. Best-effort, ne bloque jamais la réponse.
  if (portrait.published) {
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
