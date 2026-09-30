import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/resetToken";

const bodySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

/**
 * POST /api/auth/reset-password — vérifie le jeton reçu par e-mail et
 * enregistre le nouveau mot de passe choisi par le membre.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Requête invalide." },
      { status: 400 }
    );
  }
  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Ce lien de réinitialisation est invalide ou a expiré. Refaites une demande." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
