import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  type MunicipalOfficial,
  fetchMunicipalOfficialsFromCivic,
} from "../_shared/municipal-utils.ts";

/**
 * Fetch municipal/city officials using Google Civic Information API.
 *
 * Strategy:
 * 1. Use Representatives API with locality level filter
 * 2. Fallback to broad query + client-side filtering
 *
 * Body: { address: "123 Main St, Nashville, TN" }
 */

// ── Cache ──────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: MunicipalOfficial[]; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const body = await req.json().catch(() => ({} as any));
    const address: string = body.address || "";
    const stateAbbr: string = body.stateAbbr || "";

    // Municipal officials require an address
    if (!address && stateAbbr) {
      return jsonResponse(
        {
          success: true,
          officials: [],
          message:
            "Municipal officials lookup requires a street address. Use the address search on the home page.",
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

    const officials = await fetchMunicipalOfficialsFromCivic(
      address,
      googleKey,
      cache,
      CACHE_TTL,
    );

    let message: string | undefined;
    if (officials.length === 0) {
      message =
        "No municipal/city official data found for this address. City government data may not be available for all areas through our data sources.";
    }

    return jsonResponse(
      { success: true, officials, message },
      req,
      { maxAge: 900 },
    );
  } catch (err) {
    console.error("fetch-municipal-officials error:", err);
    return jsonResponse(
      { success: false, error: "Failed to fetch municipal officials data" },
      req,
      { status: 500, cache: false },
    );
  }
});
