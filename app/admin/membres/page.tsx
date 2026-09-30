import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MembersAdminPanel from "@/components/MembersAdminPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminMembresPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "ADMIN")) redirect("/espace-membre");

  const users = await prisma.user.findMany({
    include: { member: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-7 py-14">
      <div className="max-w-4xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Membres &amp; comptes</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Créez les comptes des membres du club et gérez leurs droits d&apos;accès
          (membre, responsable, bureau, admin). Un mot de passe temporaire est
          généré automatiquement si vous n&apos;en saisissez pas.
        </p>
        <MembersAdminPanel
          initialUsers={JSON.parse(JSON.stringify(users))}
          currentUserId={(session.user as any).id}
          isSuperAdmin={isSuperAdmin((session.user as any).email)}
        />
      </div>
    </div>
  );
}
