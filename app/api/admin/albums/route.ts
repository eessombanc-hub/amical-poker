import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.enum(["PHOTO", "VIDEO"]).default("PHOTO"),
  seasonId: z.string().optional().nullable(),
});

/**
 * GET /api/admin/albums — liste tous les albums avec leurs photos et vidéos.
 * POST /api/admin/albums — crée un album, de type PHOTO (par défaut, pour
 * rester compatible avec les appels existants) ou VIDEO.
 * Réservé RESPONSABLE+ (BUREAU et ADMIN inclus, cf. hiérarchie des rôles).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const albums = await prisma.album.findMany({
    include: { photos: true, videos: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json(albums);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const album = await prisma.album.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      seasonId: parsed.data.seasonId || null,
    },
    include: { photos: true, videos: true },
  });
  return NextResponse.json(album, { status: 201 });
}
