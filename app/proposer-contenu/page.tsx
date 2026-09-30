import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContentRequestForm from "@/components/ContentRequestForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposer un contenu",
  description:
    "Proposez une actu poker, un article stratégie, une photo ou une vidéo au bureau de l'Amical Poker Club.",
  alternates: { canonical: "/proposer-contenu" },
};

const VALID_TYPES = ["ACTU_POKER", "STRATEGIE", "PHOTO_VIDEO"] as const;

export default async function ProposerContenuPage(props: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/connexion");

  const userId = (session.user as any).id as string;
  // Réservé aux membres (fiche Member) — un compte invité (rôle INVITE) n'a
  // accès qu'au forum, pas à cette contribution de contenu.
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) redirect("/espace-membre");

  const initialType = (VALID_TYPES as readonly string[]).includes(searchParams?.type ?? "")
    ? (searchParams!.type as (typeof VALID_TYPES)[number])
    : undefined;

  return (
    <div className="px-7 py-14">
      <div className="max-w-md mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Contribuer au site
        </div>
        <h1 className="text-3xl mb-3">Proposer un contenu</h1>
        <p className="text-sage text-sm mb-8 max-w-sm">
          Une actu poker à relayer, une idée d&apos;article stratégie, une
          photo ou une vidéo à partager ? Envoyez votre proposition au
          bureau, qui la publiera après relecture.
        </p>
        <ContentRequestForm initialType={initialType} />
        <p className="text-sm text-sage mt-6 text-center">
          <Link href="/espace-membre" className="text-forest font-medium underline">
            Retour à mon espace membre
          </Link>
        </p>
      </div>
    </div>
  );
}
