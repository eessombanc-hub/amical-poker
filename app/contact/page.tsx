import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez le bureau de l'Amical Poker Club pour rejoindre l'association ou poser une question, à Villecresnes.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      {/* ── MASTHEAD ── mêmes codes que les autres onglets : titre doré animé
          sur le fond dégradé sombre du site. ────────────────────────────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/3 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(240,180,41,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-xl mx-auto">
          <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
            Nous écrire
          </div>
          <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2">
            Contact
          </h1>
          <p className="text-white/70 text-sm">
            Une question sur le club, envie de rejoindre l&apos;association ou de
            proposer une actu poker ? Écrivez au bureau, nous répondons
            généralement sous 48h.
          </p>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-xl mx-auto">
          <div className="card-hover bg-white text-ink border border-white/10 rounded-lg p-6 space-y-3 text-sm">
            <div>
              <span className="text-sage">Email : </span>
              <a href="mailto:contact@apcv-poker.fr" className="text-forest underline underline-offset-4">
                contact@apcv-poker.fr
              </a>
            </div>
            <div>
              <span className="text-sage">Lieu des manches : </span>
              Espace Calès, Villecresnes
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
