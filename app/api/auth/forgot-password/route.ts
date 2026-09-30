import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from "@/lib/resetToken";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { isRateLimited, extractIp } from "@/lib/rateLimit";

const bodySchema = z.object({ identifier: z.string().min(1).max(200) });

// Message volontairement identique dans tous les cas (compte trouvé ou non)
// pour ne pas permettre de deviner quelles adresses/pseudos existent.
const GENERIC_MESSAGE =
  "Si un compte correspond à cette adresse ou ce pseudo, un e-mail de réinitialisation vient d'être envoyé.";

/**
 * POST /api/auth/forgot-password — déclenche l'envoi d'un e-mail de
 * réinitialisation de mot de passe, à l'adresse associée au compte
 * (retrouvé par e-mail ou par pseudo, comme pour la connexion).
 */
export async function POST(req: NextRequest) {
  // Anti-abus par IP, en complément du garde-fou par compte déjà présent
  // plus bas (60 s entre deux jetons pour un même utilisateur).
  const ip = extractIp(req.headers);
  if (isRateLimited(`forgot-password:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Trop de demandes. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const identifier = parsed.data.identifier.trim();

  try {
    let user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
    if (!user) {
      const member = await prisma.member.findFirst({
        where: { nickname: { equals: identifier, mode: "insensitive" } },
        include: { user: true },
      });
      user = member?.user ?? null;
    }

    if (user) {
      // Anti-abus minimal : pas de nouveau jeton si un jeton valide a déjà
      // été émis il y a moins d'une minute pour ce compte.
      const recent = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id, usedAt: null, createdAt: { gt: new Date(Date.now() - 60_000) } },
      });

      if (!recent) {
        const token = generateResetToken();
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashResetToken(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        });

        const resetUrl = `${SITE_URL}/reinitialiser-mot-de-passe?token=${token}`;
        const { sent } = await sendEmail({
          to: user.email,
          subject: `${SITE_NAME} — Réinitialisation de votre mot de passe`,
          html: `
            <p>Bonjour,</p>
            <p>Une demande de réinitialisation de mot de passe a été faite pour votre compte sur ${SITE_NAME}.</p>
            <p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a></p>
            <p>Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail — votre mot de passe restera inchangé.</p>
          `,
        });

        // Aide au test en local tant qu'aucune clé Resend n'est configurée :
        // le lien est journalisé côté serveur pour pouvoir être copié-collé.
        if (!sent) {
          console.warn(`[forgot-password] Lien de réinitialisation (non envoyé par e-mail) : ${resetUrl}`);
        }
      }
    }
  } catch (err) {
    // On journalise mais on ne laisse jamais fuiter d'information via la réponse.
    console.error("[forgot-password]", err);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
