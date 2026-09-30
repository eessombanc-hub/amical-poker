import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { MUTE_DURATIONS } from "@/lib/forumModeration";

const bodySchema = z.object({
  action: z.enum(["mute", "unmute"]),
  permanent: z.boolean().optional(),
  durationDays: z.number().int().positive().optional(),
});

function displayNameOf(u: { email: string; displayName: string | null; member: { firstName: string; lastName: string; nickname: string } | null }) {
  if (u.member) return `${u.member.firstName} ${u.member.lastName} (${u.member.nickname})`;
  return u.displayName || u.email;
}

/**
 * PATCH /api/forum/mute/:userId — suspend ou lève la suspension d'un compte
 * sur le forum commun.
 *
 * Mise en sourdine et levée de suspension : réservées aux rôles
 * RESPONSABLE, BUREAU et ADMIN. À chaque suspension, tous les comptes
 * RESPONSABLE et ADMIN (hors l'auteur de l'action) sont notifiés
 * (notification + e-mail) pour garder un œil sur la modération.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const actorRole = (session?.user as any)?.role as string | undefined;
  const actorId = (session?.user as any)?.id as string | undefined;
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { action } = parsed.data;

  if (!hasRole(actorRole, "RESPONSABLE")) {
    return NextResponse.json(
      {
        error:
          action === "mute"
            ? "Seuls les responsables, membres du bureau et administrateurs peuvent mettre en sourdine."
            : "Droits insuffisants",
      },
      { status: 403 }
    );
  }

  if (params.userId === actorId) {
    return NextResponse.json({ error: "Vous ne pouvez pas vous suspendre vous-même." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { member: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }

  // Les membres du bureau (RESPONSABLE/BUREAU/ADMIN) ne peuvent pas être
  // suspendus — la sourdine ne vise que les comptes du forum ouvert à tous.
  if (hasRole(target.role, "RESPONSABLE")) {
    return NextResponse.json(
      { error: "Impossible de suspendre un membre du bureau." },
      { status: 400 }
    );
  }

  if (action === "unmute") {
    await prisma.user.update({
      where: { id: target.id },
      data: { forumMutedUntil: null, forumMutedPermanent: false },
    });
    return NextResponse.json({ ok: true });
  }

  const permanent = parsed.data.permanent === true;
  const durationDays = MUTE_DURATIONS.some((d) => d.days === parsed.data.durationDays)
    ? parsed.data.durationDays
    : 7;
  const mutedUntil = permanent ? null : new Date(Date.now() + durationDays! * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: target.id },
    data: { forumMutedUntil: mutedUntil, forumMutedPermanent: permanent },
  });

  // Signalement systématique aux rôles RESPONSABLE et ADMIN (hors l'auteur
  // de l'action), pour que la modération du forum reste visible même quand
  // elle est décidée par un membre du bureau.
  const targetName = displayNameOf(target);
  const actor = await prisma.user.findUnique({ where: { id: actorId! }, include: { member: true } });
  const actorName = actor ? displayNameOf(actor) : "un membre du bureau";
  const durationLabel = permanent
    ? "suspension définitive"
    : `suspension temporaire (${durationDays} jour${durationDays! > 1 ? "s" : ""})`;
  const message = `${actorName} a mis en sourdine ${targetName} sur le forum commun, ${durationLabel}.`;

  const notifyRecipients = await prisma.user.findMany({
    where: { role: { in: ["RESPONSABLE", "ADMIN"] }, id: { not: actorId } },
    select: { id: true, email: true },
  });

  await Promise.all(
    notifyRecipients.map((r) =>
      prisma.notification.create({
        data: { userId: r.id, type: "FORUM_SUSPENSION", message },
      })
    )
  );

  // E-mail best-effort — ne bloque jamais la réponse si Resend est indisponible.
  await Promise.all(
    notifyRecipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `${SITE_NAME}, Suspension d'un membre sur le forum`,
        html: `
          <p>Bonjour,</p>
          <p>${message}</p>
          <p><a href="${SITE_URL}/forum">Voir le forum du club</a></p>
        `,
      }).catch(() => ({ sent: false }))
    )
  );

  return NextResponse.json({ ok: true });
}
