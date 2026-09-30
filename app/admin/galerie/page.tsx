import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GalerieAdminPanel from "@/components/GalerieAdminPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminGaleriePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user) redirect("/connexion");
  if (!hasRole(role, "RESPONSABLE")) redirect("/espace-membre");

  const [albums, seasons] = await Promise.all([
    prisma.album.findMany({ include: { photos: true, videos: true }, orderBy: { title: "asc" } }),
    prisma.season.findMany({ orderBy: { startDate: "desc" }, select: { id: true, label: true } }),
  ]);

  return (
    <div className="px-7 py-14">
      <div className="max-w-5xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Administration
        </div>
        <h1 className="text-3xl mb-2">Galeries photos &amp; vidéos</h1>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Créez des albums photo ou vidéo et ajoutez-y du contenu, par lien
          ou (pour les photos) directement depuis votre appareil. Réservé au
          bureau, aux responsables et aux administrateurs.
        </p>
        <GalerieAdminPanel initialAlbums={JSON.parse(JSON.stringify(albums))} seasons={seasons} />
      </div>
    </div>
  );
}
