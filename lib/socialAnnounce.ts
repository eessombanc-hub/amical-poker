import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderSocialCardPng } from "@/lib/socialCard";
import { SITE_URL } from "@/lib/seo";

/**
 * Prépare une annonce prête à publier sur les réseaux sociaux (Facebook,
 * Instagram) dès qu'une actu ou un portrait passe en publié sur le site —
 * voir app/api/news/[id]/route.ts et app/api/portraits/route.ts | [id]/
 * route.ts, qui appellent ces fonctions. Deux canaux, indépendants l'un de
 * l'autre :
 *  - un e-mail au bureau avec le visuel (logo du club) en pièce jointe et
 *    le texte suggéré ;
 *  - un sujet créé automatiquement dans le forum du bureau (/forum-bureau),
 *    avec ce même texte, pour qu'il reste retrouvable sans avoir à fouiller
 *    ses e-mails.
 *
 * Volontairement PAS une publication automatique via l'API Facebook/
 * Instagram (qui demanderait une App développeur Meta approuvée, des
 * jetons d'accès longue durée à sécuriser, et une validation par Meta pour
 * Instagram) : le bureau publie en un copier-coller, sans clé API à gérer.
 *
 * Best-effort de bout en bout : une erreur ici (génération d'image, envoi
 * d'e-mail, création du sujet de forum) ne doit jamais faire échouer la
 * publication elle-même sur le site — chaque canal est isolé dans son
 * propre try/catch pour qu'un échec sur l'un n'empêche pas l'autre.
 */

const BUREAU_EMAIL = process.env.BUREAU_NOTIFICATIONS_EMAIL || "eessomba.nc@gmail.com";

function excerpt(text: string, max = 220): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

function emailShell({
  heading,
  caption,
  siteLink,
}: {
  heading: string;
  caption: string;
  siteLink: string;
}): string {
  // Le texte de la légende est affiché dans un bloc <pre> pour rester
  // copiable tel quel (emojis, sauts de ligne, hashtags compris).
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <p>Bonjour,</p>
      <p>${heading}</p>
      <p>Un visuel prêt à publier est joint à cet e-mail (image carrée, pour Facebook comme pour Instagram). Voici le texte suggéré à copier-coller avec :</p>
      <pre style="white-space: pre-wrap; background:#f6f6f4; border:1px solid #ddd; border-radius:8px; padding:14px 16px; font-family: inherit; font-size: 14px;">${caption}</pre>
      <p style="font-size: 13px; color: #666;">Ce même texte a aussi été déposé dans le forum du bureau. Voir la publication sur le site : <a href="${siteLink}">${siteLink}</a></p>
      <p style="font-size: 12px; color: #999;">Message automatique — Amical Poker Club (${SITE_URL})</p>
    </div>
  `;
}

/**
 * Identifie un auteur valide (contrainte de clé étrangère sur ForumTopic)
 * pour les sujets créés automatiquement : le propriétaire du site
 * (BUREAU_NOTIFICATIONS_EMAIL, ou eessomba.nc@gmail.com par défaut), sinon
 * n'importe quel compte ADMIN trouvé. Retourne null si aucun des deux
 * n'existe (ex. base fraîchement initialisée) — la création du sujet est
 * alors sautée plutôt que d'échouer avec une contrainte violée.
 */
export async function resolveSystemAuthorId(): Promise<string | null> {
  const byEmail = await prisma.user.findUnique({ where: { email: BUREAU_EMAIL } });
  if (byEmail) return byEmail.id;
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  return admin?.id ?? null;
}

async function postToBureauForum({
  title,
  caption,
  emailSent,
}: {
  title: string;
  caption: string;
  emailSent: boolean;
}): Promise<void> {
  const authorId = await resolveSystemAuthorId();
  if (!authorId) {
    console.warn("[socialAnnounce] aucun auteur système trouvé, sujet du forum du bureau non créé.");
    return;
  }

  const body = [
    caption,
    "",
    "—",
    emailSent
      ? "Le visuel (logo du club) a été envoyé par e-mail au bureau, prêt à joindre à la publication."
      : "Le visuel n'a pas pu être généré ou envoyé automatiquement cette fois-ci : seul le texte ci-dessus est disponible.",
  ].join("\n");

  await prisma.forumTopic.create({
    data: {
      title: `📣 Annonce à publier : ${title}`,
      category: "Communication",
      body,
      area: "BUREAU",
      authorId,
    },
  });
}

export async function notifyBureauNewsPublished(news: {
  id: string;
  title: string;
  body: string;
}): Promise<void> {
  const caption = [
    `📣 ${news.title}`,
    "",
    excerpt(news.body),
    "",
    `Toute l'actu du club : ${SITE_URL}/actualites`,
    "",
    "#AmicalPokerClub #Poker #Villecresnes #AssociationPoker",
  ].join("\n");

  let png: Buffer | null = null;
  try {
    png = await renderSocialCardPng({ kicker: "Nouvelle actu du club", title: news.title });
  } catch (err) {
    console.error("[socialAnnounce] échec génération du visuel pour l'actu", news.id, err);
  }

  let emailSent = false;
  try {
    await sendEmail({
      to: BUREAU_EMAIL,
      subject: `Annonce à publier sur les réseaux : ${news.title}`,
      html: emailShell({
        heading: `Une nouvelle actu vient d'être publiée sur le site : « ${news.title} ».`,
        caption,
        siteLink: `${SITE_URL}/actualites#${news.id}`,
      }),
      ...(png ? { attachments: [{ filename: "annonce-club.png", content: png.toString("base64") }] } : {}),
    });
    emailSent = true;
  } catch (err) {
    console.error("[socialAnnounce] échec envoi e-mail pour l'actu", news.id, err);
  }

  try {
    await postToBureauForum({ title: news.title, caption, emailSent });
  } catch (err) {
    console.error("[socialAnnounce] échec création du sujet forum pour l'actu", news.id, err);
  }
}

export async function notifyBureauPortraitPublished(portrait: {
  id: string;
  displayName: string;
  role: string | null;
  bio: string;
}): Promise<void> {
  const caption = [
    `🃏 Portrait du club : ${portrait.displayName}${portrait.role ? ` — ${portrait.role}` : ""}`,
    "",
    excerpt(portrait.bio),
    "",
    `Tous les portraits : ${SITE_URL}/vie-du-club`,
    "",
    "#AmicalPokerClub #Poker #Villecresnes #AssociationPoker",
  ].join("\n");

  let png: Buffer | null = null;
  try {
    png = await renderSocialCardPng({ kicker: "Portrait du club", title: portrait.displayName });
  } catch (err) {
    console.error("[socialAnnounce] échec génération du visuel pour le portrait", portrait.id, err);
  }

  let emailSent = false;
  try {
    await sendEmail({
      to: BUREAU_EMAIL,
      subject: `Annonce à publier sur les réseaux : portrait de ${portrait.displayName}`,
      html: emailShell({
        heading: `Un nouveau portrait vient d'être publié sur le site : ${portrait.displayName}.`,
        caption,
        siteLink: `${SITE_URL}/vie-du-club`,
      }),
      ...(png ? { attachments: [{ filename: "annonce-club.png", content: png.toString("base64") }] } : {}),
    });
    emailSent = true;
  } catch (err) {
    console.error("[socialAnnounce] échec envoi e-mail pour le portrait", portrait.id, err);
  }

  try {
    await postToBureauForum({ title: portrait.displayName, caption, emailSent });
  } catch (err) {
    console.error("[socialAnnounce] échec création du sujet forum pour le portrait", portrait.id, err);
  }
}
