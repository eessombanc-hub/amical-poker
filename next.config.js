/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // En-têtes de sécurité appliqués à toutes les pages/routes.
  //
  // La politique CSP ci-dessous a été construite à partir d'un inventaire
  // précis des ressources externes réellement utilisées par le site (pas
  // une politique générique) :
  //  - script-src : le site lui-même, et le script d'audience Plausible
  //    (plausible.io) chargé dans app/layout.tsx. 'unsafe-inline' reste
  //    nécessaire pour le petit script d'initialisation de Plausible et le
  //    balisage JSON-LD (SEO), tous deux inline dans layout.tsx.
  //  - style-src : le site lui-même, et Google Fonts (fonts.googleapis.com),
  //    importée dans app/globals.css. 'unsafe-inline' reste nécessaire pour
  //    les styles injectés par Next.js/Tailwind au chargement.
  //  - font-src : Google Fonts (fonts.gstatic.com), qui héberge les fichiers
  //    de police proprement dits.
  //  - img-src : autorise n'importe quelle source https, car les vignettes
  //    d'articles de la Gazette Poker proviennent de sites tiers choisis au
  //    fil du temps depuis le panneau d'administration (pas une liste fixe).
  //  - connect-src : le site lui-même et Plausible (remontée des mesures
  //    d'audience).
  //  - frame-ancestors / base-uri / form-action : verrouillés sur le site
  //    lui-même, en complément de X-Frame-Options.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://plausible.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' https: data:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://plausible.io",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
