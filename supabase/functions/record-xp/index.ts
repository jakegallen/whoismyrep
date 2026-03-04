import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// XP action definitions (mirrors client-side xpSystem.ts)
const XP_ACTIONS: Record<string, { xp: number; cooldown: string }> = {
  daily_login:       { xp: 25,  cooldown: "daily" },
  save_rep:          { xp: 10,  cooldown: "unique" },
  save_bill:         { xp: 10,  cooldown: "unique" },
  read_bill:         { xp: 5,   cooldown: "daily_unique" },
  read_politician:   { xp: 5,   cooldown: "daily_unique" },
  view_stock_trades: { xp: 5,   cooldown: "daily" },
  view_campaign_fin: { xp: 5,   cooldown: "daily" },
  quiz_correct:      { xp: 15,  cooldown: "per-question" },
  complete_challenge:{ xp: 50,  cooldown: "daily" },
  set_home_state:    { xp: 20,  cooldown: "once" },
  set_home_district: { xp: 20,  cooldown: "once" },
  achievement_unlock:{ xp: 0,   cooldown: "unique" },
};

function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * level * (level + 1) - 100;
}

function levelFromXP(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
    if (level > 999) break;
  }
  return level;
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const cors = getCorsHeaders(req);
  const headers = { ...cors, "Content-Type": "application/json" };

  try {
    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's JWT to get user ID, but use service role for writes
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers },
      );
    }

    const userId = user.id;

    // Parse request
    const body = await req.json().catch(() => ({}));
    const { action, metadata = {} } = body as { action?: string; metadata?: Record<string, string> };

    if (!action || !XP_ACTIONS[action]) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action" }),
        { status: 400, headers },
      );
    }

    const actionConfig = XP_ACTIONS[action];

    // Use service role client for DB operations (bypasses RLS for reads we need)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ── Deduplication check ──
    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00.000Z`;
    const todayEnd = `${today}T23:59:59.999Z`;

    let isDuplicate = false;

    if (actionConfig.cooldown === "daily") {
      // Check if same action already recorded today
      const { data: existing } = await adminClient
        .from("xp_events")
        .select("id")
        .eq("user_id", userId)
        .eq("action", action)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .limit(1);
      isDuplicate = (existing?.length ?? 0) > 0;

    } else if (actionConfig.cooldown === "once") {
      // Check if ever recorded
      const { data: existing } = await adminClient
        .from("xp_events")
        .select("id")
        .eq("user_id", userId)
        .eq("action", action)
        .limit(1);
      isDuplicate = (existing?.length ?? 0) > 0;

    } else if (actionConfig.cooldown === "daily_unique") {
      // Check if same action+metadata combo already recorded today
      const metaStr = JSON.stringify(metadata);
      const { data: existing } = await adminClient
        .from("xp_events")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("action", action)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);
      isDuplicate = (existing ?? []).some(
        (e) => JSON.stringify(e.metadata) === metaStr,
      );

    } else if (actionConfig.cooldown === "unique") {
      // Check if same action+metadata combo ever recorded
      const metaStr = JSON.stringify(metadata);
      const { data: existing } = await adminClient
        .from("xp_events")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("action", action);
      isDuplicate = (existing ?? []).some(
        (e) => JSON.stringify(e.metadata) === metaStr,
      );
    }
    // "per-question" has no dedup — always awards

    if (isDuplicate) {
      return new Response(
        JSON.stringify({ success: false, reason: "duplicate" }),
        { status: 200, headers },
      );
    }

    // ── Record XP event ──
    const xpEarned = actionConfig.xp;

    const { error: insertError } = await adminClient
      .from("xp_events")
      .insert({
        user_id: userId,
        action,
        xp_earned: xpEarned,
        metadata,
      });

    if (insertError) {
      console.error("Failed to insert xp_event:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record XP" }),
        { status: 500, headers },
      );
    }

    // ── Update profile XP ──
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("xp, level")
      .eq("id", userId)
      .single();

    const oldXP = profile?.xp ?? 0;
    const oldLevel = profile?.level ?? 1;
    const newTotal = oldXP + xpEarned;
    const newLevel = levelFromXP(newTotal);
    const levelUp = newLevel > oldLevel;

    const { error: updateError } = await adminClient
      .from("user_profiles")
      .update({
        xp: newTotal,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update profile XP:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        xpEarned,
        newTotal,
        newLevel,
        levelUp,
      }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("record-xp error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers },
    );
  }
});
