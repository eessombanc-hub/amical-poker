import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UrgentMessagePopup from "@/components/UrgentMessagePopup";

// Affiche le(s) message(s) urgent(s) du bureau (voir /admin/message-urgent,
// prisma.notification type="URGENT") non encore acquittés, sur TOUTE page du
// site tant qu'un compte est connecté — pas seulement sur /espace-membre —
// pour qu'un membre les voie dès son retour sur le site, quelle que soit la
// page sur laquelle il atterrit en premier. Monté depuis app/layout.tsx.
//
// Composant serveur (pas de fiche Member à vérifier ici : seuls des comptes
// avec fiche Member reçoivent des notifications de type URGENT — voir
// app/api/admin/urgent-message/route.ts — donc la requête ci-dessous ne
// renvoie de toute façon jamais rien pour un accès invité).
//
// Toujours monté (même sans message en attente) tant qu'une session existe :
// UrgentMessagePopup sonde ensuite l'API en arrière-plan (voir
// POLL_INTERVAL_MS) pour afficher quasi instantanément un message envoyé
// PENDANT que le membre est déjà sur le site — sans ce montage systématique,
// ce sondage ne démarrerait qu'au prochain message déjà présent au chargement.
export default async function UrgentMessageGate() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const userId = (session.user as any).id as string;
  const notifications = await prisma.notification.findMany({
    where: { userId, type: "URGENT", read: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true, createdAt: true },
  });

  return <UrgentMessagePopup notifications={JSON.parse(JSON.stringify(notifications))} />;
}
