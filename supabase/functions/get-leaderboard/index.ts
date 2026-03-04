import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);
    const sortBy = url.searchParams.get("sort") === "streak" ? "streak_rank" : "xp_rank";
    const userId = url.searchParams.get("userId");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch top N
    const { data: leaders, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order(sortBy, { ascending: true })
      .limit(limit);

    if (error) throw error;

    // If userId provided, also fetch their rank
    let userRank = null;
    if (userId) {
      const { data: userRow } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("user_id", userId)
        .single();
      userRank = userRow ?? null;
    }

    return jsonResponse({ leaders: leaders ?? [], userRank }, req, { cache: true, maxAge: 300 });
  } catch (err) {
    console.error("get-leaderboard error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      req,
      { status: 500, cache: false },
    );
  }
});
