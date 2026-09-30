import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/rounds/:id/register — inscription du membre connecté à une manche.
// Bascule automatiquement en liste d'attente si la manche est complète.
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) {
    return NextResponse.json({ error: "Aucune fiche membre associée à ce compte" }, { status: 403 });
  }

  const round = await prisma.round.findUnique({ where: { id: params.id } });
  if (!round) {
    return NextResponse.json({ error: "Manche introuvable" }, { status: 404 });
  }
  if (!["INSCRIPTIONS_OUVERTES", "A_VENIR"].includes(round.status)) {
    return NextResponse.json({ error: "Les inscriptions sont fermées pour cette manche." }, { status: 400 });
  }
  // Manches CFEPA (Championnat de France par Équipe de Poker Associatif) :
  // inscriptions réservées aux membres de l'Équipe CFEPA (voir
  // Member.cfepaTeam et components/CfepaTeamPanel.tsx) — le club y engage
  // une équipe précise, pas l'ensemble des membres du club.
  if (round.format === "CFEPA" && !member.cfepaTeam) {
    return NextResponse.json(
      { error: "Cette manche est réservée aux membres de l'Équipe CFEPA." },
      { status: 403 }
    );
  }

  const existing = await prisma.roundRegistration.findUnique({
    where: { roundId_memberId: { roundId: round.id, memberId: member.id } },
  });
  if (existing && existing.status !== "ANNULE") {
    return NextResponse.json(existing);
  }

  const activeCount = await prisma.roundRegistration.count({
    where: { roundId: round.id, status: "INSCRIT" },
  });
  const status = activeCount >= round.maxSeats ? "LISTE_ATTENTE" : "INSCRIT";

  const registration = existing
    ? await prisma.roundRegistration.update({
        where: { id: existing.id },
        data: { status, timestamp: new Date() },
      })
    : await prisma.roundRegistration.create({
        data: { roundId: round.id, memberId: member.id, status },
      });

  if (status === "INSCRIT" && activeCount + 1 >= round.maxSeats && round.status !== "COMPLET") {
    await prisma.round.update({ where: { id: round.id }, data: { status: "COMPLET" } });
  }

  return NextResponse.json(registration, { status: 201 });
}

// DELETE /api/rounds/:id/register — annule l'inscription du membre connecté
// à une manche (passage en statut ANNULE, conservé plutôt que supprimé pour
// garder l'historique). Si la place libérée faisait partie des places
// actives (INSCRIT) : la manche repasse INSCRIPTIONS_OUVERTES si elle était
// COMPLET, et le premier de la liste d'attente (le plus ancien inscrit en
// LISTE_ATTENTE) est automatiquement promu INSCRIT à sa place.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) {
    return NextResponse.json({ error: "Aucune fiche membre associée à ce compte" }, { status: 403 });
  }

  const round = await prisma.round.findUnique({ where: { id: params.id } });
  if (!round) {
    return NextResponse.json({ error: "Manche introuvable" }, { status: 404 });
  }
  if (["TERMINEE", "ANNULEE"].includes(round.status)) {
    return NextResponse.json({ error: "Cette manche ne peut plus être modifiée." }, { status: 400 });
  }

  const existing = await prisma.roundRegistration.findUnique({
    where: { roundId_memberId: { roundId: round.id, memberId: member.id } },
  });
  if (!existing || existing.status === "ANNULE") {
    return NextResponse.json({ error: "Vous n'êtes pas inscrit à cette manche." }, { status: 400 });
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

  return NextResponse.json({ ok: true });
}
