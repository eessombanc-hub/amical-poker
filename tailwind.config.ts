import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: "#0ade7c",
        "forest-2": "#00b368",
        "forest-glow": "#39ffa0",
        paper: "#ffffff",
        "paper-dim": "#e9fdf3",
        brass: "#f0b429",
        "brass-light": "#ffd666",
        burgundy: "#e8a92d",
        ink: "#0b1f16",
        sage: "#5c7a6e",
        crimson: "#ff1f3d",
        "crimson-dark": "#7a0012",
        noir: "#050505",
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        royal: ["Cinzel", "serif"],
      },
      keyframes: {
        "logo-spin": {
          "0%, 100%": { transform: "rotate(-6deg) scale(1)" },
          "50%": { transform: "rotate(6deg) scale(1.06)" },
        },
        "logo-spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "logo-glow": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(16,185,129,0.0)" },
          "50%": { boxShadow: "0 0 22px rgba(16,185,129,0.55)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "coin-turn": {
          from: { transform: "rotateY(0deg)" },
          to: { transform: "rotateY(360deg)" },
        },
        "coin-halo": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(10,222,124,0.45)" },
          "50%": { boxShadow: "0 0 0 8px rgba(10,222,124,0)" },
        },
        "badge-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.12)", opacity: "0.85" },
        },
        "gradient-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "gold-sweep": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "royal-shine": {
          "0%": { backgroundPosition: "-150% 0" },
          "100%": { backgroundPosition: "250% 0" },
        },
        "mascot-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "mascot-wing-left": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(-32deg)" },
          "30%": { transform: "rotate(-4deg)" },
          "45%": { transform: "rotate(-24deg)" },
          "62%": { transform: "rotate(0deg)" },
        },
        "mascot-wing-right": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(32deg)" },
          "30%": { transform: "rotate(4deg)" },
          "45%": { transform: "rotate(24deg)" },
          "62%": { transform: "rotate(0deg)" },
        },
        "mascot-blink": {
          "0%, 88%, 100%": { transform: "scaleY(1)" },
          "94%": { transform: "scaleY(0.08)" },
        },
        "mascot-look": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-1.1px)" },
          "50%": { transform: "translateX(0)" },
          "75%": { transform: "translateX(1.1px)" },
        },
        "mascot-sparkle": {
          "0%, 100%": { opacity: "0", transform: "scale(0.4)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "logo-spin": "logo-spin 5s ease-in-out infinite",
        "logo-spin-slow": "logo-spin-slow 8s linear infinite",
        // Rotation très lente (même keyframe que logo-spin-slow) pour le
        // logo géant en filigrane animé de l'Espace membre — presque
        // imperceptible à l'œil, juste assez pour donner vie au fond.
        "logo-spin-ambient": "logo-spin-slow 90s linear infinite",
        "logo-glow": "logo-glow 3.2s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "coin-turn": "coin-turn 5.5s linear infinite",
        "coin-halo": "coin-halo 4s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        "badge-pulse": "badge-pulse 1.8s ease-in-out infinite",
        "gradient-pan": "gradient-pan 8s ease-in-out infinite",
        "gold-sweep": "gold-sweep 3.5s linear infinite",
        "royal-shine": "royal-shine 4.5s ease-in-out infinite",
        "mascot-float": "mascot-float 3.2s ease-in-out infinite",
        "mascot-wing-left": "mascot-wing-left 1.8s ease-in-out infinite",
        "mascot-wing-right": "mascot-wing-right 1.8s ease-in-out infinite",
        "mascot-blink": "mascot-blink 4.5s ease-in-out infinite",
        "mascot-look": "mascot-look 6s ease-in-out infinite",
        "mascot-sparkle": "mascot-sparkle 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
