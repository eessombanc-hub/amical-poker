const FACEBOOK_URL = "https://www.facebook.com/apc.villecresnes";
const INSTAGRAM_URL = "https://www.instagram.com/amicalpokerclub/";

/**
 * Icônes réseaux sociaux du club — sobres et monochromes pour s'intégrer à
 * n'importe quel fond (footer sombre comme header clair) via `currentColor`.
 */
export default function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="L'Amical Poker Club sur Facebook"
        className="opacity-80 hover:opacity-100 transition-opacity"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
        </svg>
      </a>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="L'Amical Poker Club sur Instagram"
        className="opacity-80 hover:opacity-100 transition-opacity"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </a>
    </div>
  );
}
