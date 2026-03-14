import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// POST /api/register - Register a new user
export async function POST(req: NextRequest) {
  // Check if registration is allowed
  const setting = await prisma.settings.findUnique({
    where: { key: "allow_registration" },
  });

  if (setting?.value !== "true") {
    return NextResponse.json(
      { error: "Registration is currently disabled" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  if (username.length < 3 || username.length > 20) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  // Check if username already exists
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: "USER",
    },
  });

  return NextResponse.json(
    { success: true, user: { id: user.id, username: user.username } },
    { status: 201 }
  );
}
