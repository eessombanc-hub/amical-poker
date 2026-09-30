import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  roundId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["CAPITAINE", "MATIN", "APRES_MIDI"]),
});

/**
 * POST /api/admin/cfepa-round-roles — attribue (ou change) le rôle d'un
 * membre pour une manche CFEPA donnée : capitaine, joueur du matin, ou
 * joueur de l'après-midi (voir prisma/schema.prisma, CfepaRoundRole, et
 * components/CfepaRoundRolesPanel.tsx, affiché sur la fiche de la manche).
 * Upsert : ré-appeler avec un nouveau rôle remplace simplement l'ancien.
 *
 * Seul un membre INSCRIT (RoundRegistration.status = INSCRIT) à CETTE
 * manche peut y recevoir un rôle — l'appartenance à l'Équipe CFEPA
 * (Member.cfepaTeam) conditionne déjà l'inscription elle-même (voir
 * app/api/rounds/[id]/register), mais ce n'est pas suffisant ici : seuls
 * les inscrits confirmés de cette manche précise composent la liste.
 *
 * Réservé RESPONSABLE+, même seuil que la gestion de l'équipe elle-même.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { roundId, memberId, role } = parsed.data;

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) return NextResponse.json({ error: "Manche introuvable." }, { status: 404 });

  const registration = await prisma.roundRegistration.findUnique({
    where: { roundId_memberId: { roundId, memberId } },
  });
  if (!registration || registration.status !== "INSCRIT") {
    return NextResponse.json(
      { error: "Ce membre n'est pas inscrit à cette manche." },
      { status: 404 }
    );
  }

  const saved = await prisma.cfepaRoundRole.upsert({
    where: { roundId_memberId: { roundId, memberId } },
    create: { roundId, memberId, role },
    update: { role },
    include: { member: { select: { id: true, firstName: true, lastName: true, nickname: true, photoUrl: true } } },
  });

  return NextResponse.json(saved, { status: 201 });
}
