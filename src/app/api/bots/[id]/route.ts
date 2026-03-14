import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { botManager } from "@/lib/bot/BotManager";

// GET /api/bots/[id] - Get single bot session
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bot = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
    include: { commands: { orderBy: { order: "asc" } } },
  });

  if (!bot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = botManager.getBotStatus(id);
  return NextResponse.json({ ...bot, status });
}

// PUT /api/bots/[id] - Update bot session
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, host, port, botUsername, version, autoLogin, loginPassword, autoReconnect, webhookUrl, chatRegex } = body;

  const bot = await prisma.botSession.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(host !== undefined && { host }),
      ...(port !== undefined && { port }),
      ...(botUsername !== undefined && { botUsername }),
      ...(version !== undefined && { version }),
      ...(autoLogin !== undefined && { autoLogin }),
      ...(loginPassword !== undefined && { loginPassword }),
      ...(autoReconnect !== undefined && { autoReconnect }),
      ...(webhookUrl !== undefined && { webhookUrl }),
      ...(chatRegex !== undefined && { chatRegex }),
    },
    include: { commands: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(bot);
}

// DELETE /api/bots/[id] - Delete bot session
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Stop bot if running
  botManager.stopBot(id);

  await prisma.botSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
