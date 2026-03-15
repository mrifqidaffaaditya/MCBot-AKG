import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicPaths = ["/login", "/register", "/api/auth", "/api/register", "/api/settings"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  // Check auth for dashboard and API routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/bots")) {
    const authHeader = request.headers.get("authorization");
    if (pathname.startsWith("/api/bots") && authHeader?.startsWith("Bearer ")) {
      return NextResponse.next();
    }

    const token = await getToken({ req: request });
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/bots/:path*"],
};
