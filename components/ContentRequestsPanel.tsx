"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { detectVideoEmbed, isPlausibleVideoUrl } from "@/lib/media";

type RequestType = "ACTU_POKER" | "STRATEGIE" | "PHOTO_VIDEO";

type RequestRow = {
  id: string;
  type: RequestType;
  title: string;
  description: string;
  link: string | null;
  createdAt: string;
  member: { nickname: string; firstName: string; lastName: string };
};

type AlbumOption = { id: string; title: string; type: "PHOTO" | "VIDEO" };

const TYPE_LABEL: Record<RequestType, string> = {
  ACTU_POKER: "Actu poker",
  STRATEGIE: "Article stratégie",
  PHOTO_VIDEO: "Photo / vidéo",
};

const TYPE_STYLE: Record<RequestType, string> = {
  ACTU_POKER: "bg-burgundy/10 text-burgundy border-burgundy/30",
  STRATEGIE: "bg-forest/10 text-forest border-forest/30",
  PHOTO_VIDEO: "bg-brass/15 text-[#8a6412] border-brass/40",
};

// Vers l'écran d'admin où publier réellement le contenu, une fois la
// proposition jugée bonne — voir app/admin/demandes-contenu/page.tsx.
const ADMIN_LINK: Record<RequestType, { href: string; label: string }> = {
  ACTU_POKER: { href: "/admin/poker-news", label: "Publier dans la Gazette Poker →" },
  STRATEGIE: { href: "/admin/strategie", label: "Publier dans Stratégie →" },
  PHOTO_VIDEO: { href: "/admin/galerie", label: "Ajouter à la Galerie →" },
};

// Une image collée en lien direct (ex. depuis un hébergeur d'images) se
// reconnaît à son extension ; une photo importée depuis l'appareil est
// toujours une data URI (voir ContentRequestForm, fileToResizedDataUrl).
// Sert uniquement à choisir le mode d'aperçu ci-dessous — un lien Drive ou
// réseau social, par exemple, ne matche ni l'un ni l'autre et retombe sur le
// lien brut, faute de pouvoir en garantir le contenu sans le charger.
const IMAGE_LINK_PATTERN = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;

/**
 * Aperçu du contenu d'une proposition "Photo / vidéo", à valider par le
 * bureau sans avoir à ouvrir le lien dans un nouvel onglet — voir
 * lib/media.ts (même détection YouTube/Vimeo/fichier direct que la
 * Galerie). Si le lien ne peut être identifié avec certitude comme une
 * image ou une vidéo (ex. dossier Drive, page réseau social), on retombe
 * sur le lien cliquable.
 */
function ContentPreview({ link }: { link: string }) {
  const isImage = link.startsWith("data:image/") || IMAGE_LINK_PATTERN.test(link);
  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={link}
        alt="Aperçu de la photo proposée"
        className="max-h-64 max-w-full rounded-lg border border-ink/10 object-contain bg-paper-dim"
      />
    );
  }

  if (isPlausibleVideoUrl(link)) {
    const embed = detectVideoEmbed(link);
    if (embed.kind === "direct") {
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={link}
          controls
          preload="metadata"
          className="max-h-64 max-w-full rounded-lg border border-ink/10 bg-noir"
        />
      );
    }
    return (
      <iframe
        src={embed.embedUrl}
        className="w-full max-w-md aspect-video rounded-lg border border-ink/10"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Aperçu de la vidéo proposée"
      />
    );
  }

  return (
    <div>
      <p className="text-xs text-sage mb-1.5">
        Aperçu non disponible pour ce lien — ouvrez-le pour vérifier le contenu avant de valider :
      </p>
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-forest underline underline-offset-4 break-all"
      >
        {link}
      </a>
    </div>
  );
}

export default function ContentRequestsPanel({
  initialRequests,
  albums,
}: {
  initialRequests: RequestRow[];
  albums: AlbumOption[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Album + légende choisis pour chaque proposition Photo/vidéo, tant que
  // l'admin n'a pas encore cliqué sur « Publier » — voir le bloc dédié plus
  // bas, une valeur par défaut (premier album du bon type, titre de la
  // demande) est utilisée tant qu'aucune entrée n'existe ici.
  const [publishState, setPublishState] = useState<Record<string, { albumId: string; caption: string }>>({});

  async function handleAction(id: string, action: "traiter" | "refuser") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/content-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "L'action a échoué.");
      return;
    }
    setRequests((rs) => rs.filter((r) => r.id !== id));
    router.refresh();
  }

  /**
   * Publie en un clic une proposition Photo/vidéo : crée la Photo (ou la
   * Vidéo) dans l'album choisi ET archive la demande, en un seul appel côté
   * serveur (voir PATCH .../route.ts, action "publier") — plus besoin du
   * détour manuel par /admin/galerie qui faisait perdre des photos pourtant
   * déjà validées.
   */
  async function handlePublish(id: string, albumId: string, caption: string) {
    if (!albumId) return;
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/content-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publier", albumId, caption: caption.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "La publication a échoué.");
      return;
    }
    setRequests((rs) => rs.filter((r) => r.id !== id));
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <p className="text-sage text-sm">
        Aucune proposition de contenu en attente pour le moment.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="border border-ink/10 rounded-lg p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
              <span
                className={`text-[0.6rem] tracking-widest uppercase font-semibold border rounded-full px-2 py-0.5 ${TYPE_STYLE[r.type]}`}
              >
                {TYPE_LABEL[r.type]}
              </span>
              <div className="text-xs text-sage/70">
                Proposé par {r.member.firstName} «{" "}
                <span className="font-semibold text-ink/80">{r.member.nickname}</span> » le{" "}
                {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="font-medium mb-1">{r.title}</div>
            <p className="text-sm text-ink/80 whitespace-pre-line mb-2">{r.description}</p>
            {r.link && (
              r.type === "PHOTO_VIDEO" ? (
                <div className="mb-1">
                  <ContentPreview link={r.link} />
                </div>
              ) : (
                <a
                  href={r.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-forest underline underline-offset-4 break-all"
                >
                  {r.link}
                </a>
              )
            )}
            {r.type === "PHOTO_VIDEO" && r.link && (() => {
              const isVideo = isPlausibleVideoUrl(r.link!);
              const matchingAlbums = albums.filter((a) => a.type === (isVideo ? "VIDEO" : "PHOTO"));
              const state = publishState[r.id] ?? { albumId: matchingAlbums[0]?.id ?? "", caption: r.title };
              return matchingAlbums.length > 0 ? (
                <div className="flex flex-wrap items-end gap-2.5 mt-3 bg-forest/5 border border-forest/20 rounded-lg p-3">
                  <div className="min-w-[160px]">
                    <label className="block text-[0.65rem] uppercase tracking-wide text-sage mb-1">
                      Album {isVideo ? "vidéo" : "photo"}
                    </label>
                    <select
                      value={state.albumId}
                      onChange={(e) =>
                        setPublishState((p) => ({ ...p, [r.id]: { ...state, albumId: e.target.value } }))
                      }
                      className="w-full border border-ink/15 rounded px-2.5 py-1.5 text-sm bg-white text-ink"
                    >
                      {matchingAlbums.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-[0.65rem] uppercase tracking-wide text-sage mb-1">Légende</label>
                    <input
                      value={state.caption}
                      onChange={(e) =>
                        setPublishState((p) => ({ ...p, [r.id]: { ...state, caption: e.target.value } }))
                      }
                      className="w-full border border-ink/15 rounded px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePublish(r.id, state.albumId, state.caption)}
                    disabled={busyId === r.id || !state.albumId}
                    className="bg-forest text-white text-sm px-4 py-2 rounded font-medium disabled:opacity-50"
                  >
                    {busyId === r.id ? "…" : `${isVideo ? "🎬" : "📷"} Publier dans la Galerie`}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-sage mt-3">
                  Aucun album {isVideo ? "vidéo" : "photo"} pour l&apos;instant —{" "}
                  <a href="/admin/galerie" className="underline underline-offset-2 text-forest">
                    créez-en un d&apos;abord
                  </a>
                  .
                </p>
              );
            })()}
            {(() => {
              // Pour Photo/vidéo : le lien « Ajouter à la Galerie → » (détour
              // manuel) ne sert plus qu'en repli, quand le bloc de
              // publication en un clic ci-dessus n'est pas disponible
              // (pas de lien, ou aucun album du bon type pour l'instant).
              const hasInlinePublish =
                r.type === "PHOTO_VIDEO" &&
                !!r.link &&
                albums.some((a) => a.type === (isPlausibleVideoUrl(r.link!) ? "VIDEO" : "PHOTO"));
              return (
                <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-4 border-t border-ink/10">
                  {!hasInlinePublish && (
                    <a
                      href={ADMIN_LINK[r.type].href}
                      className="text-xs text-forest font-medium underline underline-offset-4"
                    >
                      {ADMIN_LINK[r.type].label}
                    </a>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => handleAction(r.id, "traiter")}
                      disabled={busyId === r.id}
                      className={
                        hasInlinePublish
                          ? "border border-ink/20 text-ink/70 text-sm px-4 py-2 rounded font-medium disabled:opacity-50"
                          : "bg-forest text-white text-sm px-4 py-2 rounded font-medium disabled:opacity-50"
                      }
                    >
                      {busyId === r.id
                        ? "…"
                        : hasInlinePublish
                        ? "Déjà publiée, marquer comme traitée"
                        : "Marquer comme traitée"}
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "refuser")}
                      disabled={busyId === r.id}
                      className="border border-burgundy/40 text-burgundy text-sm px-4 py-2 rounded font-medium disabled:opacity-50"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
