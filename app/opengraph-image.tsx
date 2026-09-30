import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.10), transparent 60%), radial-gradient(circle at 50% 50%, #0d2318 0%, #06110c 70%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={190}
          height={105}
          style={{ objectFit: "contain" }}
          alt=""
        />
        <div
          style={{
            display: "flex",
            fontSize: 64,
            color: "#f3d98b",
            letterSpacing: -1,
            fontWeight: 600,
          }}
        >
          Amical Poker Club
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "rgba(243,217,139,0.65)",
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Association loi 1901 · Villecresnes
        </div>
      </div>
    ),
    { ...size }
  );
}
