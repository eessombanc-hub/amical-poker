import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boutique",
  description:
    "T-shirt, polo, veste floqués et écusson de l'Amical Poker Club. La boutique officielle du club, Villecresnes.",
  alternates: { canonical: "/boutique" },
};

const JIMDO_ORDER_URL = "https://amicalpokerclub.jimdofree.com/infos/commande-vetements-apcv/";

type BoutiqueItem = { name: string; price: string; sizes: string | null; productUrl: string | null };

export default async function BoutiquePage() {
  const snapshot = await prisma.legacyBoutiqueSnapshot.findFirst();
  const items = (snapshot?.items as BoutiqueItem[] | null) ?? [];

  return (
    <>
      {/* ── MASTHEAD ── mêmes codes que les autres onglets : titre doré animé
          sur le fond dégradé sombre, halo vert forêt (même teinte que le
          bouton "Commander" ci-dessous). ─────────────────────────────────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(10,222,124,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
            Le club
          </div>
          <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2 max-w-xl">
            Boutique
          </h1>
          <p className="text-white/70 text-sm max-w-lg">
            Affichez vos couleurs ! T-shirt, polo et veste floqués au logo du
            club et à votre pseudo, plus l&apos;écusson APCV.
          </p>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-4xl mx-auto">
          {items.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-5 mb-10">
              {items.map((item) => (
                <div key={item.name} className="card-hover bg-white text-ink border border-white/10 rounded-lg p-6">
                  <h2 className="text-lg font-serif font-semibold mb-1">{item.name}</h2>
                  <div className="text-forest font-mono-club text-xl mb-2">{item.price}</div>
                  {item.sizes && <p className="text-sage text-sm mb-3">{item.sizes}</p>}
                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-forest text-xs font-medium underline underline-offset-2"
                    >
                      Voir le modèle chez le fournisseur →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg px-4 py-8 text-center mb-10">
              Le catalogue sera disponible après la prochaine synchronisation
              avec l&apos;ancien site.
            </div>
          )}

          <div className="card-hover bg-white text-ink border border-forest/30 rounded-lg p-6">
            <h2 className="text-base font-serif font-semibold mb-2">Comment commander ?</h2>
            <p className="text-sage text-sm mb-1">
              Précisez le vêtement, la taille, la quantité et le pseudo à
              floquer. Le règlement (espèces, chèque ou virement) est demandé
              à la validation du devis final par le bureau.
            </p>
            <p className="text-sage text-sm mb-4">
              Les commandes se font toujours via le formulaire de l&apos;ancien
              site du club, le temps que ce service soit repris ici.
            </p>
            <a
              href={JIMDO_ORDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow inline-block bg-forest text-white text-sm font-medium tracking-wide px-5 py-2.5 rounded"
            >
              Commander sur l&apos;ancien site →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
