"use client";

import { useEffect, useMemo, useState } from "react";
import Logo from "./Logo";
import Avatar from "./Avatar";

export type Birthday = { name: string; photoUrl: string | null };

// Une clé par jour : le popup ne réapparaît pas si le membre l'a déjà fermé
// aujourd'hui, mais revient normalement le lendemain (ou pour un nouvel
// anniversaire). Stocké uniquement dans le navigateur, rien en base — même
// logique que l'ancienne version, on ne touche pas à ce fonctionnement.
function todayKey() {
  const d = new Date();
  return `apcv-birthday-popup-dismissed-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const FIREWORK_COLORS = ["#0ade7c", "#f0b429", "#ff1f3d", "#39ffa0", "#ffd666"];

type Particle = { key: string; dx: number; dy: number; color: string; delay: number };
type Burst = { key: number; left: number; top: number; duration: number; particles: Particle[] };

/**
 * Génère quelques salves de feu d'artifice en CSS pur (pas de canvas) :
 * chaque salve est un point d'éclatement placé aléatoirement dans la carte,
 * d'où partent des particules colorées vers un cercle de rayon variable
 * (voir --dx/--dy consommées par @keyframes firework-particle, globals.css).
 * Calculé une seule fois au montage (useMemo) pour ne pas relancer un tirage
 * aléatoire à chaque re-render.
 */
function useFireworkBursts(burstCount = 4, particlesPerBurst = 10): Burst[] {
  return useMemo(() => {
    return Array.from({ length: burstCount }, (_, burstIndex) => {
      const duration = 1.1 + Math.random() * 0.7; // désynchronise les salves au fil du temps
      const particles: Particle[] = Array.from({ length: particlesPerBurst }, (_, i) => {
        const angle = (360 / particlesPerBurst) * i + Math.random() * 14;
        const distance = 30 + Math.random() * 26;
        const rad = (angle * Math.PI) / 180;
        return {
          key: `${burstIndex}-${i}`,
          dx: Math.cos(rad) * distance,
          dy: Math.sin(rad) * distance,
          color: FIREWORK_COLORS[(burstIndex + i) % FIREWORK_COLORS.length],
          delay: burstIndex * 0.55 + Math.random() * 0.3,
        };
      });
      return {
        key: burstIndex,
        left: 14 + Math.random() * 72,
        top: 6 + Math.random() * 34,
        duration,
        particles,
      };
    });
  }, [burstCount, particlesPerBurst]);
}

export default function BirthdayPopup({ birthdays }: { birthdays: Birthday[] }) {
  const [visible, setVisible] = useState(false);
  const bursts = useFireworkBursts();

  useEffect(() => {
    if (birthdays.length === 0) return;
    try {
      if (localStorage.getItem(todayKey()) === "1") return;
    } catch {
      // Stockage indisponible (navigation privée...) : on affiche quand même.
    }
    setVisible(true);
  }, [birthdays]);

  function close() {
    setVisible(false);
    try {
      localStorage.setItem(todayKey(), "1");
    } catch {
      // Rien à faire si le stockage est indisponible.
    }
  }

  if (!visible || birthdays.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Joyeux anniversaire"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in relative max-w-sm w-full bg-white rounded-2xl p-8 pt-9 text-center shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Logo du club en fond, discret — même « système » que le popup de
           message urgent du bureau (voir UrgentMessagePopup.tsx), avec un
           habillage propre à l'anniversaire. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <Logo size={280} animated halo={false} />
        </div>

        {/* Feu d'artifice CSS, au-dessus du logo mais sous le contenu. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {bursts.map((burst) => (
            <div key={burst.key} className="absolute" style={{ left: `${burst.left}%`, top: `${burst.top}%` }}>
              {burst.particles.map((p) => (
                <span
                  key={p.key}
                  className="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full animate-firework-particle"
                  style={
                    {
                      backgroundColor: p.color,
                      boxShadow: `0 0 6px 1px ${p.color}`,
                      "--dx": `${p.dx}px`,
                      "--dy": `${p.dy}px`,
                      animationDuration: `${burst.duration}s`,
                      animationDelay: `${p.delay}s`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-sage hover:bg-paper-dim transition-colors"
        >
          ✕
        </button>

        <div className="relative">
          <div className="flex items-center justify-center gap-1.5 text-[0.68rem] tracking-widest uppercase font-semibold mb-5">
            <span className="animate-birthday-emoji-bounce" aria-hidden>
              🎉
            </span>
            <span className="text-royal-shine animate-royal-shine">Joyeux anniversaire</span>
            <span className="animate-birthday-emoji-bounce" style={{ animationDelay: "0.3s" }} aria-hidden>
              🎉
            </span>
          </div>

          {/* Avatar(s) du/des membre(s) fêté(s), mis en avant avec un halo doré pulsant. */}
          <div className="flex items-center justify-center -space-x-4 mb-5">
            {birthdays.slice(0, 3).map((b) => (
              <div key={b.name} className="relative">
                <div className="animate-birthday-avatar-glow rounded-full ring-4 ring-white">
                  <Avatar photoUrl={b.photoUrl} name={b.name} size={birthdays.length > 1 ? 68 : 88} />
                </div>
              </div>
            ))}
          </div>

          <h2 className="font-royal text-2xl text-ink mb-3 leading-snug">
            {birthdays.map((b, i) => (
              <span key={b.name}>
                {i > 0 && (i === birthdays.length - 1 ? " et " : ", ")}
                {b.name}
              </span>
            ))}
          </h2>
          <p className="text-sage text-sm">
            Toute l&apos;équipe du club vous souhaite une excellente journée 🎂
          </p>
          <button
            type="button"
            onClick={close}
            className="btn-glow mt-6 bg-forest text-white px-6 py-2.5 rounded text-sm font-medium"
          >
            Merci !
          </button>
        </div>
      </div>
    </div>
  );
}
