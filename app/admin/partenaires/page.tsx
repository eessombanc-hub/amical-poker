import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PartenairesAdminPanel from "@/components/PartenairesAdminPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPartenairesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "RESPONSABLE")) redirect("/espace-membre");

  const partners = await prisma.partner.findMany({ orderBy: { position: "asc" } });

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Partenaires</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Ajoutez, modifiez, réordonnez ou retirez les partenaires affichés
          sur <code>/partenaires</code>. Ceux marqués « Synchronisé » viennent
          du site historique (amicalpokerclub.jimdofree.com) — une future
          synchronisation ne les écrasera que si leur page source a
          elle-même changé depuis.
        </p>
        <PartenairesAdminPanel initialPartners={JSON.parse(JSON.stringify(partners))} />
      </div>
    </div>
  );
}
