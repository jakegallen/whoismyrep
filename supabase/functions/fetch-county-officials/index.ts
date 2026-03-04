import { getCorsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  type CountyOfficial,
  fetchCountyOfficialsFromCivic,
} from "../_shared/county-utils.ts";

/**
 * Fetch county-level officials using Google Civic Information API's
 * `representatives` endpoint.
 *
 * NOTE: Google announced the Representatives API shutdown on April 30, 2025.
 * This function attempts the call and gracefully returns an empty list with
 * an explanatory message when the API is unavailable.
 *
 * Body (address mode):  { address: "123 Main St, Nashville, TN" }
 * Body (state mode):    { stateAbbr: "TN" }   — returns nothing (county needs address)
 */

// ── Cache (15 min per address) ─────────────────────────────────────────────

const cache = new Map<string, { data: CountyOfficial[]; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const body = await req.json().catch(() => ({} as any));
    const address: string = body.address || "";
    const stateAbbr: string = body.stateAbbr || "";

    // County officials require an address — state-only mode returns empty
    if (!address && stateAbbr) {
      return jsonResponse(
        {
          success: true,
          officials: [],
          message:
            "County officials require a street address for lookup. Use the address search on the home page.",
        },
        req,
        { maxAge: 60 },
      );
    }

    if (!address) {
      return jsonResponse(
        { success: false, error: "address is required" },
        req,
        { status: 400, cache: false },
      );
    }

    const googleKey = Deno.env.get("GOOGLE_CIVIC_API_KEY");
    if (!googleKey) {
      return jsonResponse(
        {
          success: true,
          officials: [],
          message: "Google Civic API key not configured",
        },
        req,
        { maxAge: 60 },
      );
    }

    const officials = await fetchCountyOfficialsFromCivic(
      address,
      googleKey,
      cache,
      CACHE_TTL,
    );

    const message =
      officials.length === 0
        ? "No county officials found. The Google Civic Representatives API may have limited coverage for this address, or the API may be unavailable."
        : undefined;

    return jsonResponse({ success: true, officials, message }, req, {
      maxAge: 900,
    });
  } catch (err) {
    console.error("fetch-county-officials error:", err);
    return jsonResponse(
      { success: false, error: "Failed to fetch county officials" },
      req,
      { status: 500, cache: false },
    );
  }
});
