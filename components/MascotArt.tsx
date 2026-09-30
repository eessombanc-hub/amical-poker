import { useId } from "react";

/**
 * Dessin de la mascotte du club (oiseau doré façon pièce, ailes bordeaux,
 * écho du pique de l'emblème historique) — utilisé par la mascotte
 * flottante d'aide à la recherche (voir HelperMascot.tsx). Le logo du site
 * (Logo.tsx) reste volontairement séparé : c'est la pièce tournante
 * historique avec le pique ailé noir/rouge, pas ce personnage.
 *
 * Les ids des dégradés SVG sont préfixés avec un id React unique (useId)
 * pour éviter toute collision si plusieurs instances se retrouvaient un
 * jour sur la même page en même temps.
 */
export default function MascotArt({
  size = 68,
  animated = true,
  glossy = true,
  className = "",
}: {
  size?: number;
  /** Anime clignement des yeux, regard, flottement et battements d'ailes. */
  animated?: boolean;
  /** Reflets brillants façon figurine (tête/corps/ailes) pour un rendu plus 3D. */
  glossy?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const face = `mFace-${uid}`;
  const gloss = `mGloss-${uid}`;
  const wing = `mWing-${uid}`;
  const wingRim = `mWingRim-${uid}`;
  const beak = `mBeak-${uid}`;
  const height = Math.round(size * (72 / 68));

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 68 72"
      className={`${animated ? "animate-mascot-float" : ""} ${className}`}
      role="img"
      aria-label="Amical Poker Club"
    >
      <defs>
        <radialGradient id={face} cx="34%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#fffcf0" />
          <stop offset="28%" stopColor="#ffe6a0" />
          <stop offset="60%" stopColor="#f5c33e" />
          <stop offset="85%" stopColor="#d99a1e" />
          <stop offset="100%" stopColor="#a9740f" />
        </radialGradient>
        {glossy && (
          <radialGradient id={gloss} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="60%" stopColor="#ffffff" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </radialGradient>
        )}
        <linearGradient id={wing} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#c23a63" />
          <stop offset="35%" stopColor="#8a2444" />
          <stop offset="70%" stopColor="#450f22" />
          <stop offset="100%" stopColor="#1a0509" />
        </linearGradient>
        {glossy && (
          <linearGradient id={wingRim} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd9a8" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#ffd9a8" stopOpacity={0} />
          </linearGradient>
        )}
        <linearGradient id={beak} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe0c2" />
          <stop offset="55%" stopColor="#ffab6b" />
          <stop offset="100%" stopColor="#e8632a" />
        </linearGradient>
      </defs>

      {/* ailes (référence directe à l'ancien emblème, adoucies en bordeaux),
         avec battement continu — voir tailwind.config.ts,
         animate-mascot-wing-left/right */}
      <path
        d="M14 40c-8 2-13 10-13 18 7-1 13-4 17-9 2 6 6 10 11 12-1-9-6-16-15-21z"
        fill={`url(#${wing})`}
        className={animated ? "origin-[14px_49px] animate-mascot-wing-left" : ""}
      />
      {glossy && (
        <path
          d="M14 40c-6 1.6-10.3 6.8-11.8 13 5-1.4 9-4.2 12-8.2"
          fill="none"
          stroke={`url(#${wingRim})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          className={animated ? "origin-[14px_49px] animate-mascot-wing-left" : ""}
        />
      )}
      <path
        d="M54 40c8 2 13 10 13 18-7-1-13-4-17-9-2 6-6 10-11 12 1-9 6-16 15-21z"
        fill={`url(#${wing})`}
        className={animated ? "origin-[54px_49px] animate-mascot-wing-right" : ""}
      />
      {glossy && (
        <path
          d="M54 40c6 1.6 10.3 6.8 11.8 13-5-1.4-9-4.2-12-8.2"
          fill="none"
          stroke={`url(#${wingRim})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          className={animated ? "origin-[54px_49px] animate-mascot-wing-right" : ""}
        />
      )}

      {/* ombre de contact tête/corps */}
      {glossy && <ellipse cx="34" cy="33" rx="13" ry="3.4" fill="#00000022" />}

      {/* corps, façon pièce/sphère dorée */}
      <ellipse cx="34" cy="46" rx="17" ry="15" fill={`url(#${face})`} stroke="#8a6a1e" strokeWidth="1" />
      {glossy && <ellipse cx="28" cy="38" rx="9" ry="6" fill={`url(#${gloss})`} />}
      {/* pique rouge, écho de l'emblème historique */}
      <path
        d="M34 38c3 3.4 6.4 6 6.4 9.6 0 2.4-1.9 4-4.2 4-.8 0-1.5-.2-2.2-.6.5 1.6 1.6 2.6 1.6 2.6h-3.2s1.1-1 1.6-2.6c-.7.4-1.4.6-2.2.6-2.3 0-4.2-1.6-4.2-4 0-3.6 3.4-6.2 6.4-9.6z"
        fill="#ff1f3d"
        opacity={0.9}
      />

      {/* tête façon oiseau */}
      <circle cx="34" cy="23" r="16" fill={`url(#${face})`} stroke="#8a6a1e" strokeWidth="1" />
      {glossy && <ellipse cx="27" cy="15" rx="9.5" ry="6.5" fill={`url(#${gloss})`} />}

      {/* petite huppe, 3 plumes sur le crâne (bordeaux, assorties aux ailes) */}
      <path d="M27 8c-1.5-2.6-1-5-0.2-6.4 1.6 1 2.6 3.2 2.4 5.8z" fill="#5a1730" />
      <path d="M34 6.4c-0.6-2.8 0.2-5 1.4-6.4 1.3 1.3 1.9 3.6 1 6.1z" fill="#ff1f3d" />
      <path d="M41 8c1.5-2.6 1-5 0.2-6.4-1.6 1-2.6 3.2-2.4 5.8z" fill="#5a1730" />

      {/* grands yeux pétillants, animés (clignement + regard) avec cils */}
      <g className={animated ? "origin-[26.5px_21px] animate-mascot-blink" : ""}>
        <ellipse cx="26.5" cy="21" rx="7.1" ry="7.1" fill="#fff" stroke="#8a6a1e" strokeWidth="0.6" />
        <g className={animated ? "animate-mascot-look" : ""}>
          <circle cx="27.5" cy="22" r="3.7" fill="#0b1f16" />
          <circle cx="25.6" cy="19.6" r="1.5" fill="#fff" />
          <circle cx="28.9" cy="23.6" r="0.7" fill="#fff" opacity={0.85} />
        </g>
        <path d="M20.6 16.8c-1.3-1.1-2.9-1.5-4.3-1.2" fill="none" stroke="#0b1f16" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M20.8 19.4c-1.6-0.5-3.2-0.4-4.5 0.4" fill="none" stroke="#0b1f16" strokeWidth="0.9" strokeLinecap="round" />
      </g>
      <g className={animated ? "origin-[41.5px_21px] animate-mascot-blink" : ""}>
        <ellipse cx="41.5" cy="21" rx="7.1" ry="7.1" fill="#fff" stroke="#8a6a1e" strokeWidth="0.6" />
        <g className={animated ? "animate-mascot-look" : ""}>
          <circle cx="42.5" cy="22" r="3.7" fill="#0b1f16" />
          <circle cx="40.6" cy="19.6" r="1.5" fill="#fff" />
          <circle cx="43.9" cy="23.6" r="0.7" fill="#fff" opacity={0.85} />
        </g>
        <path d="M47.4 16.8c1.3-1.1 2.9-1.5 4.3-1.2" fill="none" stroke="#0b1f16" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M47.2 19.4c1.6-0.5 3.2-0.4 4.5 0.4" fill="none" stroke="#0b1f16" strokeWidth="0.9" strokeLinecap="round" />
      </g>

      {/* paupières basses relevées = regard souriant */}
      <path d="M20.2 25.6c1.9 2.6 4.4 3.7 6.3 3.5 1.8-0.2 3.2-1.1 3.9-2.4" fill="none" stroke="#0b1f16" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M35.6 26.7c0.7 1.3 2.1 2.2 3.9 2.4 1.9 0.2 4.4-0.9 6.3-3.5" fill="none" stroke="#0b1f16" strokeWidth="1.5" strokeLinecap="round" />

      {/* sourcils joyeux, relevés pour un air avenant */}
      <path d="M21 14.8c1.9-2 4.4-2.5 6.4-1.6" fill="none" stroke="#0b1f16" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M47 14.8c-1.9-2-4.4-2.5-6.4-1.6" fill="none" stroke="#0b1f16" strokeWidth="1.4" strokeLinecap="round" />

      {/* petits plis de sourire de part et d'autre du bec */}
      <path d="M22.6 30.4c1.3 1.7 2.9 2.6 4.4 2.8" fill="none" stroke="#c97a1f" strokeWidth="1" strokeLinecap="round" opacity={0.55} />
      <path d="M45.4 30.4c-1.3 1.7-2.9 2.6-4.4 2.8" fill="none" stroke="#c97a1f" strokeWidth="1" strokeLinecap="round" opacity={0.55} />

      {/* joues, rondes, roses et brillantes */}
      <circle cx="21.5" cy="30.5" r="3.1" fill="#ff8fa3" opacity={0.72} />
      <circle cx="46.5" cy="30.5" r="3.1" fill="#ff8fa3" opacity={0.72} />
      <circle cx="20.4" cy="29.3" r="0.7" fill="#fff" opacity={0.75} />
      <circle cx="45.4" cy="29.3" r="0.7" fill="#fff" opacity={0.75} />

      {/* bec, descendu pour ne pas toucher les yeux, adouci et arrondi */}
      <path
        d="M28 28.5
           C29.5 30.5 32 31.1 34 31.1
           C36 31.1 38.5 30.5 40 28.5
           C39.3 33.5 37.3 38.5 34.6 40.9
           C34.2 41.2 33.8 41.2 33.4 40.9
           C30.7 38.5 28.7 33.5 28 28.5 Z"
        fill={`url(#${beak})`}
        stroke="#b35f00"
        strokeWidth="0.5"
      />
      {glossy && (
        <path d="M31 29.1c1 1 2 1.4 3 1.4 1 0 2-0.4 3-1.4" fill="none" stroke="#fff" strokeWidth="0.6" opacity={0.55} strokeLinecap="round" />
      )}
      <path d="M33.2 39.5 C33.5 41.8 34.5 41.8 34.8 39.5 C34.3 40.6 33.7 40.6 33.2 39.5 Z" fill="#c97a1f" />
      <path d="M30 34.5c1.5 0.6 6.5 0.6 8 0" fill="none" stroke="#b35f00" strokeWidth="0.5" opacity={0.7} />
      <circle cx="31.4" cy="29.7" r="0.55" fill="#7a4a12" opacity={0.8} />
      <circle cx="36.6" cy="29.7" r="0.55" fill="#7a4a12" opacity={0.8} />

      {/* petit reflet façon pièce brillante */}
      <path d="M23 12c2-2.6 5.4-4 8-3.8" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity={0.7} fill="none" />
    </svg>
  );
}
