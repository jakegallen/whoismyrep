import { getCorsHeaders } from "../_shared/cors.ts";

// Social media integration removed. Returns empty posts array.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  return new Response(
    JSON.stringify({ success: true, posts: [] }),
    { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
  );
});
