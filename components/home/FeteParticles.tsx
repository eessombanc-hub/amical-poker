"use client";

import { useEffect, useRef } from "react";
import type { ParticleRecipe } from "@/lib/fetes/themes";

/**
 * Animation d'arrière-plan de la fête du jour — un seul moteur à particules
 * (canvas 2D), piloté par une "recette" (voir lib/fetes/themes.ts) plutôt
 * qu'un composant par fête : plus simple à maintenir, et garantit la même
 * qualité d'exécution (perf, accessibilité) pour toutes les ambiances.
 *
 * Respecte scrupuleusement :
 * - prefers-reduced-motion (aucune animation lancée, juste le dégradé fixe) ;
 * - la mise en veille de l'onglet (document.visibilityState) ;
 * - un budget de particules réduit sur petit écran ;
 * - le nettoyage complet (rAF annulée, listeners retirés) au démontage.
 *
 * Toujours aria-hidden et pointer-events-none : purement décoratif, ne gêne
 * jamais la lecture ni l'interaction avec le contenu du hero.
 */
export default function FeteParticles({ recipe }: { recipe: ParticleRecipe }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (recipe.kind === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotionQuery.matches) return; // pas d'animation — le dégradé CSS suffit

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let running = true;
    let startTime = performance.now();

    const isMobile = () => window.innerWidth < 640;
    const densityFor = () => Math.max(6, Math.round(recipe.density * (isMobile() ? 0.5 : 1)));

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function onVisibility() {
      running = document.visibilityState === "visible";
      if (running) {
        startTime = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      phase: number;
      life: number; // 1 -> 0
      decay: number;
    };

    const colors = recipe.colors.length > 0 ? recipe.colors : ["#ffffff"];

    function spawnDrifting(kind: "snow" | "leaves" | "petals" | "stars" | "sunrays"): P {
      const size =
        kind === "snow" ? rand(2, 5) : kind === "stars" ? rand(1.5, 3) : kind === "sunrays" ? rand(2, 4) : rand(6, 11);
      return {
        x: rand(0, width),
        y: kind === "stars" || kind === "sunrays" ? rand(0, height) : rand(-height * 0.2, 0),
        vx: kind === "leaves" ? rand(-14, -4) : rand(-6, 6),
        vy: kind === "stars" ? 0 : kind === "sunrays" ? rand(-8, -3) : rand(14, kind === "snow" ? 34 : 26),
        size,
        color: pick(colors),
        rotation: rand(0, Math.PI * 2),
        rotationSpeed: kind === "leaves" || kind === "petals" ? rand(-1.2, 1.2) : 0,
        phase: rand(0, Math.PI * 2),
        life: 1,
        decay: kind === "stars" ? rand(0.05, 0.12) : 0,
      };
    }

    function spawnHeart(): P {
      return {
        x: rand(0, width),
        y: height + rand(0, 40),
        vx: rand(-6, 6),
        vy: rand(-28, -14),
        size: rand(9, 17),
        color: pick(colors),
        rotation: 0,
        rotationSpeed: 0,
        phase: rand(0, Math.PI * 2),
        life: 1,
        decay: rand(0.06, 0.12),
      };
    }

    // ── Particules "dérivantes" (neige, feuilles, pétales, étoiles, rayons) ──
    const driftKind =
      recipe.kind === "snow"
        ? "snow"
        : recipe.kind === "leaves"
        ? "leaves"
        : recipe.kind === "petals"
        ? "petals"
        : recipe.kind === "stars"
        ? "stars"
        : recipe.kind === "sunrays"
        ? "sunrays"
        : null;

    const particles: P[] = [];
    if (driftKind) {
      for (let i = 0; i < densityFor(); i++) particles.push(spawnDrifting(driftKind));
    }
    if (recipe.kind === "hearts") {
      for (let i = 0; i < densityFor(); i++) particles.push(spawnHeart());
    }

    // ── Feux d'artifice (Nouvel An, Fête nationale) ──────────────────────
    type Rocket = { x: number; y: number; targetY: number; vy: number; color: string };
    const rockets: Rocket[] = [];
    const bursts: P[] = [];
    let nextLaunchAt = 0;

    function maybeLaunchRocket(t: number) {
      if (recipe.kind !== "fireworks") return;
      if (t < nextLaunchAt) return;
      const maxConcurrent = Math.max(1, Math.round(densityFor() / 14));
      if (rockets.length < maxConcurrent) {
        rockets.push({
          x: rand(width * 0.12, width * 0.88),
          y: height,
          targetY: rand(height * 0.18, height * 0.45),
          vy: rand(-7, -5),
          color: pick(colors),
        });
      }
      nextLaunchAt = t + rand(700, 1500);
    }

    function burst(x: number, y: number, color: string) {
      const n = Math.max(10, Math.round(densityFor() * 0.6));
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + rand(-0.15, 0.15);
        const speed = rand(1.2, 4.2);
        bursts.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: rand(1.5, 3),
          color,
          rotation: 0,
          rotationSpeed: 0,
          phase: 0,
          life: 1,
          decay: rand(0.012, 0.022),
        });
      }
    }

    // ── Chauve-souris + brume (Halloween) ────────────────────────────────
    type Bat = { x: number; y: number; vx: number; phase: number; size: number };
    const bats: Bat[] = [];
    if (recipe.kind === "bats-fog") {
      const n = Math.max(3, Math.round(densityFor() / 4));
      for (let i = 0; i < n; i++) {
        bats.push({
          x: rand(0, width),
          y: rand(height * 0.08, height * 0.5),
          vx: rand(18, 34) * (Math.random() < 0.5 ? -1 : 1),
          phase: rand(0, Math.PI * 2),
          size: rand(10, 18),
        });
      }
    }

    function drawDrifting(p: P, kind: typeof driftKind) {
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      if (kind === "stars") {
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(p.phase));
        ctx!.globalAlpha = twinkle;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx!.fill();
      } else if (kind === "sunrays") {
        ctx!.globalAlpha = 0.5 + 0.3 * Math.sin(p.phase);
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx!.fill();
      } else if (kind === "petals" || kind === "leaves") {
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        // snow
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    function drawHeart(p: P) {
      const s = p.size;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.globalAlpha = p.life;
      ctx!.fillStyle = p.color;
      ctx!.beginPath();
      ctx!.moveTo(0, s * 0.3);
      ctx!.bezierCurveTo(-s, -s * 0.6, -s * 1.6, s * 0.5, 0, s * 1.3);
      ctx!.bezierCurveTo(s * 1.6, s * 0.5, s, -s * 0.6, 0, s * 0.3);
      ctx!.fill();
      ctx!.restore();
    }

    function drawBat(b: Bat, t: number) {
      const flap = Math.sin(t * 6 + b.phase) * 0.5;
      ctx!.save();
      ctx!.translate(b.x, b.y);
      ctx!.globalAlpha = 0.55;
      ctx!.fillStyle = "#0a0505";
      ctx!.beginPath();
      ctx!.moveTo(0, 0);
      ctx!.quadraticCurveTo(-b.size, -b.size * (0.6 + flap), -b.size * 1.6, 0);
      ctx!.quadraticCurveTo(-b.size * 0.5, b.size * 0.15, 0, 0);
      ctx!.quadraticCurveTo(b.size * 0.5, b.size * 0.15, b.size * 1.6, 0);
      ctx!.quadraticCurveTo(b.size, -b.size * (0.6 + flap), 0, 0);
      ctx!.fill();
      ctx!.restore();
    }

    function drawFog(t: number) {
      const bandCount = 3;
      for (let i = 0; i < bandCount; i++) {
        const y = height * (0.55 + i * 0.12);
        const drift = ((t * 12 + i * 220) % (width + 300)) - 300;
        const grad = ctx!.createLinearGradient(drift, y, drift + 600, y);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, "rgba(230,220,255,0.10)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, y - 40, width, 80);
      }
    }

    function loop(now: number) {
      if (!running) return;
      const t = (now - startTime) / 1000;
      ctx!.clearRect(0, 0, width, height);

      if (recipe.kind === "bats-fog") {
        drawFog(t);
        for (const b of bats) {
          b.x += b.vx * (1 / 60);
          if (b.x < -40) b.x = width + 40;
          if (b.x > width + 40) b.x = -40;
          b.y += Math.sin(t * 2 + b.phase) * 0.15;
          drawBat(b, t);
        }
      }

      if (driftKind) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += (p.vx + (driftKind === "snow" || driftKind === "petals" ? Math.sin(t + p.phase) * 8 : 0)) * (1 / 60);
          p.y += p.vy * (1 / 60);
          p.rotation += p.rotationSpeed * (1 / 60);
          p.phase += 1 / 60;
          if (driftKind === "stars") {
            p.life -= p.decay * (1 / 60);
            if (p.life <= 0) particles[i] = spawnDrifting("stars");
          } else if (driftKind === "sunrays") {
            if (p.y < -20) particles[i] = spawnDrifting("sunrays");
          } else if (p.y > height + 20 || p.x < -40 || p.x > width + 40) {
            particles[i] = spawnDrifting(driftKind);
          }
          drawDrifting(particles[i], driftKind);
        }
      }

      if (recipe.kind === "hearts") {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += (p.vx + Math.sin(t * 1.4 + p.phase) * 10) * (1 / 60);
          p.y += p.vy * (1 / 60);
          p.life -= p.decay * (1 / 60) * 0;
          if (p.y < -30) particles[i] = spawnHeart();
          drawHeart(particles[i]);
        }
      }

      if (recipe.kind === "fireworks") {
        maybeLaunchRocket(now);
        for (let i = rockets.length - 1; i >= 0; i--) {
          const r = rockets[i];
          r.y += r.vy;
          ctx!.save();
          ctx!.globalAlpha = 0.9;
          ctx!.fillStyle = r.color;
          ctx!.beginPath();
          ctx!.arc(r.x, r.y, 2, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
          if (r.y <= r.targetY) {
            burst(r.x, r.y, r.color);
            rockets.splice(i, 1);
          }
        }
        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i];
          b.x += b.vx;
          b.y += b.vy;
          b.vy += 0.045; // gravité légère
          b.life -= b.decay;
          if (b.life <= 0) {
            bursts.splice(i, 1);
            continue;
          }
          ctx!.save();
          ctx!.globalAlpha = Math.max(0, b.life);
          ctx!.fillStyle = b.color;
          ctx!.beginPath();
          ctx!.arc(b.x, b.y, b.size, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // recipe.kind pilote tout le setup ci-dessus : on reconstruit entièrement
    // l'animation si la fête change (ex. bascule automatique à minuit, voir
    // components/home/FeteDayRollover.tsx), jamais en continu sinon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.kind, recipe.density, recipe.colors.join(",")]);

  if (recipe.kind === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 1 }}
    />
  );
}
