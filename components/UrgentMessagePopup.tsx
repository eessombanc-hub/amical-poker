"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UrgentNotification = { id: string; message: string; createdAt: string };

const POLL_INTERVAL_MS = 15_000;

// Popup affiché sur TOUTE page du site (voir components/UrgentMessageGate.tsx,
// monté depuis app/layout.tsx) tant qu'un message urgent envoyé par le
// bureau (voir /admin/message-urgent) n'a pas été acquitté. S'appuie sur le
// modèle Notification existant (type="URGENT").
//
// Deux façons de recevoir un message :
// 1. Au chargement de la page (SSR, prop `notifications`) — couvre l'arrivée
//    ou le retour sur le site.
// 2. Par sondage régulier de l'API pendant que le membre reste sur la même
//    page (voir POLL_INTERVAL_MS) — pour qu'un message envoyé PENDANT qu'il
//    est déjà connecté s'affiche quasi instantanément, sans qu'il ait besoin
//    de changer de page ou de recharger.
//
// Important : on ne retire un message de la file qu'une fois sa mise à jour
// "lu" confirmée par le serveur (res.ok) — sinon, en cas d'échec réseau ou de
// session expirée, le message resterait "non lu" en base et réapparaîtrait
// en boucle à la prochaine connexion alors que le membre l'a déjà fermé.
export default function UrgentMessagePopup({
  notifications,
}: {
  notifications: UrgentNotification[];
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(notifications);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef(new Set(notifications.map((n) => n.id)));

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/member/notifications/urgent", { cache: "no-store" });
        if (!res.ok) return;
        const data: UrgentNotification[] = await res.json();
        const fresh = data.filter((n) => !seenIds.current.has(n.id));
        if (fresh.length === 0) return;
        fresh.forEach((n) => seenIds.current.add(n.id));
        setQueue((q) => [...q, ...fresh]);
      } catch {
        // Silencieux : on retentera au prochain sondage.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  if (queue.length === 0) return null;
  const current = queue[0];

  async function acknowledge() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/notifications/${current.id}/read`, { method: "POST" });
      if (!res.ok) {
        setError("Impossible d'enregistrer votre lecture, merci de réessayer.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Connexion impossible, merci de réessayer.");
      setBusy(false);
      return;
    }
    setBusy(false);
    // Important : router.refresh() ne doit jamais être appelé depuis
    // l'intérieur d'une fonction de mise à jour d'état (setQueue) — ça
    // provoquait justement l'exception côté client juste après le clic sur
    // « J'ai compris ». On calcule donc la fin de file à part, et on
    // rafraîchit après coup, en effet de bord normal.
    const isLastMessage = queue.length <= 1;
    setQueue((q) => q.slice(1));
    if (isLastMessage) {
      router.refresh();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Message urgent du bureau"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
    >
      <div className="animate-modal-in relative max-w-sm w-full bg-white rounded-2xl p-8 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)]">
        <div className="text-4xl mb-3 text-center">⚠️</div>
        <div className="text-[0.68rem] tracking-widest uppercase text-burgundy font-semibold mb-3 text-center">
          Message urgent du bureau
        </div>
        <p className="text-ink text-sm whitespace-pre-line mb-6">{current.message}</p>
        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-sage">
            {new Date(current.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={acknowledge}
            disabled={busy}
            className="btn-glow bg-forest text-white px-6 py-2.5 rounded text-sm font-medium disabled:opacity-60"
          >
            {busy ? "…" : "J'ai compris"}
          </button>
        </div>
        {queue.length > 1 && (
          <p className="text-[0.65rem] text-sage/70 mt-4 text-center">
            {queue.length - 1} autre{queue.length - 1 > 1 ? "s" : ""} message{queue.length - 1 > 1 ? "s" : ""} urgent{queue.length - 1 > 1 ? "s" : ""} en attente.
          </p>
        )}
      </div>
    </div>
  );
}
