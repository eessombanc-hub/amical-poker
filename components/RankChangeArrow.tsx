// Flèche d'évolution du classement entre la dernière manche jouée et celle
// d'avant — voir lib/ranking.ts, computeRankChanges. Purement décoratif
// (pas de client component nécessaire).
export default function RankChangeArrow({ delta }: { delta: number | undefined }) {
  if (!delta) return <span className="text-ink/25 text-xs">—</span>;

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-forest-2 text-xs font-semibold" title={`A gagné ${delta} place${delta > 1 ? "s" : ""} depuis la dernière manche`}>
        ▲ {delta}
      </span>
    );
  }

  const lost = Math.abs(delta);
  return (
    <span className="inline-flex items-center gap-0.5 text-crimson text-xs font-semibold" title={`A perdu ${lost} place${lost > 1 ? "s" : ""} depuis la dernière manche`}>
      ▼ {lost}
    </span>
  );
}
