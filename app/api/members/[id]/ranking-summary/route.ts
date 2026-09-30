import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/members/:id/ranking-summary — résumé public (pseudo, classement
 * de la saison en cours, kills) affiché dans le popup au clic sur un pseudo
 * (voir components/MemberPopover.tsx). Public, sans authentification — même
 * donnée que celle déjà affichée publiquement sur /classement — mais ne
 * renvoie un classement que si le membre a autorisé la publication de ses
 * résultats (RGPD, Member.publicResults), comme partout ailleurs sur le site.
 */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: { nickname: true, publicResults: true, legacyRankingPlace: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  }

  if (!member.publicResults) {
    return NextResponse.json({
      nickname: member.nickname,
      publicResults: false,
      ranking: null,
      legacyRankingPlace: null,
    });
  }

  const season = await prisma.season.findFirst({ where: { isActive: true } });
  let ranking: { totalPoints: number; totalKills: number; position: number } | null = null;

  if (season) {
    // Même méthode que /classement et l'espace membre : position calculée
    // par tri décroissant sur les points, pas de champ "position" stocké.
    const seasonRankings = await prisma.ranking.findMany({
      where: { seasonId: season.id },
      orderBy: { totalPoints: "desc" },
    });
    const idx = seasonRankings.findIndex((r) => r.memberId === params.id);
    if (idx !== -1) {
      const r = seasonRankings[idx];
      ranking = { totalPoints: r.totalPoints, totalKills: r.totalKills, position: idx + 1 };
    }
  }

  return NextResponse.json({
    nickname: member.nickname,
    publicResults: true,
    ranking,
    legacyRankingPlace: member.legacyRankingPlace,
  });
}
