import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/cfepa-round-roles/[id] — retire le rôle capitaine/joueur
 * attribué à un membre de l'Équipe CFEPA pour une manche (le membre repasse
 * "non retenu" pour cette manche, voir CfepaRoundRolesPanel.tsx). `id` est
 * l'identifiant de l'enregistrement CfepaRoundRole, pas celui du membre.
 * Réservé RESPONSABLE+.
 */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const existing = await prisma.cfepaRoundRole.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Attribution introuvable." }, { status: 404 });
  }

  await prisma.cfepaRoundRole.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
