import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  type SpecialDistrictOfficial,
  fetchSpecialDistrictOfficialsFromCivic,
} from "../_shared/special-district-utils.ts";

/**
 * Fetch special district officials (water, fire, transit, utility, park, etc.)
 * using Google Civic Information API.
 *
 * Strategy:
 * 1. Use Representatives API with levels=special filter
 * 2. Fallback to broad query + client-side keyword filtering
 *
 * Body: { address: "123 Main St, Nashville, TN" }
 */

// ── Cache ──────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: SpecialDistrictOfficial[]; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const body = await req.json().catch(() => ({} as any));
    const address: string = body.address || "";
    const stateAbbr: string = body.stateAbbr || "";

    // Special district officials require an address
    if (!address && stateAbbr) {
      return jsonResponse(
        {
          success: true,
          officials: [],
          message:
            "Special district officials lookup requires a street address. Use the address search on the home page.",
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

    const officials = await fetchSpecialDistrictOfficialsFromCivic(
      address,
      googleKey,
      cache,
      CACHE_TTL,
    );

    let message: string | undefined;
    if (officials.length === 0) {
      message =
        "No special district officials found for this address. Special district data (water, fire, transit, etc.) may not be available for all areas through our data sources.";
    }

    return jsonResponse(
      { success: true, officials, message },
      req,
      { maxAge: 900 },
    );
  } catch (err) {
    console.error("fetch-special-district-officials error:", err);
    return jsonResponse(
      { success: false, error: "Failed to fetch special district officials data" },
      req,
      { status: 500, cache: false },
    );
  }
});
