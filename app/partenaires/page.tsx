import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Page 100% publique, sans dépendance à la session (pas d'appel à
// getServerSession ici) : contrairement à la plupart des autres pages du
// site, elle peut donc être générée périodiquement plutôt qu'à chaque
// requête, sans rien changer à ce que voit le visiteur — juste un
// chargement plus rapide et moins de sollicitation de la base de données
// (voir audit-site-apcv.md, section technique). Régénérée au plus toutes
// les 5 minutes ; toute modification faite depuis /admin/partenaires
// apparaît donc en public sous 5 minutes maximum, jamais instantanément.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Partenaires",
  description:
    "Les partenaires et sponsors qui soutiennent l'Amical Poker Club à Villecresnes.",
  alternates: { canonical: "/partenaires" },
};

export default async function PartenairesPage() {
  const partners = await prisma.partner.findMany({ orderBy: { position: "asc" } });

  return (
    <>
      {/* ── MASTHEAD ── mêmes codes que les autres onglets : titre doré animé
          sur le fond dégradé sombre, halo vert forêt (esprit confiance /
          partenariat institutionnel). ───────────────────────────────────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-1/4 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(10,222,124,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
            Le club
          </div>
          <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2 max-w-xl">
            Partenaires
          </h1>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-5">
            {partners.map((p) => (
              <div
                key={p.id}
                className="card-hover bg-white text-ink border border-white/10 rounded-lg p-6 flex gap-4 items-start"
              >
                {p.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.logoUrl}
                    alt={p.name}
                    className="w-16 h-16 object-contain flex-shrink-0"
                  />
                )}
                <div>
                  <h2 className="text-lg font-serif font-semibold mb-1">{p.name}</h2>
                  {p.description && (
                    <p className="text-sage text-sm mb-2 line-clamp-4">{p.description}</p>
                  )}
                  {p.websiteUrl && (
                    <a
                      href={p.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-forest text-xs font-medium underline underline-offset-2"
                    >
                      Visiter le site →
                    </a>
                  )}
                </div>
              </div>
            ))}
            {partners.length === 0 && (
              <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center sm:col-span-2">
                Pas encore de partenaire référencé, synchronisez depuis
                l&apos;administration pour les récupérer.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
