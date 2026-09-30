import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Événements",
  description:
    "Les événements ponctuels organisés par l'Amical Poker Club à Villecresnes, en dehors des manches habituelles.",
  alternates: { canonical: "/evenements" },
};

export default async function EvenementsPage() {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          À venir
        </div>
        <h1 className="text-3xl mb-8">Événements</h1>

        <div className="space-y-4">
          {events.map((ev) => (
            <div key={ev.id} className="border border-ink/10 rounded-lg p-6">
              <div className="text-sm text-sage mb-1">
                {new Date(ev.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                {" · "}
                {ev.location}
              </div>
              <h2 className="text-xl font-serif font-semibold mb-2">{ev.name}</h2>
              <p className="text-sage text-sm">{ev.description}</p>
              {ev.seats != null && (
                <p className="text-xs text-sage/70 mt-2 font-mono-club">{ev.seats} places</p>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sage text-sm">Aucun événement particulier programmé, rendez-vous aux manches habituelles !</p>
          )}
        </div>
      </div>
    </div>
  );
}
