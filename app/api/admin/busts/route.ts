import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateRanking, syncKillsFromBusts, syncPositionsFromBusts } from "@/lib/ranking";

// Journal des busts d'une manche — voir prisma/schema.prisma, RoundBust.
// Réservé au bureau, aux responsables et à l'admin (même garde que la
// saisie manuelle des résultats sur /api/results). La place n'est jamais
// saisie : elle est déduite de l'ordre d'enregistrement des busts — voir
// lib/ranking.ts, syncPositionsFromBusts.

const bustSchema = z
  .object({
    roundId: z.string(),
    bustedMemberId: z.string(),
    // Le killer est facultatif : un stack retiré sans avoir été éliminé par
    // un autre joueur identifié (ex. élimination par les blindes, joueur
    // parti) se saisit en laissant ce champ vide — voir
    // prisma/schema.prisma, RoundBust.killerMemberId (nullable).
    killerMemberId: z.string().nullable().optional(),
  })
  .refine((d) => !d.killerMemberId || d.killerMemberId !== d.bustedMemberId, {
    message: "Un joueur ne peut pas s'être killé lui-même.",
    path: ["killerMemberId"],
  });

function requireResponsable(session: { user?: unknown } | null) {
  if (!session?.user) return "Non authentifié";
  const role = (session.user as any).role;
  if (!hasRole(role, "RESPONSABLE")) return "Droits insuffisants";
  return null;
}

// GET /api/admin/busts?roundId=xxx — journal des busts d'une manche.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const authError = requireResponsable(session);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === "Non authentifié" ? 401 : 403 });
  }

  const roundId = req.nextUrl.searchParams.get("roundId");
  if (!roundId) {
    return NextResponse.json({ error: "roundId requis" }, { status: 400 });
  }

  const busts = await prisma.roundBust.findMany({
    where: { roundId },
    include: {
      bustedMember: { select: { id: true, nickname: true } },
      killerMember: { select: { id: true, nickname: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(busts);
}

// POST /api/admin/busts — saisie (ou correction) d'un bust : le pseudo qui
// bust est obligatoire, le pseudo qui l'a killé est facultatif (laisser le
// champ vide quand le stack est simplement retiré, sans élimination par un
// autre joueur). La place n'est pas saisie — elle est déduite
// automatiquement de l'ordre des busts déjà enregistrés pour la manche (voir
// lib/ranking.ts, syncPositionsFromBusts), tout comme le décompte des kills
// (syncKillsFromBusts, qui ignore les busts sans killer).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const authError = requireResponsable(session);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === "Non authentifié" ? 401 : 403 });
  }

  const parsed = bustSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Requête invalide." }, { status: 400 });
  }
  const { roundId, bustedMemberId } = parsed.data;
  const killerMemberId = parsed.data.killerMemberId || null;

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) {
    return NextResponse.json({ error: "Manche introuvable" }, { status: 404 });
  }

  // Place provisoire (corrigée juste après par syncPositionsFromBusts) —
  // le champ est requis en base mais n'a pas encore de valeur définitive
  // tant que l'ordre complet des busts n'a pas été recalculé.
  const bust = await prisma.roundBust.upsert({
    where: { roundId_bustedMemberId: { roundId, bustedMemberId } },
    update: { killerMemberId },
    create: { roundId, bustedMemberId, killerMemberId, position: 0 },
    include: {
      bustedMember: { select: { id: true, nickname: true } },
      killerMember: { select: { id: true, nickname: true } },
    },
  });

  await syncPositionsFromBusts(roundId);
  await syncKillsFromBusts(roundId);

  await prisma.auditLog.create({
    data: {
      userId: (session!.user as any).id,
      action: "SAISIE_BUST",
      entity: "RoundBust",
      entityId: bust.id,
    },
  });

  await recalculateRanking(round.seasonId);

  return NextResponse.json(bust, { status: 201 });
}

// DELETE /api/admin/busts?id=xxx — supprime un bust saisi par erreur. Ne
// supprime pas la ligne Result du busté (ses points éventuels restent) ;
// recalcule les places et les kills à partir du journal restant.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const authError = requireResponsable(session);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === "Non authentifié" ? 401 : 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const bust = await prisma.roundBust.findUnique({ where: { id } });
  if (!bust) {
    return NextResponse.json({ error: "Bust introuvable" }, { status: 404 });
  }

  await prisma.roundBust.delete({ where: { id } });
  await syncPositionsFromBusts(bust.roundId);
  await syncKillsFromBusts(bust.roundId);

  const round = await prisma.round.findUnique({ where: { id: bust.roundId } });
  if (round) {
    await prisma.auditLog.create({
      data: {
        userId: (session!.user as any).id,
        action: "SUPPRESSION_BUST",
        entity: "RoundBust",
        entityId: id,
      },
    });
    await recalculateRanking(round.seasonId);
  }

  return NextResponse.json({ ok: true });
}
