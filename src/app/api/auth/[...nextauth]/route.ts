// =============================================================================
// NextAuth v5 catch-all route handler
//
// GitHub Pages (static export): dummy handlers with force-static
// Railway (production): real NextAuth handlers via dynamic import
// =============================================================================

import { NextRequest, NextResponse } from "next/server";

const isGithubPages = process.env.GITHUB_PAGES === "true";

export const dynamic = isGithubPages ? "force-static" : "force-dynamic";

// Required for force-static mode (static export); ignored in dynamic mode.
export function generateStaticParams() {
  return [
    { nextauth: ["signin"] },
    { nextauth: ["signout"] },
    { nextauth: ["session"] },
    { nextauth: ["providers"] },
    { nextauth: ["callback", "credentials"] },
    { nextauth: ["callback", "email"] },
  ];
}

export async function GET(req: NextRequest) {
  if (isGithubPages) {
    return NextResponse.json({ error: "not available in demo" }, { status: 404 });
  }
  const { handlers } = await import("@/server/auth");
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  if (isGithubPages) {
    return NextResponse.json({ error: "not available in demo" }, { status: 404 });
  }
  const { handlers } = await import("@/server/auth");
  return handlers.POST(req);
}
