import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Compteur de trafic maison — voir prisma/schema.prisma, PageView. Appelé
// par components/VisitTracker.tsx à chaque navigation (production
// uniquement). Volontairement public : aucune authentification requise pour
// enregistrer une visite, aucune donnée personnelle enregistrée (ni IP, ni
// identifiant de visiteur) — seule la présence d'une session valide est
// notée (authenticated), pour distinguer visiteurs connectés / cachés dans
// le bloc "Trafic du site". Ne doit jamais faire échouer la navigation de
// l'utilisateur — toute erreur est avalée silencieusement.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const path = typeof body?.path === "string" ? body.path.slice(0, 300) : "/";
    // Déterminé côté serveur à partir du cookie de session — jamais fourni
    // par le client, pour ne pas pouvoir être falsifié.
    const session = await getServerSession(authOptions);
    await prisma.pageView.create({ data: { path, authenticated: !!session?.user } });
  } catch {
    // Silencieux : le comptage de trafic ne doit jamais gêner la navigation.
  }
  return NextResponse.json({ ok: true });
}
