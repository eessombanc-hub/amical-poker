/**
 * Styles graphiques, messages et animations associés à chaque fête — voir
 * lib/fetes/calendar.ts pour la détermination de la fête du jour (séparée
 * volontairement de ce fichier, voir le commentaire en tête de ce dernier).
 *
 * Chaque thème reprend la même structure que le hero existant (dégradé
 * diagonal sombre + deux halos lumineux flous, voir app/page.tsx) pour
 * garder la cohérence graphique du site — seules les teintes, le message et
 * l'animation d'arrière-plan changent d'une fête à l'autre.
 */
import type { FeteKey, ResolvedFete } from "./calendar";

export type ParticleKind =
  | "fireworks"
  | "hearts"
  | "petals"
  | "snow"
  | "leaves"
  | "sunrays"
  | "stars"
  | "bats-fog"
  | "none";

export type ParticleRecipe = {
  kind: ParticleKind;
  /** Couleurs CSS (hex/rgba) utilisées par le moteur de particules — voir
   * components/home/FeteParticles.tsx. */
  colors: string[];
  /** Nombre de particules visées en plein écran desktop — réduit
   * automatiquement sur mobile et si l'utilisateur a demandé moins
   * d'animations (voir FeteParticles, prefers-reduced-motion). */
  density: number;
};

export type FeteTheme = {
  key: FeteKey;
  /** Nom affiché de la fête (ex. "Saint-Valentin"). */
  label: string;
  /** Message principal mettant en valeur l'événement (voir cahier des
   * charges, section 4). */
  heroMessage: string;
  /** Courte phrase d'ambiance, affichée en complément du message principal. */
  ambiance: string;
  /** Emoji décoratif optionnel, affiché à côté du nom de la fête. */
  emoji?: string;
  backgroundGradient: string;
  glowPrimary: string;
  glowSecondary: string;
  particles: ParticleRecipe;
};

const THEMES: Record<FeteKey, Omit<FeteTheme, "key">> = {
  NOUVEL_AN: {
    label: "Nouvel An",
    heroMessage: "Bonne année ! Que cette nouvelle année vous apporte de belles mains et de grandes victoires.",
    ambiance: "Feux d'artifice et nouveaux départs.",
    emoji: "🎉",
    backgroundGradient:
      "linear-gradient(155deg,#05070f 0%,#0a1230 25%,#030303 50%,#2a1a00 75%,#f0b429 100%)",
    glowPrimary: "radial-gradient(circle, rgba(240,180,41,0.5) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(10,222,124,0.35) 0%, transparent 70%)",
    particles: { kind: "fireworks", colors: ["#ffd666", "#0ade7c", "#ff1f3d", "#ffffff"], density: 46 },
  },
  SAINT_VALENTIN: {
    label: "Saint-Valentin",
    heroMessage: "Joyeuse Saint-Valentin ! Une soirée placée sous le signe de l'amour du jeu... et du cœur.",
    ambiance: "Douceur et cœurs flottants.",
    emoji: "💕",
    backgroundGradient:
      "linear-gradient(155deg,#140408 0%,#3d0620 25%,#050505 50%,#2a0008 75%,#ff4d6d 100%)",
    glowPrimary: "radial-gradient(circle, rgba(255,77,109,0.5) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(240,180,41,0.3) 0%, transparent 70%)",
    particles: { kind: "hearts", colors: ["#ff4d6d", "#ffb3c1", "#ffffff"], density: 32 },
  },
  PAQUES: {
    label: "Pâques",
    heroMessage: "Joyeuses Pâques ! Une belle journée de printemps pour se retrouver autour du tapis vert.",
    ambiance: "Fleurs et couleurs de printemps.",
    emoji: "🐣",
    backgroundGradient:
      "linear-gradient(155deg,#04140c 0%,#0d3d1f 25%,#050505 50%,#3d2a00 75%,#f0b429 100%)",
    glowPrimary: "radial-gradient(circle, rgba(255,214,102,0.45) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(10,222,124,0.35) 0%, transparent 70%)",
    particles: { kind: "petals", colors: ["#ffd666", "#ffb3c1", "#aef5c9", "#ffffff"], density: 34 },
  },
  FETE_DES_MERES: {
    label: "Fête des Mères",
    heroMessage: "Bonne fête à toutes les mamans du club !",
    ambiance: "Fleurs et lumière douce.",
    emoji: "🌸",
    backgroundGradient:
      "linear-gradient(155deg,#140810 0%,#3d1230 25%,#050505 50%,#2a0a1a 75%,#ff8fab 100%)",
    glowPrimary: "radial-gradient(circle, rgba(255,143,171,0.45) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(240,180,41,0.3) 0%, transparent 70%)",
    particles: { kind: "petals", colors: ["#ff8fab", "#ffd6e0", "#ffffff"], density: 24 },
  },
  FETE_DES_PERES: {
    label: "Fête des Pères",
    heroMessage: "Bonne fête à tous les papas du club !",
    ambiance: "Lumière chaleureuse.",
    emoji: "🎩",
    backgroundGradient:
      "linear-gradient(155deg,#04140c 0%,#0a2a3d 25%,#050505 50%,#1a1400 75%,#f0b429 100%)",
    glowPrimary: "radial-gradient(circle, rgba(94,170,222,0.4) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(240,180,41,0.35) 0%, transparent 70%)",
    particles: { kind: "petals", colors: ["#f0b429", "#8fc7ff", "#ffffff"], density: 20 },
  },
  FETE_NATIONALE: {
    label: "Fête nationale",
    heroMessage: "Joyeux 14 juillet ! Célébrons ensemble notre fête nationale.",
    ambiance: "Feu d'artifice bleu, blanc, rouge.",
    emoji: "🎆",
    backgroundGradient:
      "linear-gradient(155deg,#04070f 0%,#0a2050 25%,#050505 50%,#2a0008 75%,#ff1f3d 100%)",
    glowPrimary: "radial-gradient(circle, rgba(94,170,222,0.45) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(255,31,61,0.4) 0%, transparent 70%)",
    particles: { kind: "fireworks", colors: ["#3b82f6", "#ffffff", "#ff1f3d"], density: 42 },
  },
  HALLOWEEN: {
    label: "Halloween",
    heroMessage: "Halloween est arrivé… Entrez dans une ambiance mystérieuse pour une soirée de poker pas comme les autres.",
    ambiance: "Brume et mystère.",
    emoji: "🎃",
    backgroundGradient:
      "linear-gradient(155deg,#0a0503 0%,#2e1400 25%,#050505 50%,#1a0025 75%,#ff7a1a 100%)",
    glowPrimary: "radial-gradient(circle, rgba(255,122,26,0.45) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(123,31,162,0.4) 0%, transparent 70%)",
    particles: { kind: "bats-fog", colors: ["#ff7a1a", "#b388ff", "#ffffff"], density: 18 },
  },
  TOUSSAINT: {
    label: "Toussaint",
    heroMessage: "En cette journée de Toussaint, une pensée pour nos proches, avant de se retrouver autour du jeu.",
    ambiance: "Calme et recueillement.",
    emoji: "🕯️",
    backgroundGradient:
      "linear-gradient(155deg,#05070a 0%,#131a20 25%,#050505 50%,#141414 75%,#5c7a6e 100%)",
    glowPrimary: "radial-gradient(circle, rgba(200,210,205,0.25) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(92,122,110,0.25) 0%, transparent 70%)",
    particles: { kind: "stars", colors: ["#cfd8d4", "#ffffff"], density: 16 },
  },
  NOEL: {
    label: "Noël",
    heroMessage: "Aujourd'hui, célébrons la magie de Noël. Joyeuses fêtes à tous les membres du club !",
    ambiance: "Neige et lumières festives.",
    emoji: "🎄",
    backgroundGradient:
      "linear-gradient(155deg,#04140c 0%,#063d27 25%,#050505 50%,#2a0008 75%,#ff1f3d 100%)",
    glowPrimary: "radial-gradient(circle, rgba(10,222,124,0.45) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(240,180,41,0.4) 0%, transparent 70%)",
    particles: { kind: "snow", colors: ["#ffffff", "#f0b429"], density: 40 },
  },
  PRINTEMPS: {
    label: "Printemps",
    heroMessage: "Le printemps est là — une belle saison pour reprendre le chemin des tournois.",
    ambiance: "Pétales et rayons de soleil.",
    emoji: "🌱",
    backgroundGradient:
      "linear-gradient(155deg,#04140c 0%,#0d3d1f 25%,#050505 50%,#1a2a00 75%,#aef5c9 100%)",
    glowPrimary: "radial-gradient(circle, rgba(10,222,124,0.45) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(255,179,193,0.3) 0%, transparent 70%)",
    particles: { kind: "petals", colors: ["#aef5c9", "#ffb3c1", "#ffffff"], density: 26 },
  },
  ETE: {
    label: "Été",
    heroMessage: "Place à l'été — des soirées douces pour des tables encore plus animées.",
    ambiance: "Rayons de soleil et lumière estivale.",
    emoji: "☀️",
    backgroundGradient:
      "linear-gradient(155deg,#04140c 0%,#063d27 25%,#050505 50%,#2a1a00 75%,#ffd666 100%)",
    glowPrimary: "radial-gradient(circle, rgba(255,214,102,0.5) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(10,222,124,0.35) 0%, transparent 70%)",
    particles: { kind: "sunrays", colors: ["#ffd666", "#ffffff"], density: 22 },
  },
  AUTOMNE: {
    label: "Automne",
    heroMessage: "L'automne s'installe — l'occasion idéale de retrouver la table pour les manches de la saison.",
    ambiance: "Feuilles et couleurs chaudes.",
    emoji: "🍂",
    backgroundGradient:
      "linear-gradient(155deg,#140a04 0%,#3d2306 25%,#050505 50%,#2a0008 75%,#e8a92d 100%)",
    glowPrimary: "radial-gradient(circle, rgba(232,169,45,0.45) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(255,31,61,0.3) 0%, transparent 70%)",
    particles: { kind: "leaves", colors: ["#e8a92d", "#ff7a1a", "#7a0012"], density: 28 },
  },
  HIVER: {
    label: "Hiver",
    heroMessage: "L'hiver est là — une bonne raison de se retrouver au chaud autour du tapis vert.",
    ambiance: "Neige douce et nuits étoilées.",
    emoji: "❄️",
    backgroundGradient:
      "linear-gradient(155deg,#040a14 0%,#06273d 25%,#050505 50%,#0a0025 75%,#8fc7ff 100%)",
    glowPrimary: "radial-gradient(circle, rgba(143,199,255,0.4) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(10,222,124,0.25) 0%, transparent 70%)",
    particles: { kind: "snow", colors: ["#ffffff", "#8fc7ff"], density: 30 },
  },
};

/** Thème complet pour une fête déjà résolue (voir resolveFeteForDate). */
export function getFeteTheme(fete: ResolvedFete): FeteTheme {
  return { key: fete.key, ...THEMES[fete.key] };
}
