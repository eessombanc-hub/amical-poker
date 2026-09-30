import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import JimdoSyncAdminPanel from "@/components/JimdoSyncAdminPanel";

export default async function AdminSiteHistoriquePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "BUREAU")) redirect("/espace-membre");

  const drafts = await prisma.news.findMany({
    where: { status: "BROUILLON", autoImported: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Site historique</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Synchronisation avec l&apos;ancien site du club,{" "}
          <a
            href="https://amicalpokerclub.jimdofree.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            amicalpokerclub.jimdofree.com
          </a>
          .
        </p>
        <JimdoSyncAdminPanel initialDrafts={JSON.parse(JSON.stringify(drafts))} />
      </div>
    </div>
  );
}
