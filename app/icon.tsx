import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

// Google recommande désormais une favicon d'au moins 48x48px (idéalement un
// multiple, ex. 96x96) pour l'icône affichée dans les résultats de recherche
// — une taille de 32x32 reste techniquement valide mais est en-dessous de la
// résolution recommandée, ce qui peut la pénaliser dans les SERP.
export const size = { width: 96, height: 96 };
export const contentType = "image/png";

export default function Icon() {
  const logoData = fs.readFileSync(
    path.join(process.cwd(), "public/logo-apcv.png")
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 35% 30%, #e9dcb8 0%, #cdb26a 45%, #7c5e1f 100%)",
          borderRadius: "50%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={72}
          height={72}
          style={{ objectFit: "contain" }}
          alt=""
        />
      </div>
    ),
    { ...size }
  );
}
