import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// POST /api/bots/[id]/apikey - Generate a new API Key for the bot
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  
  // Verify ownership
  const existing = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });
  
  if (!existing) {
    return NextResponse.json({ error: "Not found or not owned by user" }, { status: 404 });
  }

  // Generate a secure 32-byte hex token (64 characters)
  const newApiKey = crypto.randomBytes(32).toString('hex');

  // Update DB
  await prisma.botSession.update({
    where: { id },
    data: { apiKey: newApiKey },
  });

  return NextResponse.json({ success: true, apiKey: newApiKey });
}
