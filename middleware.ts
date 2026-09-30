import { withAuth } from "next-auth/middleware";

// Toute route sous /espace-membre ou /admin exige une session valide.
// (Le contrôle fin des rôles — RESPONSABLE / BUREAU / ADMIN — reste géré
// dans chaque page/route, cf. lib/auth.ts::hasRole.)
export default withAuth({
  pages: {
    signIn: "/connexion",
  },
});

export const config = {
  matcher: ["/espace-membre/:path*", "/admin/:path*"],
};
