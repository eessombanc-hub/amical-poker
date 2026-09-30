import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEligibleForSitngo } from "@/lib/ranking";

// Gestion des inscriptions à une manche par le bureau, un responsable ou
// l'admin (voir hasRole(role, "RESPONSABLE"), hiérarchique : couvre aussi
// BUREAU et ADMIN — voir lib/auth.ts, ROLE_ORDER).
//
// POST : ajout manuel d'un participant — pour un joueur présent
// physiquement à la table mais qui ne s'était pas inscrit en ligne.
// Toujours marqué INSCRIT (pas de liste d'attente : c'est une correction
// administrative sur place, pas une inscription publique — voir
// /api/rounds/[id]/register pour l'inscription en ligne classique). Rend ce
// joueur sélectionnable dans le journal des busts de /admin/resultats —
// voir components/ResultsAdminPanel.tsx.
//
// DELETE : désinscription d'un membre à la place du bureau/responsable/admin
// — voir plus bas, même logique que l'auto-désinscription du membre.
const schema = z.object({ roundId: z.string(), memberId: z.string() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (!hasRole(role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { roundId, memberId } = parsed.data;

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) {
    return NextResponse.json({ error: "Manche introuvable" }, { status: 404 });
  }
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }

  // Sit&Go (voir Round.linkedDeepstackRoundId) : inscription réservée aux
  // membres qui ne participent pas, ou plus, au Deepstack lié — voir
  // lib/ranking.ts, isEligibleForSitngo.
  if (round.format === "SITNGO" && round.linkedDeepstackRoundId) {
    const eligible = await isEligibleForSitngo(memberId, round.linkedDeepstackRoundId);
    if (!eligible) {
      return NextResponse.json(
        {
          error:
            "Ce joueur participe encore au Deepstack lié à ce Sit&Go : il n'est éligible que s'il n'y est pas inscrit, ou s'il en a déjà été éliminé.",
        },
        { status: 403 }
      );
    }
  }

  const registration = await prisma.roundRegistration.upsert({
    where: { roundId_memberId: { roundId, memberId } },
    update: { status: "INSCRIT" },
    create: { roundId, memberId, status: "INSCRIT" },
  });

  return NextResponse.json(registration, { status: 201 });
}

// DELETE /api/admin/round-registrations?roundId=xxx&memberId=yyy —
// désinscrit un membre d'une manche à la place du bureau, d'un responsable
// ou de l'admin (ex. joueur qui a prévenu par un autre canal qu'il ne
// viendrait plus). Même logique que la désinscription volontaire du membre
// (voir /api/rounds/[id]/register, DELETE) : passage en statut ANNULE
// (conservé pour l'historique plutôt que supprimé), promotion du premier de
// la liste d'attente si la place libérée était active, réouverture des
// inscriptions si la manche était complète.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (!hasRole(role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const roundId = req.nextUrl.searchParams.get("roundId");
  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!roundId || !memberId) {
    return NextResponse.json({ error: "roundId et memberId requis" }, { status: 400 });
  }

  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) {
    return NextResponse.json({ error: "Manche introuvable" }, { status: 404 });
  }
  if (["TERMINEE", "ANNULEE"].includes(round.status)) {
    return NextResponse.json({ error: "Cette manche ne peut plus être modifiée." }, { status: 400 });
  }

  const existing = await prisma.roundRegistration.findUnique({
    where: { roundId_memberId: { roundId, memberId } },
  });
  if (!existing || existing.status === "ANNULE") {
    return NextResponse.json({ error: "Ce membre n'est pas inscrit à cette manche." }, { status: 400 });
  }

  const wasActive = existing.status === "INSCRIT";
  await prisma.roundRegistration.update({ where: { id: existing.id }, data: { status: "ANNULE" } });

  if (wasActive) {
    const nextInLine = await prisma.roundRegistration.findFirst({
      where: { roundId: round.id, status: "LISTE_ATTENTE" },
      orderBy: { timestamp: "asc" },
    });
    if (nextInLine) {
      await prisma.roundRegistration.update({ where: { id: nextInLine.id }, data: { status: "INSCRIT" } });
    }
    if (round.status === "COMPLET") {
      await prisma.round.update({ where: { id: round.id }, data: { status: "INSCRIPTIONS_OUVERTES" } });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "DESINSCRIPTION_ADMIN",
      entity: "RoundRegistration",
      entityId: existing.id,
    },
  });

  return NextResponse.json({ ok: true });
}
