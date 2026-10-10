import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEligibleForSitngo, isQualifiedForDeepstackDay2 } from "@/lib/ranking";

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
// PATCH : modification du stack de départ (startingStack) d'un membre déjà
// inscrit — voir plus bas, utilisé pour le Day 2 d'un Deepstack groupé.
//
// DELETE : désinscription d'un membre à la place du bureau/responsable/admin
// — voir plus bas, même logique que l'auto-désinscription du membre.
const schema = z.object({
  roundId: z.string(),
  memberId: z.string(),
  // Stack de départ (en jetons) — facultatif, saisi au moment de l'ajout du
  // joueur. Surtout utile pour le Day 2 d'un Deepstack groupé (voir
  // Round.groupId, components/AdminRegisterPanel.tsx), mais pas restreint à
  // ce cas précis côté API.
  startingStack: z.number().int().nonnegative().nullable().optional(),
});

const patchSchema = z.object({
  roundId: z.string(),
  memberId: z.string(),
  startingStack: z.number().int().nonnegative().nullable(),
});

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
  const { roundId, memberId, startingStack } = parsed.data;

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

  // Day 2 d'un Deepstack groupé (voir Round.groupId) : seuls les joueurs
  // qualifiés (inscrits au Day 1, pas éliminés) peuvent être ajoutés —
  // jamais un joueur quelconque, même via cet ajout manuel. Voir
  // lib/ranking.ts, isQualifiedForDeepstackDay2. Sans effet pour le Day 1
  // (ou toute manche non groupée) : l'ajout manuel y reste libre.
  if (round.format === "DEEPSTACK" && round.groupId) {
    const qualified = await isQualifiedForDeepstackDay2(memberId, roundId);
    if (!qualified) {
      return NextResponse.json(
        {
          error:
            "Ce joueur n'est pas qualifié pour ce Day 2 : il doit avoir été inscrit au Day 1 sans en avoir été éliminé.",
        },
        { status: 403 }
      );
    }
  }

  const registration = await prisma.roundRegistration.upsert({
    where: { roundId_memberId: { roundId, memberId } },
    update: { status: "INSCRIT", ...(startingStack !== undefined ? { startingStack } : {}) },
    create: { roundId, memberId, status: "INSCRIT", startingStack: startingStack ?? null },
  });

  return NextResponse.json(registration, { status: 201 });
}

// PATCH /api/admin/round-registrations — modifie uniquement le stack de
// départ d'un membre déjà inscrit (ex. correction après coup), sans
// retoucher à son statut ni revérifier l'éligibilité Sit&Go (déjà
// inscrit = déjà validé). Réservé au bureau, aux responsables et à l'admin.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (!hasRole(role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { roundId, memberId, startingStack } = parsed.data;

  const existing = await prisma.roundRegistration.findUnique({
    where: { roundId_memberId: { roundId, memberId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ce membre n'est pas inscrit à cette manche." }, { status: 404 });
  }

  const registration = await prisma.roundRegistration.update({
    where: { id: existing.id },
    data: { startingStack },
  });

  return NextResponse.json(registration);
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
