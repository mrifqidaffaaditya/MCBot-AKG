import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { botManager } from "@/lib/bot/BotManager";

// POST /api/bots/[id]/chat - Send a chat message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const botSession = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!botSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const bot = botManager.getBot(id);
  if (!bot || bot.getStatus() !== "online") {
    return NextResponse.json({ error: "Bot is not online" }, { status: 503 });
  }

  const sent = bot.sendChat(message);
  if (!sent) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
