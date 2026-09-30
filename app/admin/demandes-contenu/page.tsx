import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContentRequestsPanel from "@/components/ContentRequestsPanel";

export const dynamic = "force-dynamic";

export default async function AdminDemandesContenuPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "RESPONSABLE")) redirect("/espace-membre");

  const [requests, albums] = await Promise.all([
    prisma.contentRequest.findMany({
      where: { status: "EN_ATTENTE" },
      orderBy: { createdAt: "asc" },
      include: { member: { select: { nickname: true, firstName: true, lastName: true } } },
    }),
    prisma.album.findMany({ select: { id: true, title: true, type: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Propositions de contenu</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Actus poker, articles stratégie, photos ou vidéos proposés par les
          membres depuis <code>/proposer-contenu</code>. Pour une photo ou une
          vidéo, choisissez un album ci-dessous et cliquez sur « Publier dans
          la Galerie » : elle est ajoutée et la demande archivée en un seul
          clic. Pour une actu ou un article, créez-le vous-même (lien
          ci-dessous) puis marquez la demande comme traitée.
        </p>
        <ContentRequestsPanel
          initialRequests={JSON.parse(JSON.stringify(requests))}
          albums={JSON.parse(JSON.stringify(albums))}
        />
      </div>
    </div>
  );
}
