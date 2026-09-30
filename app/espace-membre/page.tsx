import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import Avatar from "@/components/Avatar";
import BirthDateForm from "@/components/BirthDateForm";
import ProfileForm from "@/components/ProfileForm";
import ProfileEditToggle from "@/components/ProfileEditToggle";
import RankChangeArrow from "@/components/RankChangeArrow";
import TrafficSection from "@/components/TrafficSection";
import { computeRankChanges } from "@/lib/ranking";

// Code couleur de la cotisation annuelle (voir prisma/schema.prisma, enum
// CotisationStatus) — modifiable uniquement par les admins depuis
// /admin/membres, affiché ici au membre concerné à titre informatif.
const COTISATION_INFO: Record<string, { dot: string; label: string }> = {
  PAYEE: { dot: "bg-forest", label: "À jour" },
  PARTIELLE: { dot: "bg-brass", label: "Partiellement réglée" },
  NON_PAYEE: { dot: "bg-crimson", label: "Non réglée" },
};

// Explicite (plutôt que de compter sur la détection implicite de Next.js via
// getServerSession/cookies) : évite tout risque de mise en cache de page qui
// referait apparaître un message urgent déjà acquitté (voir
// components/UrgentMessagePopup.tsx) à une connexion suivante.
export const dynamic = "force-dynamic";

// Logo du club en grand filigrane animé, fond de page — commun aux deux
// variantes ci-dessous (invité / membre). Design volontairement plus clair
// que le reste du site (voir les autres onglets, fond sombre "site
// sportif") : l'Espace membre doit se sentir comme un salon privé plutôt
// qu'une page éditoriale. Le halo respire doucement (animate-coin-halo,
// déjà utilisé par components/Logo.tsx) derrière le logo, qui tourne très
// lentement sur lui-même (animate-logo-spin-ambient, 90s/tour — presque
// imperceptible, juste assez pour donner vie au fond).
function EspaceMembreBackground() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] md:w-[900px] md:h-[900px] rounded-full opacity-90 animate-coin-halo"
        style={{
          background:
            "radial-gradient(circle, rgba(240,180,41,0.16) 0%, rgba(10,222,124,0.06) 45%, transparent 72%)",
          filter: "blur(6px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] md:w-[760px] md:h-[760px] opacity-[0.05] grayscale animate-logo-spin-ambient"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-apcv.png" alt="" className="w-full h-full object-contain" />
      </div>
    </>
  );
}

export default async function EspaceMembrePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/connexion");

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  // Accès invité : pas de fiche membre, pas de classement ni d'inscription
  // aux manches — juste le forum. On affiche un espace dédié, plus simple.
  if (role === "INVITE") {
    return (
      <div
        className="relative min-h-screen overflow-hidden px-7 py-14"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, rgba(240,180,41,0.10) 0%, transparent 45%), radial-gradient(circle at 100% 20%, rgba(10,222,124,0.08) 0%, transparent 50%), linear-gradient(165deg, #fffdf8 0%, #eefdf6 48%, #fbf4e3 100%)",
        }}
      >
        <EspaceMembreBackground />

        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-9">
            <div>
              <div className="text-[0.72rem] tracking-widest uppercase text-[#b8912f] font-semibold mb-2">
                Accès invité
              </div>
              <h1 className="text-gold-deep animate-royal-shine text-3xl">
                Bonjour {(session.user as any).name || session.user.email}
              </h1>
            </div>
            <LogoutButton />
          </div>

          <div className="bg-white/85 backdrop-blur-md border border-brass/25 rounded-2xl shadow-sm p-5 mb-8 text-sm text-ink/80">
            Vous disposez d&apos;un accès invité : vous pouvez suivre et
            participer au forum du club, mais vous n&apos;êtes pas inscrit aux
            manches ni au classement. Pour rejoindre le club, faites une{" "}
            <Link href="/demande-adhesion" className="text-forest-2 underline underline-offset-4">
              demande d&apos;adhésion
            </Link>
            .
          </div>

          <div className="bg-white/85 backdrop-blur-md text-ink border border-ink/7 rounded-2xl shadow-sm p-6 mb-8">
            <ProfileForm
              mode="invite"
              initialDisplayName={(session.user as any).name || session.user.email || ""}
            />
          </div>

          <Link
            href="/forum"
            className="btn-glow inline-block bg-forest text-white px-6 py-3 rounded-full text-sm font-medium"
          >
            Accéder au forum du club
          </Link>
        </div>
      </div>
    );
  }

  const member = await prisma.member.findUnique({
    where: { userId },
    include: {
      registrations: {
        include: { round: true },
        orderBy: { round: { date: "asc" } },
      },
    },
  });

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
  const ranking = member && activeSeason
    ? await prisma.ranking.findUnique({
        where: { seasonId_memberId: { seasonId: activeSeason.id, memberId: member.id } },
      })
    : null;
  const rankChange =
    member && activeSeason ? (await computeRankChanges(activeSeason.id)).get(member.id) : undefined;

  // Position dans le classement en cours (1 = 1er) — pour la couleur
  // or/argent/bronze du podium, calculée dans le même ordre que la page
  // /classement (tri par totalPoints décroissant).
  const rankPosition =
    ranking && activeSeason
      ? (await prisma.ranking.findMany({
          where: { seasonId: activeSeason.id },
          orderBy: { totalPoints: "desc" },
          select: { memberId: true },
        })).findIndex((r) => r.memberId === member!.id) + 1
      : member?.legacyRankingPlace ?? null;

  const PODIUM_COLOR: Record<number, string> = {
    1: "text-brass",
    2: "text-[#9aa7b2]",
    3: "text-[#b3702f]",
  };
  const rankColorClass = rankPosition ? PODIUM_COLOR[rankPosition] ?? "text-forest-2" : "text-forest-2";

  const upcoming = member?.registrations.filter(
    (r) => r.status !== "ANNULE" && new Date(r.round.date) >= new Date(new Date().toDateString())
  );

  const pendingRequestsCount = hasRole(role, "RESPONSABLE")
    ? await prisma.membershipRequest.count({ where: { status: "EN_ATTENTE" } })
    : 0;
  const pendingContentRequestsCount = hasRole(role, "RESPONSABLE")
    ? await prisma.contentRequest.count({ where: { status: "EN_ATTENTE" } })
    : 0;

  // Message(s) urgent(s) du bureau : affichés désormais sur toute page du
  // site via components/UrgentMessageGate.tsx (voir app/layout.tsx), pas
  // seulement ici, pour qu'un membre les voie dès son retour sur le site.

  // Point de nouveauté à côté de Forum du club, Gazette Poker, Forum du
  // bureau, Galerie et Stratégie ci-dessous (raccourcis) : on compare la
  // date du contenu le plus récent de chaque rubrique à la dernière visite
  // du membre (lastSeen*At sur User, mis à jour par
  // components/MarkSectionSeen.tsx sur chaque rubrique). Forum du bureau
  // n'est interrogé que pour un membre qui y a accès.
  const [
    seenAt,
    latestForumTopic,
    latestForumReply,
    latestPokerNews,
    latestForumBureauTopic,
    latestForumBureauReply,
    latestPhoto,
    latestStrategieArticle,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastSeenForumAt: true,
        lastSeenPokerNewsAt: true,
        lastSeenForumBureauAt: true,
        lastSeenGalerieAt: true,
        lastSeenStrategieAt: true,
      },
    }),
    prisma.forumTopic.findFirst({ where: { area: "COMMUN" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.forumReply.findFirst({ where: { topic: { area: "COMMUN" } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.pokerNewsItem.findFirst({ where: { status: "PUBLIE" }, orderBy: { fetchedAt: "desc" }, select: { fetchedAt: true } }),
    hasRole(role, "RESPONSABLE")
      ? prisma.forumTopic.findFirst({ where: { area: "BUREAU" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
      : null,
    hasRole(role, "RESPONSABLE")
      ? prisma.forumReply.findFirst({ where: { topic: { area: "BUREAU" } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
      : null,
    prisma.photo.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.strategieArticle.findFirst({ where: { status: "PUBLIE" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  function maxDate(...dates: (Date | null | undefined)[]): Date | null {
    const valid = dates.filter((d): d is Date => !!d);
    return valid.length > 0 ? valid.reduce((a, b) => (a > b ? a : b)) : null;
  }
  function isNew(latest: Date | null, lastSeen: Date | null | undefined) {
    return !!latest && (!lastSeen || latest > lastSeen);
  }

  const hasNewForum = isNew(maxDate(latestForumTopic?.createdAt, latestForumReply?.createdAt), seenAt?.lastSeenForumAt);
  const hasNewPokerNews = isNew(latestPokerNews?.fetchedAt ?? null, seenAt?.lastSeenPokerNewsAt);
  const hasNewForumBureau = isNew(
    maxDate(latestForumBureauTopic?.createdAt, latestForumBureauReply?.createdAt),
    seenAt?.lastSeenForumBureauAt
  );
  const hasNewGalerie = isNew(latestPhoto?.createdAt ?? null, seenAt?.lastSeenGalerieAt);
  const hasNewStrategie = isNew(latestStrategieArticle?.createdAt ?? null, seenAt?.lastSeenStrategieAt);

  const NewDot = () => (
    <span
      className="ml-1.5 inline-block w-2 h-2 rounded-full bg-burgundy align-middle"
      title="Nouveau contenu non consulté"
    />
  );

  // Trafic du site (compteur maison, voir prisma/schema.prisma, PageView) —
  // réservé au bureau, aux responsables et à l'admin, comme les demandes
  // d'adhésion ci-dessus. Chaque période distingue les visiteurs connectés
  // à leur espace (authenticated=true, membre ou invité identifié) des
  // visiteurs cachés (anonymes, non identifiés).
  const traffic = hasRole(role, "RESPONSABLE")
    ? await (async () => {
        async function bucket(gte?: Date) {
          const where = gte ? { createdAt: { gte } } : {};
          const [total, connected] = await Promise.all([
            prisma.pageView.count({ where }),
            prisma.pageView.count({ where: { ...where, authenticated: true } }),
          ]);
          return { total, connected, hidden: total - connected };
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [today, sevenDays, thirtyDays, total] = await Promise.all([
          bucket(startOfToday),
          bucket(last7Days),
          bucket(last30Days),
          bucket(),
        ]);
        return { today, sevenDays, thirtyDays, total };
      })()
    : null;

  return (
    <div
      className="relative min-h-screen overflow-hidden px-7 py-14"
      style={{
        background:
          "radial-gradient(circle at 15% 0%, rgba(240,180,41,0.10) 0%, transparent 45%), radial-gradient(circle at 100% 20%, rgba(10,222,124,0.08) 0%, transparent 50%), linear-gradient(165deg, #fffdf8 0%, #eefdf6 48%, #fbf4e3 100%)",
      }}
    >
      <EspaceMembreBackground />

      <div className="relative max-w-4xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-9">
          <div className="flex items-center gap-4">
            {member && (
              <div className="rounded-full ring-2 ring-brass/60 ring-offset-2 ring-offset-white">
                <Avatar
                  photoUrl={member.photoUrl}
                  name={member.nickname || `${member.firstName} ${member.lastName}`}
                  size={52}
                />
              </div>
            )}
            <div>
              <div className="text-[0.72rem] tracking-widest uppercase text-[#b8912f] font-semibold mb-2">
                Espace membre
              </div>
              <h1 className="text-gold-deep animate-royal-shine text-3xl">
                Bonjour {member ? `${member.firstName} (${member.nickname})` : session.user.email}
              </h1>
            </div>
          </div>
          <LogoutButton />
        </div>

        {member && (
          <ProfileEditToggle
            name={member.nickname || `${member.firstName} ${member.lastName}`}
            initialPhotoUrl={member.photoUrl}
            initialFirstName={member.firstName}
            initialLastName={member.lastName}
            initialNickname={member.nickname}
            initialBirthDate={member.birthDate ? member.birthDate.toISOString().slice(0, 10) : ""}
            initialPublicResults={member.publicResults}
          />
        )}

        <div className="grid md:grid-cols-4 gap-5 mb-10">
          <div className="card-hover bg-white/85 backdrop-blur-md text-ink border border-ink/7 rounded-2xl shadow-sm p-5">
            <div className="text-xs uppercase tracking-wide text-sage mb-1">Statut</div>
            <div className="text-lg font-medium">{member?.membershipStatus ?? "—"}</div>
          </div>
          <div className="card-hover bg-white/85 backdrop-blur-md text-ink border border-ink/7 rounded-2xl shadow-sm p-5">
            <div className="text-xs uppercase tracking-wide text-sage mb-1">Cotisation</div>
            {member ? (
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${COTISATION_INFO[member.cotisationStatus].dot}`}
                  aria-hidden
                />
                <span className="text-base font-medium leading-snug">
                  {COTISATION_INFO[member.cotisationStatus].label}
                </span>
              </div>
            ) : (
              <div className="text-lg font-medium">—</div>
            )}
          </div>
          <div className="card-hover bg-white/85 backdrop-blur-md text-ink border border-ink/7 rounded-2xl shadow-sm p-5">
            <div className="text-xs uppercase tracking-wide text-sage mb-1">
              Classement {activeSeason?.label ?? ""}
            </div>
            {ranking && rankPosition ? (
              <>
                <div className={`text-5xl md:text-6xl font-serif font-bold ${rankColorClass} flex items-center gap-2 leading-none`}>
                  {rankPosition}
                  <span className="text-lg font-sans font-normal text-sage">
                    {rankPosition === 1 ? "ère" : "e"}
                  </span>
                  <RankChangeArrow delta={rankChange} />
                </div>
                <div className="text-sm text-sage mt-1.5">{ranking.totalPoints} pts</div>
              </>
            ) : member?.legacyRankingPlace ? (
              <div className={`text-5xl md:text-6xl font-serif font-bold ${rankColorClass} leading-none`}>
                {member.legacyRankingPlace}
                <span className="text-lg font-sans font-normal text-sage ml-1">
                  {member.legacyRankingPlace === 1 ? "ère" : "e"}
                </span>
              </div>
            ) : (
              <div className="text-lg font-medium">Pas encore classé</div>
            )}
          </div>
          <div className="card-hover bg-white/85 backdrop-blur-md text-ink border border-ink/7 rounded-2xl shadow-sm p-5">
            <div className="text-xs uppercase tracking-wide text-sage mb-1">Rôle</div>
            <div className="text-lg font-medium">{role}</div>
          </div>
        </div>

        {member && !member.birthDate && (
          <div className="mb-10 bg-white/85 backdrop-blur-md text-ink border border-brass/30 rounded-2xl shadow-sm p-5">
            <div className="text-sm font-medium text-ink mb-1">Date de naissance manquante</div>
            <p className="text-xs text-sage mb-4">
              Renseignez-la pour que le club puisse vous souhaiter votre
              anniversaire sur l&apos;accueil du site. Elle n&apos;est
              utilisée que pour ça (et pour vérifier la majorité requise).
            </p>
            <BirthDateForm />
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-xl text-ink mb-4">Mes prochaines inscriptions</h2>
          {upcoming && upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((r) => (
                <div
                  key={r.id}
                  className="card-hover flex items-center justify-between bg-white/85 backdrop-blur-md text-ink border border-ink/7 rounded-2xl shadow-sm px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      Manche {r.round.number},{" "}
                      {new Date(r.round.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </div>
                    <div className="text-xs text-sage">{r.round.location}</div>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-forest-2 font-semibold">
                    {r.status === "LISTE_ATTENTE" ? "Liste d'attente" : "Inscrit"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sage text-sm">
              Aucune inscription à venir.{" "}
              <Link href="/calendrier" className="text-forest-2 underline underline-offset-4">
                Voir le calendrier
              </Link>
            </p>
          )}
        </div>

        {traffic && <TrafficSection traffic={traffic} />}

        <div>
          <h2 className="text-xl text-ink mb-4">Raccourcis</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/forum" className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm hover:border-brass/50 transition-colors rounded-full px-4 py-2.5 text-sm">
              Forum du club
              {hasNewForum && <NewDot />}
            </Link>
            <Link href="/classement" className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm hover:border-brass/50 transition-colors rounded-full px-4 py-2.5 text-sm">
              Classement complet
            </Link>
            <Link href="/poker-news" className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm hover:border-brass/50 transition-colors rounded-full px-4 py-2.5 text-sm">
              Gazette Poker
              {hasNewPokerNews && <NewDot />}
            </Link>
            <Link href="/strategie" className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm hover:border-brass/50 transition-colors rounded-full px-4 py-2.5 text-sm">
              Stratégie
              {hasNewStrategie && <NewDot />}
            </Link>
            <Link href="/galerie" className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm hover:border-brass/50 transition-colors rounded-full px-4 py-2.5 text-sm">
              Galerie
              {hasNewGalerie && <NewDot />}
            </Link>
            {member && (
              <Link href="/proposer-contenu" className="bg-white/85 backdrop-blur-md text-ink border border-ink/10 shadow-sm hover:border-brass/50 transition-colors rounded-full px-4 py-2.5 text-sm">
                Proposer un contenu
              </Link>
            )}
            {hasRole(role, "RESPONSABLE") && (
              <Link href="/forum-bureau" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Forum du bureau
                {hasNewForumBureau && <NewDot />}
              </Link>
            )}
            {hasRole(role, "RESPONSABLE") && (
              <Link href="/admin/poker-news" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Publier une actu poker
              </Link>
            )}
            {hasRole(role, "RESPONSABLE") && (
              <Link href="/admin/strategie" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Articles Stratégie
              </Link>
            )}
            {hasRole(role, "RESPONSABLE") && (
              <Link href="/admin/galerie" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Galeries photos &amp; vidéos
              </Link>
            )}
            {hasRole(role, "RESPONSABLE") && (
              <Link href="/admin/partenaires" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Partenaires
              </Link>
            )}
            {hasRole(role, "RESPONSABLE") && (
              <Link href="/admin/demandes-adhesion" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Demandes d&apos;adhésion
                {pendingRequestsCount > 0 && (
                  <span className="ml-1.5 bg-burgundy text-white text-xs rounded-full px-1.5 py-0.5">
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>
            )}
            {hasRole(role, "RESPONSABLE") && (
              <Link href="/admin/demandes-contenu" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Propositions de contenu
                {pendingContentRequestsCount > 0 && (
                  <span className="ml-1.5 bg-burgundy text-white text-xs rounded-full px-1.5 py-0.5">
                    {pendingContentRequestsCount}
                  </span>
                )}
              </Link>
            )}
            {hasRole(role, "BUREAU") && (
              <Link href="/admin/message-urgent" className="bg-burgundy/10 text-burgundy border border-burgundy/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Message urgent
              </Link>
            )}
            {hasRole(role, "BUREAU") && (
              <Link href="/admin/portraits" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Gérer les portraits
              </Link>
            )}
            {hasRole(role, "BUREAU") && (
              <Link href="/admin/newsletter" className="bg-forest/10 text-forest-2 border border-forest/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Newsletter
              </Link>
            )}
            {hasRole(role, "ADMIN") && (
              <Link href="/admin/membres" className="bg-burgundy/10 text-burgundy border border-burgundy/30 rounded-full px-4 py-2.5 text-sm font-medium">
                Membres &amp; comptes
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
