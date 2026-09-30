import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Newsletter, Amical Poker Club",
};

/**
 * Liste des inscrits à la newsletter (encart pied de page). Réservé au
 * bureau : sert uniquement à exporter les adresses pour un envoi manuel
 * depuis l'outil d'e-mailing du club — aucun envoi n'est fait ici.
 */
export default async function AdminNewsletterPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !hasRole(role || "", "BUREAU")) redirect("/espace-membre");

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
  });

  const emailsList = subscribers.map((s) => s.email).join(", ");

  return (
    <div className="px-7 py-14">
      <div className="max-w-3xl mx-auto panel">
        <div className="text-[0.72rem] tracking-widest uppercase text-burgundy font-semibold mb-2">
          Espace bureau
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <h1 className="text-3xl">Inscrits à la newsletter</h1>
          <span className="text-sm text-sage border border-ink/10 rounded-full px-3 py-1">
            {subscribers.length} adresse{subscribers.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-sage text-sm mb-8 max-w-xl">
          Ces adresses viennent de l&apos;encart d&apos;inscription présent en
          pied de page du site. Aucun e-mail n&apos;est envoyé automatiquement
          : copiez la liste ci-dessous dans votre outil d&apos;e-mailing
          habituel pour communiquer sur la prochaine manche ou un temps fort
          du club.
        </p>

        {subscribers.length > 0 && (
          <div className="mb-8">
            <div className="text-xs uppercase tracking-wide text-sage mb-2">
              Copier toutes les adresses
            </div>
            <textarea
              readOnly
              value={emailsList}
              rows={4}
              className="w-full border border-ink/10 rounded-lg p-3 text-xs font-mono text-ink/70 resize-none"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        )}

        {subscribers.length === 0 ? (
          <p className="text-sage text-sm">Aucune inscription pour l&apos;instant.</p>
        ) : (
          <div className="border border-ink/10 rounded-lg divide-y divide-ink/10">
            {subscribers.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{s.email}</span>
                <div className="flex items-center gap-3 text-xs text-sage">
                  {s.source && (
                    <span className="border border-ink/10 rounded-full px-2 py-0.5">{s.source}</span>
                  )}
                  <span>
                    {new Date(s.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
