import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
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

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  logoUrl: urlValue.optional(),
  websiteUrl: urlValue.optional(),
});

/**
 * GET /api/admin/partners — liste tous les partenaires (synchronisés depuis
 * le site historique par syncPartenaires, voir lib/jimdoSync.ts, ou ajoutés
 * à la main ici), triés par position d'affichage.
 *
 * POST /api/admin/partners — ajoute un partenaire à la main, placé en
 * dernière position. Le champ sourceUrl est obligatoire et unique en base
 * (il sert de clé de déduplication à la synchronisation Jimdo) : un
 * partenaire créé ici reçoit donc un sourceUrl synthétique ("manual:…"),
 * ce qui garantit au passage qu'une resynchronisation ne le touchera
 * jamais (syncPartenaires ne recherche que ses propres URLs du site
 * historique).
 *
 * Réservé RESPONSABLE+.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }
  const partners = await prisma.partner.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json(partners);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }

  const last = await prisma.partner.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const partner = await prisma.partner.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      logoUrl: parsed.data.logoUrl || null,
      websiteUrl: parsed.data.websiteUrl || null,
      position: (last?.position ?? -1) + 1,
      sourceUrl: `manual:${randomUUID()}`,
    },
  });
  return NextResponse.json(partner, { status: 201 });
}
