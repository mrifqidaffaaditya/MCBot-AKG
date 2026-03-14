import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bots/[id]/commands - List spawn commands
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const botSession = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!botSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const commands = await prisma.spawnCommand.findMany({
    where: { botSessionId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(commands);
}

// POST /api/bots/[id]/commands - Add a new spawn command
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const botSession = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!botSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { command, delayMs, order, enabled } = body;

  if (!command || typeof command !== "string") {
    return NextResponse.json({ error: "Command is required" }, { status: 400 });
  }

  // Get next order if not specified
  let orderValue = order;
  if (orderValue === undefined) {
    const lastCommand = await prisma.spawnCommand.findFirst({
      where: { botSessionId: id },
      orderBy: { order: "desc" },
    });
    orderValue = (lastCommand?.order ?? -1) + 1;
  }

  const cmd = await prisma.spawnCommand.create({
    data: {
      botSessionId: id,
      command,
      delayMs: delayMs ?? 1000,
      order: orderValue,
      enabled: enabled !== false,
    },
  });

  return NextResponse.json(cmd, { status: 201 });
}

// PUT /api/bots/[id]/commands - Update a spawn command (pass commandId in body)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const botSession = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!botSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { commandId, command, delayMs, order, enabled } = body;

  if (!commandId) {
    return NextResponse.json({ error: "commandId is required" }, { status: 400 });
  }

  const cmd = await prisma.spawnCommand.update({
    where: { id: commandId, botSessionId: id },
    data: {
      ...(command !== undefined && { command }),
      ...(delayMs !== undefined && { delayMs }),
      ...(order !== undefined && { order }),
      ...(enabled !== undefined && { enabled }),
    },
  });

  return NextResponse.json(cmd);
}

// DELETE /api/bots/[id]/commands - Delete a spawn command (pass commandId in body)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const botSession = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!botSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { commandId } = body;

  if (!commandId) {
    return NextResponse.json({ error: "commandId is required" }, { status: 400 });
  }

  await prisma.spawnCommand.delete({
    where: { id: commandId, botSessionId: id },
  });

  return NextResponse.json({ success: true });
}
