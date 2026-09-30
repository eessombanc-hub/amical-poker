import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LoginGate from "@/components/LoginGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Résultats des manches",
  description:
    "Résultats détaillés de chaque manche de la saison en cours de l'Amical Poker Club à Villecresnes.",
  alternates: { canonical: "/resultats" },
};

export default async function ResultatsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <LoginGate
        title="Résultats réservés aux connectés"
        description="Les résultats détaillés de chaque manche sont réservés aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  const season = await prisma.season.findFirst({ where: { isActive: true } });
  const rounds = season
    ? await prisma.round.findMany({
        where: { seasonId: season.id, status: "TERMINEE" },
        orderBy: { number: "desc" },
        include: {
          results: {
            where: { member: { publicResults: true } },
            include: { member: true },
            orderBy: { position: "asc" },
          },
        },
      })
    : [];

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Saison {season?.label ?? ""}
        </div>
        <h1 className="text-3xl mb-8">Résultats des manches</h1>

        <div className="space-y-8">
          {rounds.map((round) => (
            <div key={round.id}>
              <h2 className="text-lg font-serif font-semibold mb-3">
                Manche {round.number},{" "}
                {new Date(round.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              </h2>
              <div className="border border-ink/10 rounded-lg overflow-hidden">
                {round.results.map((res) => (
                  <div key={res.id} className="flex items-center justify-between px-4 py-2.5 border-b border-ink/10 last:border-0 text-sm">
                    <span>
                      <span className="font-mono-club text-sage mr-3">{res.position}.</span>
                      {res.member.nickname}
                    </span>
                    <span className="font-mono-club">{res.points} pts</span>
                  </div>
                ))}
                {round.results.length === 0 && (
                  <div className="px-4 py-4 text-sm text-sage">Résultats non publiés.</div>
                )}
              </div>
            </div>
          ))}
          {rounds.length === 0 && (
            <p className="text-sage text-sm">Aucune manche terminée pour l&apos;instant.</p>
          )}
        </div>
      </div>
    </div>
  );
}
