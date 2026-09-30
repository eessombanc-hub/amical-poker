import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const quizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0),
});

const patchSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres et tirets uniquement)")
    .optional(),
  title: z.string().min(3).max(160).optional(),
  excerpt: z.string().min(10).max(400).optional(),
  takeaway: z.string().min(10).max(500).optional(),
  content: z.array(z.string().min(1)).min(1).optional(),
  quiz: z.array(quizQuestionSchema).optional(),
  level: z.enum(["DEBUTANT", "INTERMEDIAIRE", "AVANCE"]).optional(),
  readingTime: z.string().min(1).max(20).optional(),
  featured: z.boolean().optional(),
  status: z.enum(["BROUILLON", "PUBLIE", "DEPUBLIE"]).optional(),
});

// PATCH /api/strategie/:id — met à jour un article (édition ou changement de statut). Réservé RESPONSABLE+.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.slug) {
    const existing = await prisma.strategieArticle.findUnique({ where: { slug: parsed.data.slug } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé par un autre article." }, { status: 409 });
    }
  }

  const article = await prisma.strategieArticle.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(article);
}

// DELETE /api/strategie/:id — supprime un article. Réservé RESPONSABLE+.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  await prisma.strategieArticle.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
