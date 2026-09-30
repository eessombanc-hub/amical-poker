import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateRanking } from "@/lib/ranking";

const resultSchema = z.object({
  roundId: z.string(),
  memberId: z.string(),
  position: z.number().int().positive(),
  points: z.number().int().nonnegative(),
  kills: z.number().int().nonnegative().optional().default(0),
  notes: z.string().optional(),
});

// POST /api/results — saisie d'un résultat par un responsable désigné ou le bureau
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!hasRole(role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const round = await prisma.round.findUnique({ where: { id: parsed.data.roundId } });
  if (!round) {
    return NextResponse.json({ error: "Manche introuvable" }, { status: 404 });
  }

  const result = await prisma.result.upsert({
    where: {
      roundId_memberId: {
        roundId: parsed.data.roundId,
        memberId: parsed.data.memberId,
      },
    },
    update: parsed.data,
    create: parsed.data,
  });

  // Trace d'audit (§ 24 — logs des actions administratives)
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "SAISIE_RESULTAT",
      entity: "Result",
      entityId: result.id,
    },
  });

  // Recalcul automatique du classement (§ 14)
  await recalculateRanking(round.seasonId);

  return NextResponse.json(result, { status: 201 });
}

// GET /api/results?roundId=xxx — résultats publics d'une manche
export async function GET(req: NextRequest) {
  const roundId = req.nextUrl.searchParams.get("roundId");
  if (!roundId) {
    return NextResponse.json({ error: "roundId requis" }, { status: 400 });
  }

  const results = await prisma.result.findMany({
    where: { roundId },
    include: { member: { select: { nickname: true, publicResults: true } } },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(results);
}
