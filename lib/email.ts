/**
 * Envoi d'e-mails transactionnels via l'API HTTP de Resend (https://resend.com).
 * Choisi pour éviter toute dépendance npm supplémentaire ou configuration
 * SMTP : un simple appel fetch avec une clé API.
 *
 * Configuration requise (variables d'environnement, sur Vercel ET en local
 * dans .env) :
 *   - RESEND_API_KEY      : clé API d'un compte Resend (gratuit pour un petit
 *                           volume). Sans elle, les e-mails ne sont pas
 *                           envoyés — le contenu est simplement journalisé,
 *                           ce qui permet de développer en local sans compte.
 *   - RESEND_FROM_EMAIL    : adresse d'expédition, ex.
 *                           "Amical Poker Club <no-reply@votredomaine.fr>".
 *                           Par défaut, l'adresse de test Resend
 *                           "onboarding@resend.dev" (fonctionne sans
 *                           domaine vérifié, mais uniquement pour tester).
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Amical Poker Club <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  // Pièces jointes (ex. le visuel d'annonce généré pour les réseaux sociaux,
  // voir lib/socialAnnounce.ts) — encodées en base64, format attendu par
  // l'API Resend (https://resend.com/docs/api-reference/emails/send-email).
  attachments?: { filename: string; content: string }[];
}): Promise<{ sent: boolean }> {
  if (!RESEND_API_KEY) {
    // Pas de clé configurée : on ne bloque jamais le flux applicatif pour
    // autant — on journalise pour pouvoir tester le parcours en local.
    console.warn(
      `[email] RESEND_API_KEY absente — e-mail non envoyé (à ${to}, sujet : "${subject}").`
    );
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Échec de l'envoi de l'e-mail (HTTP ${res.status}) : ${detail}`);
  }

  return { sent: true };
}
