/**
 * Logo du club : une pièce dorée qui tourne en continu sur elle-même
 * (effet « pile ou face » en 3D), gravée de l'emblème réel de l'Amical
 * Poker Club sur ses deux faces. Purement décoratif — n'utilise aucun
 * stockage navigateur.
 */
export default function Logo({
  size = 40,
  animated = true,
  halo = false,
}: {
  size?: number;
  animated?: boolean;
  halo?: boolean;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
        perspective: size * 3.6,
      }}
    >
      {halo && (
        <div
          className={animated ? "animate-coin-halo" : ""}
          style={{
            position: "absolute",
            inset: -size * 0.35,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(212,175,55,0.28) 0%, rgba(212,175,55,0.08) 45%, transparent 72%)",
            filter: "blur(2px)",
            pointerEvents: "none",
          }}
        />
      )}

      <div
        className={animated ? "animate-coin-turn" : ""}
        style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}
      >
        {/* tranche dorée : simule l'épaisseur de la pièce vue de profil */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            background: "linear-gradient(180deg, #b8912f, #8a6a1e 45%, #6b5013 100%)",
          }}
        />

        {[0, 180].map((deg) => (
          <div
            key={deg}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              backfaceVisibility: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle at 35% 30%, #ffffff 0%, #f3ecd9 8%, #e9dcb8 22%, #cdb26a 45%, #a9822f 68%, #7c5e1f 100%)",
              boxShadow:
                "0 0 0 3px rgba(255,255,255,0.15) inset, 0 0 14px rgba(0,0,0,0.5), 0 6px 14px rgba(0,0,0,0.4)",
              transform: `rotateY(${deg}deg) translateZ(1px)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: Math.max(2, size * 0.08),
                borderRadius: "9999px",
                border: "1.5px solid rgba(255,255,255,0.55)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.35) inset, 0 2px 4px rgba(0,0,0,0.3) inset",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-apcv.png"
              alt="Amical Poker Club"
              style={{
                width: "64%",
                height: "64%",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))",
                position: "relative",
                zIndex: 1,
              }}
            />
          </div>
        ))}
      </div>
      <span className="sr-only">Amical Poker Club</span>
    </div>
  );
}
