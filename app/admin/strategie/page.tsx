import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StrategieAdminPanel from "@/components/StrategieAdminPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminStrategiePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "RESPONSABLE")) redirect("/espace-membre");

  const articles = await prisma.strategieArticle.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="px-7 py-14">
      <div className="max-w-5xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Articles Stratégie</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Rédigez, modifiez ou dépubliez les articles de la rubrique{" "}
          <span className="font-medium">Stratégie &amp; pédagogie poker</span>.
          Un article en brouillon n&apos;est visible que depuis cette page.
        </p>
        <StrategieAdminPanel initialArticles={JSON.parse(JSON.stringify(articles))} />
      </div>
    </div>
  );
}
