"use client";

import { useCallback, useEffect, useState } from "react";
import { detectVideoEmbed } from "@/lib/media";
import LikeButton from "./LikeButton";

export type MediaComment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
};

export type MediaItem = {
  id: string;
  url: string; // photoUrl ou videoUrl
  caption: string | null;
  likeCount: number;
  likedByMe: boolean;
  comments: MediaComment[];
};

/**
 * Grille de médias (photos ou vidéos) d'un album de la Galerie : un clic
 * ouvre le média en plein écran (lightbox), avec navigation précédent/
 * suivant au sein du même album, "j'aime" (composant LikeButton réutilisé
 * tel quel, voir components/LikeButton.tsx) et fil de commentaires — voir
 * app/galerie/page.tsx, un MediaLightbox par album (kind="photo"|"video").
 * Toute la page Galerie est réservée aux comptes connectés (LoginGate), donc
 * "j'aime"/commenter y sont toujours ouverts à l'utilisateur courant.
 */
export default function MediaLightbox({
  items,
  kind,
  isModerator = false,
}: {
  items: MediaItem[];
  kind: "photo" | "video";
  /** Responsable/bureau/admin — affiche les contrôles de modération :
   *  correction du titre (légende), suppression de la publication et des
   *  commentaires. Voir app/api/admin/photos|videos/:id et
   *  app/api/gallery/photos|videos/comments/:commentId. */
  isModerator?: boolean;
}) {
  const [mediaItems, setMediaItems] = useState(items);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;
  const current = isOpen ? mediaItems[openIndex as number] : null;

  const [commentsByItem, setCommentsByItem] = useState<Record<string, MediaComment[]>>({});
  const [commentBody, setCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);

  const [confirmDeleteItem, setConfirmDeleteItem] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);

  const currentComments = current ? commentsByItem[current.id] ?? current.comments : [];

  const close = useCallback(() => setOpenIndex(null), []);
  const showPrev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + mediaItems.length) % mediaItems.length)),
    [mediaItems.length]
  );
  const showNext = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % mediaItems.length)),
    [mediaItems.length]
  );

  useEffect(() => {
    setCommentBody("");
    setCommentError(null);
    setEditingCaption(false);
    setCaptionError(null);
    setConfirmDeleteItem(false);
  }, [openIndex]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, showPrev, showNext]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !commentBody.trim() || postingComment) return;
    const item = current;
    setPostingComment(true);
    setCommentError(null);
    const endpoint =
      kind === "photo"
        ? `/api/gallery/photos/${item.id}/comments`
        : `/api/gallery/videos/${item.id}/comments`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCommentError(typeof data.error === "string" ? data.error : "Impossible de publier ce commentaire.");
        return;
      }
      const authorName =
        data.author?.member?.nickname || data.author?.displayName || data.author?.email || "Membre";
      setCommentsByItem((prev) => ({
        ...prev,
        [item.id]: [
          ...(prev[item.id] ?? item.comments),
          { id: data.id, body: data.body, createdAt: data.createdAt, authorName },
        ],
      }));
      setCommentBody("");
    } catch {
      setCommentError("Impossible de publier ce commentaire.");
    } finally {
      setPostingComment(false);
    }
  }

  /** Modération : enregistre le nouveau titre (légende) de la publication
   *  ouverte — voir app/api/admin/photos|videos/:id (PATCH), réservé
   *  RESPONSABLE+. */
  async function saveCaption() {
    if (!current || savingCaption) return;
    const item = current;
    setSavingCaption(true);
    setCaptionError(null);
    const endpoint = kind === "photo" ? `/api/admin/photos/${item.id}` : `/api/admin/videos/${item.id}`;
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: captionDraft.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCaptionError(typeof data.error === "string" ? data.error : "Impossible d'enregistrer ce titre.");
        return;
      }
      setMediaItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, caption: data.caption ?? null } : m)));
      setEditingCaption(false);
    } catch {
      setCaptionError("Impossible d'enregistrer ce titre.");
    } finally {
      setSavingCaption(false);
    }
  }

  /** Modération : supprime la publication ouverte (photo ou vidéo) — voir
   *  app/api/admin/photos|videos/:id (DELETE), réservé RESPONSABLE+. */
  async function deleteCurrentItem() {
    if (!current || deletingItem) return;
    const item = current;
    setDeletingItem(true);
    const endpoint = kind === "photo" ? `/api/admin/photos/${item.id}` : `/api/admin/videos/${item.id}`;
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) return;
      const remaining = mediaItems.filter((m) => m.id !== item.id);
      setMediaItems(remaining);
      setConfirmDeleteItem(false);
      if (remaining.length === 0) {
        close();
      } else {
        setOpenIndex((i) => (i === null ? i : Math.min(i, remaining.length - 1)));
      }
    } finally {
      setDeletingItem(false);
    }
  }

  /** Modération : supprime un commentaire — voir
   *  app/api/gallery/photos|videos/comments/:commentId (DELETE), réservé
   *  RESPONSABLE+. */
  async function deleteComment(commentId: string) {
    if (!current || deletingCommentId) return;
    const item = current;
    setDeletingCommentId(commentId);
    const endpoint =
      kind === "photo"
        ? `/api/gallery/photos/comments/${commentId}`
        : `/api/gallery/videos/comments/${commentId}`;
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) return;
      setCommentsByItem((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] ?? item.comments).filter((c) => c.id !== commentId),
      }));
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {mediaItems.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="card-hover relative aspect-square bg-paper-dim border border-white/10 rounded-lg overflow-hidden cursor-zoom-in"
            title={item.caption ?? undefined}
            aria-label={item.caption ?? (kind === "photo" ? "Agrandir la photo" : "Voir la vidéo")}
          >
            {kind === "photo" ? (
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${item.url})` }}
              />
            ) : (
              <GridVideoThumb url={item.url} />
            )}
            {item.likeCount > 0 && (
              <span className="absolute bottom-1.5 right-1.5 bg-noir/70 text-white text-[0.65rem] rounded-full px-1.5 py-0.5 flex items-center gap-1">
                ❤️ {item.likeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isOpen && current && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-6"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="absolute top-5 right-5 text-white/80 hover:text-white text-3xl leading-none w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors z-10"
          >
            ×
          </button>

          {mediaItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                aria-label="Média précédent"
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors z-10"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                aria-label="Média suivant"
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors z-10"
              >
                ›
              </button>
            </>
          )}

          <div
            className="animate-modal-in w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-noir flex items-center justify-center">
              {kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.url}
                  alt={current.caption ?? "Photo de l'Amical Poker Club"}
                  className="max-w-full max-h-[55vh] object-contain"
                />
              ) : (
                <LightboxVideo url={current.url} />
              )}
            </div>

            <div className="p-5">
              {isModerator && editingCaption ? (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      placeholder="Titre de la publication"
                      maxLength={200}
                      className="flex-1 border border-ink/15 rounded px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={saveCaption}
                      disabled={savingCaption}
                      className="bg-forest text-white px-3 py-2 rounded text-xs font-medium disabled:opacity-50"
                    >
                      {savingCaption ? "…" : "Enregistrer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCaption(false)}
                      className="text-xs text-sage underline underline-offset-2"
                    >
                      Annuler
                    </button>
                  </div>
                  {captionError && <p className="text-xs text-red-600 mt-1.5">{captionError}</p>}
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3 mb-4">
                  {current.caption ? (
                    <p className="text-ink text-sm">{current.caption}</p>
                  ) : (
                    <span />
                  )}
                  {isModerator && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCaptionDraft(current.caption ?? "");
                          setEditingCaption(true);
                        }}
                        className="text-xs text-forest-2 underline underline-offset-2"
                      >
                        Modifier le titre
                      </button>
                      {confirmDeleteItem ? (
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={deleteCurrentItem}
                            disabled={deletingItem}
                            className="text-xs text-white bg-burgundy rounded px-2 py-1 font-medium disabled:opacity-50"
                          >
                            {deletingItem ? "…" : "Confirmer"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteItem(false)}
                            className="text-xs text-sage underline underline-offset-2"
                          >
                            Annuler
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteItem(true)}
                          className="text-xs text-burgundy underline underline-offset-2"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-ink/10">
                <LikeButton
                  key={current.id}
                  endpoint={
                    kind === "photo"
                      ? `/api/gallery/photos/${current.id}/like`
                      : `/api/gallery/videos/${current.id}/like`
                  }
                  initialCount={current.likeCount}
                  initialLiked={current.likedByMe}
                  isLoggedIn
                />
                <span className="text-xs text-sage">
                  {currentComments.length} commentaire{currentComments.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {currentComments.map((c) => (
                  <div key={c.id} className="text-sm flex items-start justify-between gap-2">
                    <span>
                      <span className="font-medium text-ink">{c.authorName}</span>{" "}
                      <span className="text-ink/80">{c.body}</span>
                    </span>
                    {isModerator && (
                      <button
                        type="button"
                        onClick={() => deleteComment(c.id)}
                        disabled={deletingCommentId === c.id}
                        className="text-xs text-burgundy underline underline-offset-2 flex-shrink-0 disabled:opacity-50"
                      >
                        {deletingCommentId === c.id ? "…" : "Supprimer"}
                      </button>
                    )}
                  </div>
                ))}
                {currentComments.length === 0 && (
                  <p className="text-xs text-sage">Aucun commentaire pour l&apos;instant.</p>
                )}
              </div>

              <form onSubmit={submitComment} className="flex gap-2">
                <input
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Ajouter un commentaire…"
                  maxLength={1000}
                  className="flex-1 bg-white border border-ink/15 text-ink rounded px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={postingComment || !commentBody.trim()}
                  className="bg-forest text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                >
                  {postingComment ? "…" : "Publier"}
                </button>
              </form>
              {commentError && <p className="text-xs text-red-600 mt-2">{commentError}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Miniature légère pour la grille (pas d'iframe ici : trop coûteux répété
 *  plusieurs fois sur une même page) — aperçu vidéo natif pour un fichier
 *  direct, icône ▶ pour un lien YouTube/Vimeo (embed chargé seulement à
 *  l'ouverture de la lightbox, voir LightboxVideo). */
function GridVideoThumb({ url }: { url: string }) {
  const embed = detectVideoEmbed(url);
  if (embed.kind === "direct") {
    return <video src={url} className="w-full h-full object-cover" muted preload="metadata" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-noir text-white/80 text-2xl">
      ▶
    </div>
  );
}

function LightboxVideo({ url }: { url: string }) {
  const embed = detectVideoEmbed(url);
  if (embed.kind === "direct") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={url} controls autoPlay className="max-w-full max-h-[55vh]" />
    );
  }
  return (
    <iframe
      src={embed.embedUrl}
      className="w-full aspect-video max-h-[55vh]"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="Vidéo"
    />
  );
}
