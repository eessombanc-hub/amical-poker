import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Rubriques suivies pour le point de nouveauté affiché dans l'espace membre
// (voir app/espace-membre/page.tsx) — chaque clé correspond à un champ
// lastSeen*At sur User (voir prisma/schema.prisma).
const SECTION_FIELD = {
  forum: "lastSeenForumAt",
  "poker-news": "lastSeenPokerNewsAt",
  "forum-bureau": "lastSeenForumBureauAt",
  galerie: "lastSeenGalerieAt",
  strategie: "lastSeenStrategieAt",
} as const;

const bodySchema = z.object({
  section: z.enum(["forum", "poker-news", "forum-bureau", "galerie", "strategie"]),
});

/**
 * POST /api/member/mark-seen — appelé par components/MarkSectionSeen.tsx à
 * chaque visite d'une des rubriques suivies, pour marquer son contenu comme
 * consulté par le membre connecté. Volontairement silencieux et tolérant à
 * l'échec (pas de session, requête invalide...) : ne doit jamais gêner la
 * navigation, comme /api/track-visit.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ ok: true });

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: true });

    const field = SECTION_FIELD[parsed.data.section];
    await prisma.user.update({ where: { id: userId }, data: { [field]: new Date() } });
  } catch {
    // Silencieux : ne doit jamais faire échouer la navigation de l'utilisateur.
  }
  return NextResponse.json({ ok: true });
}
