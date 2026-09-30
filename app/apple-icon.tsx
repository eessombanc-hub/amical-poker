import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={130}
          height={130}
          style={{ objectFit: "contain" }}
          alt=""
        />
      </div>
    ),
    { ...size }
  );
}
