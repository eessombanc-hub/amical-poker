/**
 * Détection et rendu des liens vidéo de la Galerie (voir prisma/schema.prisma,
 * model Video) — le site n'a aucune infrastructure d'hébergement/encodage
 * vidéo : une vidéo est donc soit un lien YouTube/Vimeo (affiché en iframe
 * embed), soit un fichier vidéo direct (.mp4, .webm…, affiché via <video>).
 */

export type VideoEmbed =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "direct" };

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/i,
];
const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/i;

/** Analyse un lien vidéo et indique comment le rendre côté page. */
export function detectVideoEmbed(url: string): VideoEmbed {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${match[1]}` };
    }
  }
  const vimeoMatch = url.match(VIMEO_PATTERN);
  if (vimeoMatch) {
    return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { kind: "direct" };
}

/** Valide grossièrement qu'un lien vidéo est exploitable (YouTube, Vimeo ou fichier vidéo direct). */
export function isPlausibleVideoUrl(url: string): boolean {
  if (!/^https:\/\//i.test(url)) return false;
  const embed = detectVideoEmbed(url);
  if (embed.kind !== "direct") return true;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}
