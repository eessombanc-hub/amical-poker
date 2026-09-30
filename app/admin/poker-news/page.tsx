import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PokerNewsAdminPanel from "@/components/PokerNewsAdminPanel";

export default async function AdminPokerNewsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "RESPONSABLE")) redirect("/espace-membre");

  const canValidate = hasRole(role, "BUREAU");

  const items = canValidate
    ? await prisma.pokerNewsItem.findMany({ orderBy: { fetchedAt: "desc" } })
    : await prisma.pokerNewsItem.findMany({
        where: { status: "PUBLIE" },
        orderBy: { fetchedAt: "desc" },
      });

  return (
    <div className="px-7 py-14">
      <div className="max-w-5xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Gazette Poker</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Ajoutez ici les actus vues sur le web, poker, casinos de Paris et
          d&apos;Enghien-les-Bains, ou sport.
          {canValidate
            ? " En tant que bureau, vos actus sont publiées immédiatement et vous validez celles des responsables."
            : " Elles seront visibles publiquement une fois validées par le bureau."}
        </p>
        <PokerNewsAdminPanel
          initialItems={JSON.parse(JSON.stringify(items))}
          canValidate={canValidate}
        />
      </div>
    </div>
  );
}
