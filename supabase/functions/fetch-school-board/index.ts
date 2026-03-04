import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  type SchoolBoardMember,
  type SchoolDistrict,
  fetchSchoolBoardFromCivic,
} from "../_shared/school-board-utils.ts";

/**
 * Fetch school board members using Google Civic Information API.
 *
 * Strategy:
 * 1. Use divisionsByAddress to find school district OCD-IDs
 * 2. Attempt the Representatives API (levels=special, roles=schoolBoard)
 *    — This API was announced as shut down April 30, 2025, but may still be
 *      partially functional. We attempt it and gracefully handle failure.
 * 3. If Representatives API fails, return the identified school district(s)
 *    with a message about limited availability.
 *
 * Body: { address: "123 Main St, Nashville, TN" }
 */

// ── Cache ──────────────────────────────────────────────────────────────────

const cache = new Map<
  string,
  { data: SchoolBoardMember[]; districts: SchoolDistrict[]; ts: number }
>();
const CACHE_TTL = 15 * 60 * 1000;

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const body = await req.json().catch(() => ({} as any));
    const address: string = body.address || "";
    const stateAbbr: string = body.stateAbbr || "";

    // School board requires an address
    if (!address && stateAbbr) {
      return jsonResponse(
        {
          success: true,
          members: [],
          districts: [],
          message:
            "School board lookup requires a street address. Use the address search on the home page.",
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
          members: [],
          districts: [],
          message: "Google Civic API key not configured",
        },
        req,
        { maxAge: 60 },
      );
    }

    const { members, districts } = await fetchSchoolBoardFromCivic(
      address,
      googleKey,
      cache,
      CACHE_TTL,
    );

    let message: string | undefined;
    if (members.length === 0 && districts.length > 0) {
      message =
        "Your school district was identified but individual board member data is not currently available through our data sources. Check your school district's website for board member information.";
    } else if (members.length === 0 && districts.length === 0) {
      message =
        "No school district data found for this address. School district boundaries may not be available for all areas.";
    }

    return jsonResponse(
      { success: true, members, districts, message },
      req,
      { maxAge: 900 },
    );
  } catch (err) {
    console.error("fetch-school-board error:", err);
    return jsonResponse(
      { success: false, error: "Failed to fetch school board data" },
      req,
      { status: 500, cache: false },
    );
  }
});
