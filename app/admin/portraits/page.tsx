import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PortraitsAdminPanel from "@/components/PortraitsAdminPanel";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPortraitsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "BUREAU")) redirect("/espace-membre");

  const portraits = await prisma.portrait.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Portraits de membres</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Gérez les portraits affichés sur la page publique{" "}
          <a href="/vie-du-club" className="underline underline-offset-2">
            Vie du club
          </a>
          . Rien n&apos;est publié automatiquement — chaque portrait doit être
          rédigé et validé par le bureau.
        </p>
        <PortraitsAdminPanel initialPortraits={JSON.parse(JSON.stringify(portraits))} />
      </div>
    </div>
  );
}
