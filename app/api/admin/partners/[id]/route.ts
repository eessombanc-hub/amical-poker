import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const urlValue = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Lien invalide (doit commencer par http:// ou https://).",
  });

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  logoUrl: urlValue.nullable().optional(),
  websiteUrl: urlValue.nullable().optional(),
});

/**
 * PATCH /api/admin/partners/:id — modifie un partenaire (nom, description,
 * logo, site web). Fonctionne aussi bien sur un partenaire ajouté à la main
 * que sur un partenaire synchronisé depuis le site historique — dans ce
 * second cas, une future synchronisation n'écrasera la modification que si
 * la page source du site historique a elle-même changé entre-temps (voir
 * syncPartenaires dans lib/jimdoSync.ts, comparaison par sourceHash).
 *
 * DELETE /api/admin/partners/:id — supprime un partenaire.
 *
 * Réservé RESPONSABLE+.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null;
  if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl || null;
  if (parsed.data.websiteUrl !== undefined) data.websiteUrl = parsed.data.websiteUrl || null;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  }

  const partner = await prisma.partner.update({ where: { id: params.id }, data });
  return NextResponse.json(partner);
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  await prisma.partner.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
