import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ direction: z.enum(["up", "down"]) });

/**
 * POST /api/admin/partners/:id/move — échange la position d'affichage de ce
 * partenaire avec son voisin immédiat (ordre utilisé sur /partenaires),
 * pour réordonner au clic plutôt qu'en saisissant des numéros de position à
 * la main. Renvoie la liste complète à jour (plus simple et plus sûr côté
 * client qu'un recalcul local, y compris si d'anciennes positions issues de
 * la synchronisation se chevauchaient).
 * Réservé RESPONSABLE+.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const current = await prisma.partner.findUnique({ where: { id: params.id } });
  if (!current) {
    return NextResponse.json({ error: "Partenaire introuvable." }, { status: 404 });
  }

  const neighbor = await prisma.partner.findFirst({
    where:
      parsed.data.direction === "up"
        ? { position: { lt: current.position } }
        : { position: { gt: current.position } },
    orderBy: { position: parsed.data.direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) {
    return NextResponse.json(
      { error: parsed.data.direction === "up" ? "Déjà en première position." : "Déjà en dernière position." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.partner.update({ where: { id: current.id }, data: { position: neighbor.position } }),
    prisma.partner.update({ where: { id: neighbor.id }, data: { position: current.position } }),
  ]);

  const partners = await prisma.partner.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json(partners);
}
