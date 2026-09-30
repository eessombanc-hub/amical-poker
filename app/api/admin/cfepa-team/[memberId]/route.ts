import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/cfepa-team/:memberId — retire un membre de l'Équipe
 * CFEPA (voir app/api/admin/cfepa-team, POST). Réservé RESPONSABLE+. Ne
 * supprime jamais la fiche membre elle-même — seulement son appartenance à
 * l'équipe (Member.cfepaTeam).
 */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ memberId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const member = await prisma.member.findUnique({ where: { id: params.memberId } });
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  }

  await prisma.member.update({ where: { id: member.id }, data: { cfepaTeam: false } });
  return NextResponse.json({ ok: true });
}
