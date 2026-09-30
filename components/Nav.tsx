import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Logo from "./Logo";
import Avatar from "./Avatar";
import SocialLinks from "./SocialLinks";
import MobileNav from "./MobileNav";

// Intitulés des onglets — révisés dans un ton plus soigné, à l'image d'une
// société savante du XVIIIe siècle, tout en gardant les mots-clés utiles
// au référencement (poker, actualités, boutique...).
const links = [
  { href: "/association", label: "L'Association" },
  { href: "/poker-news", label: "Gazette Poker" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/classement", label: "Classement" },
  { href: "/strategie", label: "Stratégie" },
  { href: "/actualites", label: "Actualités" },
  { href: "/vie-du-club", label: "Vie du Club" },
  { href: "/forum", label: "Forum" },
  { href: "/galerie", label: "Galerie" },
  { href: "/partenaires", label: "Nos Partenaires" },
  { href: "/boutique", label: "La Boutique" },
  { href: "/contact", label: "Nous Écrire" },
];

async function getConnectedMember() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return null;

  // Pastille d'alerte à côté du pseudo : uniquement pour le bureau, les
  // responsables et l'admin, seuls habilités à traiter les demandes
  // d'adhésion (voir /admin/demandes-adhesion) — un membre simple ne compte
  // jamais ces demandes, même si un jour on les affichait ailleurs pour lui.
  const role = (session?.user as any)?.role as string | undefined;
  const pendingRequests = hasRole(role, "RESPONSABLE")
    ? await prisma.membershipRequest.count({ where: { status: "EN_ATTENTE" } })
    : 0;

  const member = await prisma.member.findUnique({ where: { userId } });
  if (member) {
    return {
      displayName: member.nickname || `${member.firstName} ${member.lastName}`,
      photoUrl: member.photoUrl as string | null,
      pendingRequests,
    };
  }

  // Compte sans fiche membre (accès invité) : toujours connecté, mais pas de
  // photo/pseudo — on affiche simplement le nom renseigné, ou l'e-mail.
  return {
    displayName: (session?.user as any)?.name || session?.user?.email || "Invité",
    photoUrl: null as string | null,
    pendingRequests,
  };
}

export default async function Nav() {
  const member = await getConnectedMember();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-forest/25 shadow-sm relative">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-7 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-ink flex-shrink-0 whitespace-nowrap">
          <Logo size={32} animated halo />
          <div>
            <div className="font-royal text-lg leading-tight tracking-wide">Amical Poker Club</div>
            <div className="font-journal text-[0.68rem] tracking-[2.5px] text-sage uppercase">APCV</div>
          </div>
        </Link>
        <div className="hidden lg:flex flex-wrap justify-end">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-lumieres group relative text-forest-2 hover:text-[#8a6412] text-[0.88rem] whitespace-nowrap px-2 py-2 rounded transition-colors"
            >
              {l.label}
              <span className="pointer-events-none absolute left-2 right-2 -bottom-0.5 h-[2px] scale-x-0 origin-left rounded-full bg-gradient-to-r from-forest to-brass transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
        <SocialLinks className="hidden lg:flex text-sage mr-4 pl-4 border-l border-ink/10" />
        <div className="flex items-center gap-3">
          {member ? (
            <Link
              href={member.pendingRequests ? "/admin/demandes-adhesion" : "/espace-membre"}
              className="group flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border border-forest/20 hover:border-forest/40 hover:bg-forest/5 transition-colors"
            >
              <Avatar photoUrl={member.photoUrl} name={member.displayName} size={30} />
              <span className="text-[0.78rem] font-medium text-ink group-hover:text-forest-2 max-w-[9rem] truncate">
                {member.displayName}
              </span>
              {member.pendingRequests > 0 && (
                <span
                  className="relative flex h-2 w-2 flex-shrink-0"
                  title={`${member.pendingRequests} demande${member.pendingRequests > 1 ? "s" : ""} d'adhésion en attente`}
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-burgundy opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-burgundy" />
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/espace-membre"
              className="btn-glow bg-forest text-white text-[0.78rem] font-medium tracking-wide px-4 py-2 rounded"
            >
              Espace membre
            </Link>
          )}
          <MobileNav links={links} />
        </div>
      </div>
      <div className="h-[2px] bg-gradient-to-r from-forest via-crimson via-noir to-brass bg-[length:200%_200%] animate-gradient-pan" />
    </nav>
  );
}
