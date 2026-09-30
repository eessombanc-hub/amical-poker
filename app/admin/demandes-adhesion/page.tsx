import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MembershipRequestsPanel from "@/components/MembershipRequestsPanel";

export default async function AdminDemandesAdhesionPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "RESPONSABLE")) redirect("/espace-membre");

  const requests = await prisma.membershipRequest.findMany({
    where: { status: "EN_ATTENTE" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      nickname: true,
      email: true,
      birthDate: true,
      createdAt: true,
    },
  });

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Demandes d&apos;adhésion &amp; d&apos;accès invité</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Un visiteur ayant rempli le formulaire <code>/demande-adhesion</code>{" "}
          (rejoindre le club) ou <code>/demande-invite</code> (accès invité au
          forum uniquement, pour une personne hors club) apparaît ici. Rien
          n&apos;est créé tant que vous n&apos;avez pas validé la demande.
        </p>
        <MembershipRequestsPanel
          initialRequests={JSON.parse(JSON.stringify(requests))}
          isSuperAdmin={isSuperAdmin((session.user as any).email)}
        />
      </div>
    </div>
  );
}
