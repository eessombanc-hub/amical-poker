import { ImageResponse } from "next/og";
import { absoluteUrl } from "@/lib/seo";

/**
 * Génère un visuel carré (1080×1080, adapté à Facebook comme à Instagram)
 * pour annoncer une nouvelle actu ou un nouveau portrait publié sur le site
 * — repris tel quel par lib/socialAnnounce.ts, qui l'envoie par e-mail au
 * bureau prêt à être posté. S'appuie sur next/og (Satori), déjà fourni par
 * Next.js : aucune dépendance supplémentaire à installer.
 *
 * Volontairement construit uniquement à partir des polices système (Satori
 * ne charge pas les polices Google du site — Fraunces/Cinzel — sans un
 * fetch supplémentaire au moment du rendu) : reste fiable et rapide, le
 * logo et la palette du club suffisent à rendre le visuel identifiable.
 */

const SIZE = 1080;

function clampTitle(title: string, max = 90): string {
  return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title;
}

export async function renderSocialCardPng({
  kicker,
  title,
}: {
  kicker: string;
  title: string;
}): Promise<Buffer> {
  const displayTitle = clampTitle(title);
  const titleFontSize = displayTitle.length > 55 ? 54 : displayTitle.length > 30 ? 64 : 76;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 90px",
          backgroundImage:
            "linear-gradient(155deg, #04140c 0%, #063d27 25%, #050505 50%, #2a0008 75%, #7a0012 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* logo du club, cerclé d'un anneau doré façon pièce */}
        <div
          style={{
            display: "flex",
            width: 190,
            height: 190,
            borderRadius: "50%",
            backgroundColor: "#f0b429",
            padding: 10,
            boxShadow: "0 0 0 6px rgba(240,180,41,0.25)",
          }}
        >
          <img
            src={absoluteUrl("/logo-apcv.png")}
            width={170}
            height={170}
            style={{ borderRadius: "50%", objectFit: "contain", backgroundColor: "#ffffff" }}
          />
        </div>

        {/* étiquette "kicker" : nature de l'annonce */}
        <div
          style={{
            display: "flex",
            marginTop: 44,
            padding: "10px 26px",
            borderRadius: 999,
            border: "2px solid #f0b429",
            color: "#ffd666",
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {kicker}
        </div>

        {/* titre de l'annonce */}
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: titleFontSize,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.25,
            maxWidth: 820,
          }}
        >
          {displayTitle}
        </div>

        {/* pied de page : nom du club + site */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 56,
          }}
        >
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff" }}>
            Amical Poker Club
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#f0b429", marginTop: 6 }}>
            amicalpokerclub.fr
          </div>
        </div>
      </div>
    ),
    { width: SIZE, height: SIZE }
  );

  const arrayBuffer = await image.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
