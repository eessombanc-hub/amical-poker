import Link from "next/link";
import Logo from "./Logo";
import SocialLinks from "./SocialLinks";
import NewsletterSignup from "./NewsletterSignup";

export default function Footer() {
  return (
    <footer className="relative bg-forest text-white/70 px-7 py-12 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-forest-glow via-crimson via-noir to-brass bg-[length:200%_200%] animate-gradient-pan" />
      <div className="max-w-6xl mx-auto flex flex-wrap justify-between gap-10 text-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <Logo size={32} animated={false} />
            <div className="font-royal text-lg text-white tracking-wide">Amical Poker Club</div>
          </div>
          <p className="text-xs max-w-[220px] mb-4">Association loi 1901 · Villecresnes</p>
          <SocialLinks className="text-white" />
          <div className="mt-7 pt-6 border-t border-white/10 max-w-xs">
            <NewsletterSignup source="footer" className="text-white/85" />
          </div>
        </div>
        <div className="flex gap-14 flex-wrap">
          <div>
            <h5 className="text-white text-xs tracking-widest uppercase mb-3">Le club</h5>
            <Link href="/association" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">L&apos;association</Link>
            <Link href="/calendrier" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Calendrier</Link>
            <Link href="/classement" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Classement</Link>
            <Link href="/resultats" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Résultats</Link>
            <Link href="/vie-du-club" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Vie du club</Link>
            <Link href="/evenements" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Événements</Link>
            <Link href="/partenaires" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Partenaires</Link>
            <Link href="/boutique" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Boutique</Link>
          </div>
          <div>
            <h5 className="text-white text-xs tracking-widest uppercase mb-3">Ressources</h5>
            <Link href="/strategie" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Stratégie &amp; pédagogie</Link>
            <Link href="/actualites" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Actualités</Link>
            <Link href="/poker-news" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Poker news</Link>
            <Link href="/galerie" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Galerie</Link>
          </div>
          <div>
            <h5 className="text-white text-xs tracking-widest uppercase mb-3">Légal</h5>
            <Link href="/mentions-legales" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Mentions légales</Link>
            <Link href="/confidentialite" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Confidentialité (RGPD)</Link>
            <Link href="/cookies" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Cookies</Link>
          </div>
          <div>
            <h5 className="text-white text-xs tracking-widest uppercase mb-3">Contact</h5>
            <Link href="/contact" className="block text-white/70 text-sm mb-2 hover:text-brass transition-colors">Nous écrire</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
