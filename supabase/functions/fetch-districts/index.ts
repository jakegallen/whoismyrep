import { getCorsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

/**
 * Proxy for Census Bureau TIGERweb ArcGIS REST API.
 * TIGERweb doesn't return CORS headers, so browsers can't fetch directly.
 * This edge function proxies the request server-side.
 *
 * Body: { stateFips: "32", layerIndex: 0 }
 */

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const { stateFips, layerIndex } = await req.json().catch(() => ({} as any));

    if (!stateFips || typeof stateFips !== "string") {
      return jsonResponse(
        { success: false, error: "stateFips is required" },
        req,
        { status: 400, cache: false }
      );
    }

    if (layerIndex === undefined || typeof layerIndex !== "number") {
      return jsonResponse(
        { success: false, error: "layerIndex is required (number)" },
        req,
        { status: 400, cache: false }
      );
    }

    const url =
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/${layerIndex}/query` +
      `?where=STATE%3D%27${encodeURIComponent(stateFips)}%27&outFields=*&outSR=4326&f=geojson`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "whoismyrep-districts",
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      return jsonResponse(
        { success: false, error: `TIGERweb returned ${resp.status}` },
        req,
        { status: 502, cache: false }
      );
    }

    const geoData = await resp.json();

    // Pass through the GeoJSON directly with CORS + caching
    return jsonResponse(
      { success: true, geojson: geoData },
      req,
      { maxAge: 3600 } // cache 1 hour — district boundaries rarely change
    );
  } catch (err) {
    console.error("fetch-districts error:", err);
    return jsonResponse(
      { success: false, error: "Internal error" },
      req,
      { status: 500, cache: false }
    );
  }
});
