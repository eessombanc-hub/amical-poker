import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UrgentMessageForm from "@/components/UrgentMessageForm";

export const dynamic = "force-dynamic";

export default async function AdminMessageUrgentPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "BUREAU")) redirect("/espace-membre");

  // Sert au choix « Membres spécifiques » du formulaire — voir
  // components/UrgentMessageForm.tsx.
  const members = await prisma.member.findMany({
    select: { id: true, firstName: true, lastName: true, nickname: true },
    orderBy: { nickname: "asc" },
  });

  return (
    <div className="px-7 py-14">
      <div className="max-w-xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Message urgent</h1>
        <p className="text-sage text-sm mb-8 max-w-lg">
          À réserver aux communications importantes (annulation d&apos;une
          manche, information de dernière minute…) : le message s&apos;affiche
          en popup bloquant à la connexion des destinataires choisis,
          jusqu&apos;à ce qu&apos;ils l&apos;aient fermé.
        </p>
        <UrgentMessageForm members={members} />
      </div>
    </div>
  );
}
