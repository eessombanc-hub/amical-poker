import MemberPopover from "@/components/MemberPopover";

type PodiumEntry = { name: string; value: string; memberId?: string } | null;

/** Pseudo du podium : cliquable (popup classement + kills) si `memberId`
 *  est fourni — absent pour le repli "site historique", qui n'est pas relié
 *  à une fiche Member. */
function PodiumName({ entry, className }: { entry: { name: string; memberId?: string }; className: string }) {
  if (entry.memberId) {
    return <MemberPopover memberId={entry.memberId} nickname={entry.name} className={className} />;
  }
  return <div className={className}>{entry.name}</div>;
}

/** Médaillon rond reprenant le logo du club, affiché au-dessus du nom de
 *  chaque joueur — à la place de l'emoji médaille — avec un liseré
 *  or/argent/bronze selon la place. */
function LogoMedal({ size, ringClassName }: { size: number; ringClassName: string }) {
  return (
    <div
      className={`rounded-full bg-white flex items-center justify-center shadow-md ring-[3px] mb-1.5 ${ringClassName}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-apcv.png"
        alt="Amical Poker Club"
        style={{ width: "72%", height: "72%", objectFit: "contain" }}
      />
    </div>
  );
}

/**
 * Podium façon athlétisme (2e à gauche, 1er au centre en position la plus
 * haute, 3e à droite) affiché au-dessus du tableau de classement — sur
 * /classement, pour le classement interne comme pour le repli "site
 * historique". Purement décoratif, ne fait aucun appel réseau.
 */
export default function RankingPodium({
  first,
  second,
  third,
}: {
  first: PodiumEntry;
  second: PodiumEntry;
  third: PodiumEntry;
}) {
  if (!first) return null;

  return (
    <div className="mb-9 flex items-end justify-center gap-2.5 sm:gap-4">
      {second && (
        <div className="flex flex-col items-center w-[5.5rem] sm:w-28">
          <LogoMedal size={34} ringClassName="ring-[#93a0ab]" />
          <PodiumName
            entry={second}
            className="font-serif font-semibold text-xs sm:text-sm text-center leading-snug line-clamp-2 w-full px-1"
          />
          <div className="text-[0.65rem] sm:text-xs text-sage font-mono-club mb-2">{second.value}</div>
          <div className="w-full h-16 sm:h-20 rounded-t-lg bg-gradient-to-b from-[#c7d0d9] to-[#93a0ab] shadow-inner" />
        </div>
      )}

      <div className="flex flex-col items-center w-24 sm:w-32">
        <LogoMedal size={42} ringClassName="ring-brass" />
        <PodiumName
          entry={first}
          className="font-serif font-bold text-sm sm:text-base text-center leading-snug line-clamp-2 w-full px-1"
        />
        <div className="text-xs sm:text-sm text-sage font-mono-club mb-2">{first.value}</div>
        <div className="w-full h-24 sm:h-28 rounded-t-lg bg-gradient-to-b from-brass-light to-brass shadow-inner" />
      </div>

      {third && (
        <div className="flex flex-col items-center w-[5.5rem] sm:w-28">
          <LogoMedal size={30} ringClassName="ring-[#a86428]" />
          <PodiumName
            entry={third}
            className="font-serif font-semibold text-xs sm:text-sm text-center leading-snug line-clamp-2 w-full px-1"
          />
          <div className="text-[0.65rem] sm:text-xs text-sage font-mono-club mb-2">{third.value}</div>
          <div className="w-full h-11 sm:h-14 rounded-t-lg bg-gradient-to-b from-[#d9a06a] to-[#a86428] shadow-inner" />
        </div>
      )}
    </div>
  );
}
