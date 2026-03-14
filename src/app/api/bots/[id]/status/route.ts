import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { botManager } from "@/lib/bot/BotManager";

// GET /api/bots/[id]/status - Get bot runtime status
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const botSession = await prisma.botSession.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!botSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = botManager.getBotStatus(id);
  return NextResponse.json({ id, status });
}
