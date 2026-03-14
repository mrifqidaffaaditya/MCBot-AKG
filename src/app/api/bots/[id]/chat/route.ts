import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { botManager } from "@/lib/bot/BotManager";

// POST /api/bots/[id]/chat - Send a chat message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // 1. Try to authenticate via API Key (Bearer Token)
  const authHeader = req.headers.get("authorization");
  let botSession = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const apiKey = authHeader.substring(7);
    botSession = await prisma.botSession.findFirst({
      where: { id: id, apiKey: apiKey },
    });
    
    if (!botSession) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }
  } else {
    // 2. Fallback to web session authentication (Dashboard)
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    botSession = await prisma.botSession.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!botSession) {
      return NextResponse.json({ error: "Not found or not owned by user" }, { status: 404 });
    }
  }

  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const bot = botManager.getBot(id);
  if (!bot) {
    return NextResponse.json({ error: "Bot is offline or not running" }, { status: 503 });
  }

  const sent = bot.sendChat(message);
  if (!sent) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
