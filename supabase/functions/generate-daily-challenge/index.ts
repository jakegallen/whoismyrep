import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Challenge templates — rotates through these
const CHALLENGE_TEMPLATES = [
  {
    challenge_type: "read_bills",
    title: "Bill Explorer",
    description: "Read 3 different bills today",
    target_count: 3,
    xp_reward: 50,
  },
  {
    challenge_type: "explore_reps",
    title: "Rep Researcher",
    description: "Learn about 2 different politicians today",
    target_count: 2,
    xp_reward: 50,
  },
  {
    challenge_type: "read_bills",
    title: "Legislative Deep Dive",
    description: "Read 5 different bills today",
    target_count: 5,
    xp_reward: 75,
  },
  {
    challenge_type: "explore_reps",
    title: "Know Your Reps",
    description: "Explore 3 different politician profiles today",
    target_count: 3,
    xp_reward: 50,
  },
  {
    challenge_type: "save_items",
    title: "Building Your Watchlist",
    description: "Save 2 representatives or bills to your watchlist",
    target_count: 2,
    xp_reward: 50,
  },
  {
    challenge_type: "quiz",
    title: "Knowledge Check",
    description: "Complete the daily quiz",
    target_count: 1,
    xp_reward: 50,
  },
  {
    challenge_type: "read_bills",
    title: "Informed Voter",
    description: "Read 2 bills and explore 1 politician",
    target_count: 3,
    xp_reward: 50,
  },
];

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const cors = getCorsHeaders(req);
  const headers = { ...cors, "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const date =
      (body as Record<string, string>).date ??
      new Date().toISOString().split("T")[0];

    // Check if challenge already exists for this date
    const { data: existing } = await adminClient
      .from("daily_challenges")
      .select("*")
      .eq("challenge_date", date)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ challenge: existing }),
        { status: 200, headers },
      );
    }

    // Pick a challenge based on day-of-year for deterministic rotation
    const dayOfYear = Math.floor(
      (new Date(date).getTime() - new Date(date.substring(0, 4) + "-01-01").getTime()) /
        86400000,
    );
    const template = CHALLENGE_TEMPLATES[dayOfYear % CHALLENGE_TEMPLATES.length];

    const { data: created, error } = await adminClient
      .from("daily_challenges")
      .insert({
        challenge_date: date,
        ...template,
      })
      .select()
      .single();

    if (error) {
      // Race condition: another request may have inserted it
      if (error.code === "23505") {
        const { data: retry } = await adminClient
          .from("daily_challenges")
          .select("*")
          .eq("challenge_date", date)
          .single();
        return new Response(
          JSON.stringify({ challenge: retry }),
          { status: 200, headers },
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ challenge: created }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("generate-daily-challenge error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate challenge" }),
      { status: 500, headers },
    );
  }
});
