import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ memberId: z.string().min(1) });

/**
 * POST /api/admin/cfepa-team — intègre un membre du club à l'Équipe CFEPA
 * (voir app/vie-du-club, section #equipe-cfepa, et prisma/schema.prisma,
 * Member.cfepaTeam). Réservé RESPONSABLE+ — même seuil que la modération de
 * la Galerie, pas besoin du rôle ADMIN complet pour cette simple vitrine.
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

  const member = await prisma.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  }

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: { cfepaTeam: true },
    select: { id: true, firstName: true, lastName: true, nickname: true, photoUrl: true },
  });

  return NextResponse.json(updated, { status: 201 });
}
