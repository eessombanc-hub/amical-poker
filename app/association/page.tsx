import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MemberPopover from "@/components/MemberPopover";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "L'association",
  description:
    "Présentation de l'Amical Poker Club, association de poker loi 1901 basée à Villecresnes : le bureau, les valeurs, les mentions légales.",
  alternates: { canonical: "/association" },
};

// Repli du bloc "Bureau" tant que la composition détaillée (fonctions —
// Président, Trésorier…) n'est pas saisie dans BoardMember : on liste les
// pseudos des comptes ayant un rôle BUREAU, RESPONSABLE ou ADMIN, dans cet
// ordre — même hiérarchie que lib/auth.ts (ROLE_ORDER).
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administration",
  BUREAU: "Bureau",
  RESPONSABLE: "Responsable",
};
const ROLE_RANK: Record<string, number> = {
  ADMIN: 2,
  BUREAU: 1,
  RESPONSABLE: 0,
};

export default async function AssociationPage() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  const [bureau, roleMembers] = await Promise.all([
    season
      ? prisma.boardMember.findMany({
          where: { seasonId: season.id },
          include: { member: true },
          orderBy: { order: "asc" },
        })
      : Promise.resolve([]),
    prisma.member.findMany({
      where: { membershipStatus: "ACTIF", user: { role: { in: ["BUREAU", "RESPONSABLE", "ADMIN"] } } },
      include: { user: { select: { role: true } } },
    }),
  ]);
  const sortedRoleMembers = [...roleMembers].sort((a, b) => {
    const roleDiff = (ROLE_RANK[b.user.role] ?? 0) - (ROLE_RANK[a.user.role] ?? 0);
    return roleDiff !== 0 ? roleDiff : a.nickname.localeCompare(b.nickname);
  });

  return (
    <>
      {/* ── MASTHEAD ── mêmes codes que les autres onglets : titre doré animé
          sur le fond dégradé sombre, halo vert forêt (esprit institutionnel /
          confiance, comme Partenaires). ──────────────────────────────────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/3 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(10,222,124,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
            Depuis toujours entre amis
          </div>
          <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2 max-w-xl">
            L&apos;association
          </h1>
          <p className="text-white/70 text-sm max-w-lg leading-relaxed">
            L&apos;Amical Poker Club est une association loi 1901 basée à
            Villecresnes. Nous organisons des manches de poker amical tout
            au long de la saison, avec un classement général, des règles claires
            et une bonne ambiance avant tout. Rejoignez-nous pour jouer, apprendre
            et partager un bon moment.
          </p>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-3xl mx-auto">
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-serif font-semibold">Le bureau {season?.label ?? ""}</h2>
              <span className="h-px flex-1 bg-white/15" />
            </div>
            {bureau.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {bureau.map((b) => (
                  <div key={b.id} className="card-hover bg-white text-ink border border-white/10 rounded-lg p-5">
                    <div className="text-xs uppercase tracking-wide text-sage mb-1">{b.function}</div>
                    <div className="font-medium">
                      {b.member.firstName} {b.member.lastName}
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedRoleMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {sortedRoleMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-2 bg-white text-ink border border-white/10 rounded-full pl-4 pr-2 py-2 text-sm font-medium"
                  >
                    <MemberPopover memberId={m.id} nickname={m.nickname} className="hover:text-forest transition-colors" />
                    <span className="text-[0.62rem] tracking-widest uppercase text-burgundy font-semibold bg-burgundy/10 rounded-full px-2 py-1">
                      {ROLE_LABEL[m.user.role] ?? m.user.role}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
                Composition du bureau à venir.
              </p>
            )}
          </section>

          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="/mentions-legales"
              className="border border-white/20 text-white/80 hover:bg-white/10 transition-colors rounded px-4 py-2.5"
            >
              Mentions légales
            </a>
            <a
              href="/confidentialite"
              className="border border-white/20 text-white/80 hover:bg-white/10 transition-colors rounded px-4 py-2.5"
            >
              Confidentialité (RGPD)
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
