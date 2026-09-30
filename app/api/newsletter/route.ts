import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRateLimited, extractIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  source: z.string().max(50).optional(),
});

/**
 * POST /api/newsletter — inscription publique à la newsletter du club
 * (encart dans le pied de page, présent sur tout le site). Aucun compte
 * n'est créé : juste une adresse conservée pour un futur envoi manuel par
 * le bureau. Une adresse déjà inscrite renvoie un succès (idempotent),
 * plutôt qu'une erreur qui donnerait l'impression d'un problème au visiteur.
 */
export async function POST(req: NextRequest) {
  const ip = extractIp(req.headers);
  if (isRateLimited(`newsletter:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    await prisma.newsletterSubscriber.create({
      data: { email, source: parsed.data.source },
    });
  } catch (err: any) {
    // P2002 = contrainte unique (déjà inscrit) : on considère ça comme un succès.
    if (err?.code !== "P2002") {
      return NextResponse.json({ error: "L'inscription a échoué, réessayez." }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "Inscription confirmée." }, { status: 201 });
}
