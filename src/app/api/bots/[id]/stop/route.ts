import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { botManager } from "@/lib/bot/BotManager";

// POST /api/bots/[id]/stop - Stop a bot
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const botSession = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!botSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stopped = botManager.stopBot(id);
  if (!stopped) {
    return NextResponse.json({ error: "Bot is not running" }, { status: 409 });
  }

  return NextResponse.json({ success: true, status: "offline" });
}
