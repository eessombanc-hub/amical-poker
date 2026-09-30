import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RegisterButton from "@/components/RegisterButton";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendrier des manches",
  description:
    "Toutes les manches de poker à venir de l'Amical Poker Club à Villecresnes : dates, horaires, format et inscriptions en ligne.",
  alternates: { canonical: "/calendrier" },
};

const STATUS_LABEL: Record<string, string> = {
  A_VENIR: "À venir",
  INSCRIPTIONS_OUVERTES: "Inscriptions ouvertes",
  COMPLET: "Complet",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export default async function CalendrierPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  // Saisie des résultats : réservée au bureau, aux responsables et à l'admin
  // (voir app/admin/resultats/page.tsx, même contrôle d'accès côté serveur).
  const canEnterResults = hasRole(role, "RESPONSABLE");

  const season = await prisma.season.findFirst({ where: { isActive: true } });
  const rounds = season
    ? await prisma.round.findMany({
        // Le calendrier public n'affiche que les manches à venir ou en cours :
        // les manches déjà jouées (TERMINEE) ou annulées (ANNULEE) sont
        // masquées ici, mais restent en base — leurs résultats, points et
        // kills continuent de compter dans le classement de la saison
        // (voir /classement, lib/ranking.ts).
        where: { seasonId: season.id, status: { notIn: ["TERMINEE", "ANNULEE"] } },
        // Trié par date d'abord (et non plus seulement par numéro interne) :
        // les manches Sit&Go (voir RoundFormat.SITNGO) sont créées après coup,
        // avec un numéro décalé (prisma/ajouter-manches-sitngo.ts), et doivent
        // malgré tout apparaître à leur vraie place chronologique, en marge du
        // Day 2 de Deepstack auquel elles sont liées.
        orderBy: [{ date: "asc" }, { number: "asc" }],
        include: {
          _count: { select: { registrations: { where: { status: "INSCRIT" } } } },
          // Vainqueur (1ʳᵉ place) — affiché uniquement pour les manches terminées.
          results: { where: { position: 1 }, include: { member: true } },
        },
      })
    : [];
  // Inscriptions déjà actives du membre connecté, pour griser le bouton
  // "S'inscrire" des manches où il est déjà inscrit ou en liste d'attente
  // (voir components/RegisterButton.tsx, prop initialStatus) — sans ça, le
  // bouton ne se grisait qu'après un clic dans la même session, pas au
  // rechargement de la page ni pour une inscription faite depuis
  // /calendrier/manche/[id].
  const myRegistrationByRoundId = new Map<string, "INSCRIT" | "LISTE_ATTENTE">();
  // Appartenance à l'Équipe CFEPA du membre connecté — conditionne
  // l'affichage du bouton d'inscription sur les manches de format CFEPA
  // (voir Member.cfepaTeam et app/api/rounds/[id]/register, même contrôle
  // côté serveur).
  let isCfepaTeamMember = false;
  if (userId && rounds.length > 0) {
    const member = await prisma.member.findUnique({ where: { userId }, select: { id: true, cfepaTeam: true } });
    if (member) {
      isCfepaTeamMember = member.cfepaTeam;
      const myRegistrations = await prisma.roundRegistration.findMany({
        where: {
          memberId: member.id,
          roundId: { in: rounds.map((r) => r.id) },
          status: { in: ["INSCRIT", "LISTE_ATTENTE"] },
        },
        select: { roundId: true, status: true },
      });
      for (const r of myRegistrations) {
        myRegistrationByRoundId.set(r.roundId, r.status as "INSCRIT" | "LISTE_ATTENTE");
      }
    }
  }

  const legacyCalendar = await prisma.legacyCalendarSnapshot.findFirst({ orderBy: { updatedAt: "desc" } });
  const legacyRows = (legacyCalendar?.rows as { date: string; tournoi: string; heure: string; lieu: string }[] | null) ?? null;

  // Deepstack (et tout tournoi groupé) sur plusieurs soirées : le Day 1 se
  // rejoint normalement (bouton ci-dessous), mais le Day 2 ne se rejoint pas
  // par inscription — seuls les joueurs non bustés au Day 1 y sont reconduits
  // automatiquement (voir lib/ranking.ts, canonicalRoundOfGroup). On
  // interroge donc TOUTES les manches de chaque groupe présent ci-dessus
  // (pas seulement celles affichées, le Day 1 pouvant déjà être TERMINEE et
  // donc absent de `rounds`) pour repérer, par date, laquelle est le Day 1.
  const groupIds = Array.from(new Set(rounds.map((r) => r.groupId).filter((g): g is string => !!g)));
  const groupRounds = groupIds.length > 0
    ? await prisma.round.findMany({
        where: { groupId: { in: groupIds } },
        select: { id: true, groupId: true, date: true },
        orderBy: { date: "asc" },
      })
    : [];
  const firstRoundIdByGroup = new Map<string, string>();
  for (const gr of groupRounds) {
    if (!firstRoundIdByGroup.has(gr.groupId!)) {
      firstRoundIdByGroup.set(gr.groupId!, gr.id);
    }
  }
  function isContinuationDay(r: { id: string; groupId: string | null }) {
    return !!r.groupId && firstRoundIdByGroup.get(r.groupId) !== r.id;
  }

  return (
    <>
      {/* ── MASTHEAD ── mêmes codes que la Gazette / Stratégie / Classement :
          titre doré animé sur le fond dégradé sombre, pastilles de
          navigation en dessous. Halo vert (plutôt qu'or) ici : le
          calendrier est tourné vers l'action (s'inscrire), teinte forest
          comme les boutons d'inscription du site. ─────────────────────────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-1/3 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(10,222,124,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
            Saison {season?.label ?? ""}
          </div>
          <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2 max-w-xl">
            Calendrier des manches
          </h1>
          <p className="text-white/70 text-sm max-w-lg">
            Les prochaines manches du club : dates, horaires, format et
            inscription en ligne en un clic.
          </p>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4 mb-4">
            {rounds.map((r) => {
              const winner = r.results[0]?.member ?? null;
              return (
                <div
                  key={r.id}
                  className="card-hover bg-white text-ink border border-white/10 rounded-lg p-6 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-[0.65rem] tracking-widest uppercase text-burgundy font-semibold mb-1">
                      {r.label ?? `Manche ${r.number} · ${r.format}`}
                    </div>
                    <div className="text-lg font-serif font-semibold capitalize">
                      {new Date(r.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    <Link
                      href={`/calendrier/manche/${r.id}`}
                      className="text-xs text-forest-2 underline underline-offset-4 font-medium"
                    >
                      Voir les joueurs inscrits →
                    </Link>
                    {/* Une manche CFEPA ne fait pas partie du tournoi interne du
                        club (pas de classement/points associés, voir
                        lib/ranking.ts) : pas de saisie de résultat pour elle. */}
                    {canEnterResults && r.format !== "CFEPA" && (
                      <Link
                        href={`/admin/resultats?manche=${r.id}`}
                        className="text-xs text-forest underline underline-offset-4 font-medium ml-3"
                      >
                        Saisir un résultat →
                      </Link>
                    )}
                    <div className="text-sm text-sage mt-1">
                      Ouverture {r.openTime} · Départ {r.startTime} · {r.location}
                    </div>
                    <div className="text-xs text-sage/70 mt-1 font-mono-club">
                      {r._count.registrations}/{r.maxSeats} inscrits · {STATUS_LABEL[r.status]}
                    </div>
                  </div>
                  {isContinuationDay(r) ? (
                    <span className="text-[0.68rem] uppercase tracking-widest text-sage font-semibold text-right max-w-[14rem]">
                      Qualification automatique : réservé aux joueurs non bustés au Day 1
                    </span>
                  ) : r.format === "SITNGO" ? (
                    // Sit&Go : inscription réservée au bureau/responsables/
                    // admin depuis la fiche de la manche (voir
                    // app/calendrier/manche/[id]/page.tsx,
                    // SitngoRegistrationPanel) — jamais de bouton
                    // d'auto-inscription ici, à la différence des autres formats.
                    <span className="text-[0.68rem] uppercase tracking-widest text-forest-2 font-semibold text-right max-w-[14rem]">
                      Sit&amp;Go — inscriptions gérées par le bureau
                    </span>
                  ) : r.format === "CFEPA" && !isCfepaTeamMember ? (
                    <span className="text-[0.68rem] uppercase tracking-widest text-brass font-semibold text-right max-w-[14rem]">
                      Réservé à l&apos;Équipe CFEPA
                    </span>
                  ) : (
                    (r.status === "INSCRIPTIONS_OUVERTES" || r.status === "COMPLET" || r.status === "A_VENIR") && (
                      <RegisterButton
                        roundId={r.id}
                        isFull={r._count.registrations >= r.maxSeats}
                        initialStatus={myRegistrationByRoundId.get(r.id) ?? null}
                      />
                    )
                  )}
                  {r.status === "TERMINEE" && (
                    <div className="flex items-center gap-2.5">
                      <span className="text-[0.68rem] uppercase tracking-widest text-burgundy font-semibold whitespace-nowrap">
                        Manche terminée
                      </span>
                      {winner ? (
                        <div className="flex items-center gap-2 bg-paper-dim border border-brass/30 rounded-full pl-1.5 pr-3.5 py-1">
                          <Avatar photoUrl={winner.photoUrl} name={winner.nickname} size={28} />
                          <span className="text-sm font-medium whitespace-nowrap">🏆 {winner.nickname}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-sage/70 whitespace-nowrap">Résultats non saisis</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {rounds.length === 0 && (
              <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
                Aucune manche programmée pour le moment.
              </p>
            )}
          </div>

          {legacyCalendar && (
            <section className="mt-14 pt-10 border-t border-white/15">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">Calendrier officiel complet de la saison</h2>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <p className="text-white/60 text-sm mb-5 max-w-xl">
                Référence issue de l&apos;ancien site du club. Les inscriptions se
                font toujours ci-dessus, sur ce nouveau site.
              </p>
              {legacyRows && legacyRows.length > 0 ? (
                <div className="overflow-x-auto bg-white text-ink border border-white/10 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-paper-dim text-left">
                        <th className="px-4 py-2.5 font-medium">Date</th>
                        <th className="px-4 py-2.5 font-medium">Tournoi</th>
                        <th className="px-4 py-2.5 font-medium">Heure</th>
                        <th className="px-4 py-2.5 font-medium">Lieu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legacyRows.map((row, i) => (
                        <tr key={i} className="border-t border-ink/10">
                          <td className="px-4 py-2 whitespace-nowrap">{row.date}</td>
                          <td className="px-4 py-2">{row.tournoi}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{row.heure}</td>
                          <td className="px-4 py-2">{row.lieu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="bg-white text-ink text-sm whitespace-pre-line border border-white/10 rounded-lg p-5">
                  {legacyCalendar.rawText}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
