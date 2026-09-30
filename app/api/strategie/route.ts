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

const articleSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres et tirets uniquement)"),
  title: z.string().min(3).max(160),
  excerpt: z.string().min(10).max(400),
  takeaway: z.string().min(10).max(500),
  content: z.array(z.string().min(1)).min(1),
  quiz: z.array(quizQuestionSchema).optional(),
  level: z.enum(["DEBUTANT", "INTERMEDIAIRE", "AVANCE"]),
  readingTime: z.string().min(1).max(20),
  featured: z.boolean().optional(),
  status: z.enum(["BROUILLON", "PUBLIE", "DEPUBLIE"]).optional(),
});

// GET /api/strategie — liste publique des articles publiés.
// GET /api/strategie?all=1 — réservé RESPONSABLE+ : tous les articles (y compris brouillons).
export async function GET(req: NextRequest) {
  const wantsAll = req.nextUrl.searchParams.get("all") === "1";

  if (wantsAll) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
      return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
    }
    const items = await prisma.strategieArticle.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(items);
  }

  const items = await prisma.strategieArticle.findMany({
    where: { status: "PUBLIE" },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

// POST /api/strategie — créer un article. Réservé RESPONSABLE+.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasRole((session.user as any).role, "RESPONSABLE")) {
    return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });
  }

  const parsed = articleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.strategieArticle.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Ce slug est déjà utilisé par un autre article." }, { status: 409 });
  }

  const userId = (session.user as any).id as string;
  const article = await prisma.strategieArticle.create({
    data: { ...parsed.data, authorId: userId },
  });

  return NextResponse.json(article, { status: 201 });
}
