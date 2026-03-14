import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { botManager } from "@/lib/bot/BotManager";

// POST /api/bots/[id]/start - Start a bot
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const botSession = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
    include: { commands: { orderBy: { order: "asc" } } },
  });

  if (!botSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if already running
  const currentStatus = botManager.getBotStatus(id);
  if (currentStatus === "online" || currentStatus === "connecting") {
    return NextResponse.json({ error: "Bot is already running" }, { status: 409 });
  }

  botManager.startBot({
    sessionId: botSession.id,
    name: botSession.name,
    host: botSession.host,
    port: botSession.port,
    botUsername: botSession.botUsername,
    version: botSession.version,
    autoLogin: botSession.autoLogin,
    loginPassword: botSession.loginPassword,
    autoReconnect: botSession.autoReconnect,
    webhookUrl: botSession.webhookUrl,
    spawnCommands: botSession.commands.map((c) => ({
      command: c.command,
      delayMs: c.delayMs,
      order: c.order,
      enabled: c.enabled,
    })),
  });

  return NextResponse.json({ success: true, status: "connecting" });
}
