// =============================================================================
// NextAuth v5 catch-all route handler (production — Railway)
//
// Segment config must be a literal string for Next.js static analysis.
// GitHub Pages builds use output:"export" in next.config.ts which excludes
// API route handlers entirely — this file only runs on Railway.
// =============================================================================

import { handlers } from "@/server/auth";

export const dynamic = "force-dynamic";

export const { GET, POST } = handlers;
