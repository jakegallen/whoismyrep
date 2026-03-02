import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);

  try {
    // ── Auth check: caller must be a logged-in user ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, req, { status: 401, cache: false });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, req, { status: 401, cache: false });
    }

    // ── Validate env ──
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return jsonResponse({ error: "RESEND_API_KEY not configured" }, req, { status: 500, cache: false });
    }

    const { type, subject, htmlContent, recipients } = await req.json();

    if (!recipients?.length || !subject || !htmlContent) {
      return jsonResponse(
        { error: "Missing required fields: recipients, subject, htmlContent" },
        req,
        { status: 400, cache: false },
      );
    }

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WhoIsMyRep.us <alerts@whoismyrep.us>",
        to: recipients,
        subject,
        html: htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to send email");
    }

    return jsonResponse({ success: true, data }, req, { cache: false });
  } catch (error) {
    console.error("Error sending alert email:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      req,
      { status: 500, cache: false },
    );
  }
});
