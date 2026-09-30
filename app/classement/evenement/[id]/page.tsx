import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LoginGate from "@/components/LoginGate";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return {};
  return {
    title: `Classement, ${event.name}`,
    description: `Informations sur l'événement "${event.name}" de l'Amical Poker Club.`,
    alternates: { canonical: `/classement/evenement/${event.id}` },
  };
}

// Sous-page de classement dédiée à un événement ponctuel — voir /classement.
// Les Événements (voir /evenements) n'ont pas encore de système de busts /
// résultats en base (contrairement aux manches) : cette page affiche donc
// pour l'instant les informations de l'événement avec un emplacement prêt
// pour un futur classement chiffré.
export default async function ClassementEvenementPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <LoginGate
        title="Classement réservé aux connectés"
        description="Le classement par événement est réservé aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) notFound();

  return (
    <div className="px-7 py-14">
      <div className="max-w-2xl mx-auto panel">
        <Link
          href="/classement"
          className="text-sage text-xs font-medium mb-6 inline-block underline underline-offset-4"
        >
          ← Classement
        </Link>
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Événement
        </div>
        <h1 className="text-3xl mb-2">{event.name}</h1>
        <p className="text-sage text-sm mb-8">
          {new Date(event.date).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {" · "}
          {event.location}
          {event.seats != null && ` · ${event.seats} places`}
        </p>

        {event.description && (
          <p className="text-ink/85 text-sm leading-relaxed mb-8">{event.description}</p>
        )}

        <div className="border border-ink/10 rounded-lg px-4 py-8 text-center text-sage text-sm">
          Aucun classement chiffré n&apos;est encore disponible pour cet
          événement.
        </div>
      </div>
    </div>
  );
}
