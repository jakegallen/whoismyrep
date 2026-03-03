/**
 * Shared CORS + caching helpers for all edge functions.
 *
 * Usage:
 *   import { getCorsHeaders, withCache, jsonResponse, handleCors } from "../_shared/cors.ts";
 */

const ALLOWED_ORIGINS = [
  "https://whoismyrep.us",
  "https://www.whoismyrep.us",
  "http://localhost:5173",   // Vite dev
  "http://localhost:4173",   // Vite preview
  "http://localhost:8080",   // Claude preview
  "http://127.0.0.1:8080",  // Claude preview (IP)
];

const BASE_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Return CORS headers scoped to the requesting origin (if allowed). */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { ...BASE_HEADERS, "Access-Control-Allow-Origin": allowed };
}

/** Merge Cache-Control into a headers object. Default: 5 min public, 10 min stale. */
export function withCache(
  headers: Record<string, string>,
  maxAge = 300,
  staleWhileRevalidate = 600,
): Record<string, string> {
  return {
    ...headers,
    "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  };
}

/** Shorthand: JSON response with CORS + optional caching. */
export function jsonResponse(
  body: unknown,
  req: Request,
  opts?: { status?: number; cache?: boolean; maxAge?: number },
): Response {
  const cors = getCorsHeaders(req);
  const headers = opts?.cache !== false
    ? withCache({ ...cors, "Content-Type": "application/json" }, opts?.maxAge)
    : { ...cors, "Content-Type": "application/json" };
  return new Response(JSON.stringify(body), { status: opts?.status ?? 200, headers });
}

/** Handle OPTIONS preflight — return early if method is OPTIONS. */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
