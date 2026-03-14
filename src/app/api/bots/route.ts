import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bots - List all bot sessions for authenticated user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bots = await prisma.botSession.findMany({
    where: { userId: session.user.id },
    include: {
      commands: { orderBy: { order: "asc" } },
      _count: { select: { chatLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bots);
}

// POST /api/bots - Create a new bot session
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, host, port, botUsername, version, autoLogin, loginPassword, autoReconnect, webhookUrl } = body;

  if (!name || !host || !botUsername) {
    return NextResponse.json({ error: "Name, host, and botUsername are required" }, { status: 400 });
  }

  const bot = await prisma.botSession.create({
    data: {
      userId: session.user.id,
      name,
      host,
      port: port || 25565,
      botUsername,
      version: version || "1.21.4",
      autoLogin: autoLogin || false,
      loginPassword: loginPassword || null,
      autoReconnect: autoReconnect !== false,
      webhookUrl: webhookUrl || null,
    },
    include: { commands: true },
  });

  return NextResponse.json(bot, { status: 201 });
}
