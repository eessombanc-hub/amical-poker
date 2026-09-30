import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Avatar from "@/components/Avatar";
import MemberPopover from "@/components/MemberPopover";
import LoginGate from "@/components/LoginGate";
import CfepaTeamPanel from "@/components/CfepaTeamPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vie du club & portraits",
  description:
    "Les membres, portraits et coulisses de la vie associative de l'Amical Poker Club à Villecresnes.",
  alternates: { canonical: "/vie-du-club" },
};

// Ordre d'affichage du trombinoscope : bureau et responsables d'abord, puis
// les membres — même hiérarchie que lib/auth.ts (ROLE_ORDER), sans le rôle
// INVITE qui n'a pas de fiche Member et n'apparaît donc jamais ici.
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administration",
  BUREAU: "Bureau",
  RESPONSABLE: "Responsable",
  MEMBRE: "Membre",
};
const ROLE_RANK: Record<string, number> = {
  ADMIN: 3,
  BUREAU: 2,
  RESPONSABLE: 1,
  MEMBRE: 0,
};

const MEDALS = ["🥇", "🥈", "🥉"];

// Assemble une liste à la française : "a, b et c" (et gère 1 ou 2 éléments).
function frenchJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

// Podium (top 3) de la toute dernière manche terminée de la saison en
// cours — vitrine permanente de "Vie du club", à ne pas confondre avec
// l'annonce automatique postée dans Actualités du club au moment même où
// chaque manche se termine (voir lib/ranking.ts, syncPositionsFromBusts) :
// celle-ci n'est pas conservée indéfiniment (les actus les plus anciennes
// sont purgées, voir lib/contentPruning.ts) et ne cite que le vainqueur et
// le 2e. Ici, pas de publication à créer ni de statut à suivre : le podium
// se recalcule à chaque affichage directement à partir des Result déjà
// enregistrés, donc toujours à jour sans rien de plus à faire dès qu'une
// manche passe en TERMINEE.
async function getLatestPodium() {
  try {
    const season = await prisma.season.findFirst({ where: { isActive: true } });
    if (!season) return null;
    const round = await prisma.round.findFirst({
      where: { seasonId: season.id, status: "TERMINEE" },
      orderBy: { date: "desc" },
      select: {
        id: true,
        number: true,
        label: true,
        date: true,
        results: {
          where: { position: { in: [1, 2, 3] } },
          orderBy: { position: "asc" },
          include: { member: { select: { nickname: true, publicResults: true, photoUrl: true } } },
        },
      },
    });
    // Une manche marquée TERMINEE mais sans résultat saisi (cas limite) ne
    // doit pas afficher un podium vide.
    return round && round.results.length > 0 ? round : null;
  } catch {
    return null;
  }
}

export default async function VieDuClubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <LoginGate
        title="Vie du club réservée aux connectés"
        description="Le trombinoscope et les portraits des membres sont réservés aux membres et aux invités connectés de l'Amical Poker Club."
      />
    );
  }

  // Gestion de l'Équipe CFEPA (intégrer/retirer un membre) réservée
  // RESPONSABLE+ — même seuil que la modération de la Galerie.
  const isModerator = hasRole((session.user as any).role, "RESPONSABLE");

  const [members, portraits, podium] = await Promise.all([
    prisma.member.findMany({
      where: { membershipStatus: "ACTIF" },
      include: { user: { select: { role: true } } },
    }),
    prisma.portrait.findMany({
      where: { published: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    }),
    getLatestPodium(),
  ]);

  const cfepaTeam = members
    .filter((m) => m.cfepaTeam)
    .map((m) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, nickname: m.nickname, photoUrl: m.photoUrl }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "fr"));
  // Candidats pour le sélecteur d'ajout (voir CfepaTeamPanel) — tous les
  // membres actifs qui n'en font pas encore partie.
  const cfepaCandidates = members
    .filter((m) => !m.cfepaTeam)
    .map((m) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, nickname: m.nickname, photoUrl: m.photoUrl }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "fr"));

  const podiumNames = podium
    ? podium.results.map((res) => (res.member.publicResults ? res.member.nickname : "Privé"))
    : [];

  const sortedMembers = [...members].sort((a, b) => {
    const roleDiff = (ROLE_RANK[b.user.role] ?? 0) - (ROLE_RANK[a.user.role] ?? 0);
    return roleDiff !== 0 ? roleDiff : a.nickname.localeCompare(b.nickname);
  });

  return (
    <>
      {/* ── MASTHEAD ── mêmes codes que les autres onglets : titre doré animé
          sur le fond dégradé sombre, halo vert forêt (esprit convivial /
          associatif de cette rubrique). ─────────────────────────────────── */}
      <section className="relative overflow-hidden px-7 pt-14 pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-1/4 w-[480px] h-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(10,222,124,0.28) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-[0.72rem] tracking-[3px] uppercase text-brass font-semibold mb-2">
            Coulisses du club
          </div>
          <h1 className="text-royal-shine animate-royal-shine text-4xl md:text-5xl leading-tight pb-1 mb-2 max-w-xl">
            Vie du club &amp; portraits
          </h1>
          <p className="text-white/70 text-sm max-w-lg mb-2">
            Derrière chaque manche, il y a une bande de passionnés. Membres,
            portraits, anecdotes et coulisses de l&apos;association, mis à jour
            au fil de la saison par le bureau.
          </p>

          <div className="flex flex-wrap gap-2 mt-5">
            {podium && (
              <a
                href="#podium"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-brass/50 text-brass hover:bg-brass hover:text-ink transition-colors"
              >
                Dernier podium
              </a>
            )}
            {portraits.length > 0 && (
              <a
                href="#portraits"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-forest text-forest-glow hover:bg-forest hover:text-white transition-colors"
              >
                Portraits
              </a>
            )}
            <a
              href="#membres"
              className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-forest text-forest-glow hover:bg-forest hover:text-white transition-colors"
            >
              Les membres
            </a>
            {(cfepaTeam.length > 0 || isModerator) && (
              <a
                href="#equipe-cfepa"
                className="text-[0.68rem] tracking-wide uppercase font-semibold px-3 py-1.5 rounded-full border border-brass/50 text-brass hover:bg-brass hover:text-ink transition-colors"
              >
                Équipe CFEPA
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="px-7 pb-14">
        <div className="max-w-4xl mx-auto">
          <section id="podium" className="scroll-mt-24 mb-14">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-serif font-semibold">Dernier podium</h2>
              <span className="h-px flex-1 bg-white/15" />
            </div>
            {podium ? (
              <div className="card-hover bg-white text-ink border border-white/10 rounded-lg p-6 max-w-md">
                <div className="text-[0.62rem] tracking-widest uppercase text-burgundy font-semibold mb-1">
                  {podium.label ?? `Manche ${podium.number}`}
                </div>
                <div className="text-xs text-sage mb-4">
                  {new Date(podium.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="space-y-3">
                  {podium.results.map((res) => {
                    const isPublic = res.member.publicResults;
                    const name = isPublic ? res.member.nickname : "Privé";
                    return (
                      <div key={res.id} className="flex items-center gap-3">
                        <span className="text-xl w-7 flex-shrink-0">
                          {MEDALS[res.position - 1] ?? `${res.position}.`}
                        </span>
                        <Avatar photoUrl={isPublic ? res.member.photoUrl : null} name={name} size={32} />
                        <div className="min-w-0 flex-1 font-medium text-sm truncate">{name}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-forest-2 text-sm font-medium border-t border-ink/10 mt-4 pt-4">
                  🎉 Bravo à {frenchJoin(podiumNames)} pour ce beau podium !
                </p>
              </div>
            ) : (
              <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
                Le podium de la prochaine manche terminée s&apos;affichera ici.
              </p>
            )}
          </section>

          {portraits.length > 0 && (
            <section id="portraits" className="scroll-mt-24 mb-14">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">Portraits</h2>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {portraits.map((p) => (
                  <div
                    key={p.id}
                    className="card-hover bg-white text-ink border border-white/10 rounded-lg p-6 flex gap-4 items-start"
                  >
                    {p.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.photoUrl}
                        alt={p.displayName}
                        className="w-16 h-16 object-cover rounded-full flex-shrink-0"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-serif font-semibold mb-0.5">{p.displayName}</h3>
                      {p.role && (
                        <div className="text-xs uppercase tracking-wide text-burgundy font-semibold mb-2">
                          {p.role}
                        </div>
                      )}
                      <p className="text-sage text-sm leading-relaxed">{p.bio}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="membres" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-serif font-semibold">Les membres du club</h2>
              <span className="h-px flex-1 bg-white/15" />
            </div>
            {sortedMembers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {sortedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="card-hover bg-white text-ink border border-white/10 rounded-lg p-4 flex flex-col items-center text-center gap-2"
                  >
                    <Avatar photoUrl={m.photoUrl} name={`${m.firstName} ${m.lastName}`} size={56} />
                    <MemberPopover
                      memberId={m.id}
                      nickname={m.nickname}
                      className="font-serif font-semibold text-sm truncate w-full hover:text-forest transition-colors"
                    />
                    <div className="text-[0.62rem] tracking-widest uppercase text-burgundy font-semibold">
                      {ROLE_LABEL[m.user.role] ?? m.user.role}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
                Les membres du club apparaîtront ici dès la première adhésion validée.
              </p>
            )}
          </section>

          {(cfepaTeam.length > 0 || isModerator) && (
            <section id="equipe-cfepa" className="scroll-mt-24 mt-14">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xl md:text-2xl font-serif font-semibold">Équipe CFEPA</h2>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <p className="text-white/60 text-sm mb-6 max-w-xl">
                Les membres du club qui représentent l&apos;Amical Poker Club au CFEPA.
              </p>

              {isModerator ? (
                <CfepaTeamPanel initialTeam={cfepaTeam} candidateMembers={cfepaCandidates} />
              ) : cfepaTeam.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {cfepaTeam.map((m) => (
                    <div
                      key={m.id}
                      className="card-hover bg-white text-ink border border-white/10 rounded-lg p-4 flex flex-col items-center text-center gap-2"
                    >
                      <Avatar photoUrl={m.photoUrl} name={`${m.firstName} ${m.lastName}`} size={56} />
                      <MemberPopover
                        memberId={m.id}
                        nickname={m.nickname}
                        className="font-serif font-semibold text-sm truncate w-full hover:text-forest transition-colors"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {!isModerator && cfepaTeam.length === 0 && (
                <p className="bg-white/5 border border-white/15 text-white/70 text-sm rounded-lg p-8 text-center">
                  L&apos;équipe CFEPA sera annoncée ici prochainement.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
