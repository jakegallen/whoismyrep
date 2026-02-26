/**
 * Nationwide district GeoJSON data via Census Bureau TIGERweb ArcGIS REST API.
 * Supports congressional, state senate, and state house/assembly districts for all 50 states + DC.
 */

export type DistrictLayer = "congressional" | "state-senate" | "state-house";

export interface DistrictLayerConfig {
  id: DistrictLayer;
  label: string;
  fillColor: string;
}

const TOSSUP_COLOR = "hsl(43, 90%, 55%)";

export const districtLayerConfigs: Record<DistrictLayer, DistrictLayerConfig> = {
  congressional: { id: "congressional", label: "Congressional Districts", fillColor: "hsl(250, 70%, 55%)" },
  "state-senate": { id: "state-senate", label: "State Senate Districts", fillColor: "hsl(210, 80%, 55%)" },
  "state-house": { id: "state-house", label: "State House Districts", fillColor: "hsl(142, 60%, 45%)" },
};

/** FIPS codes for each state abbreviation */
export const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10",
  FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20",
  KY: "21", LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27", MS: "28",
  MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36",
  NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45",
  SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56", DC: "11", PR: "72",
};

/** Approximate center coordinates and zoom for each state */
export const STATE_MAP_CONFIG: Record<string, { center: [number, number]; zoom: number }> = {
  AL: { center: [32.8, -86.8], zoom: 7 }, AK: { center: [64.0, -153.0], zoom: 4 },
  AZ: { center: [34.3, -111.7], zoom: 7 }, AR: { center: [34.8, -92.2], zoom: 7 },
  CA: { center: [37.2, -119.5], zoom: 6 }, CO: { center: [39.0, -105.5], zoom: 7 },
  CT: { center: [41.6, -72.7], zoom: 9 }, DE: { center: [39.0, -75.5], zoom: 9 },
  FL: { center: [28.6, -82.5], zoom: 7 }, GA: { center: [32.7, -83.5], zoom: 7 },
  HI: { center: [20.5, -157.5], zoom: 7 }, ID: { center: [44.4, -114.7], zoom: 6 },
  IL: { center: [40.0, -89.4], zoom: 7 }, IN: { center: [39.8, -86.3], zoom: 7 },
  IA: { center: [42.0, -93.5], zoom: 7 }, KS: { center: [38.5, -98.3], zoom: 7 },
  KY: { center: [37.8, -85.7], zoom: 7 }, LA: { center: [31.0, -91.9], zoom: 7 },
  ME: { center: [45.4, -69.2], zoom: 7 }, MD: { center: [39.0, -76.8], zoom: 8 },
  MA: { center: [42.2, -71.8], zoom: 8 }, MI: { center: [44.3, -84.6], zoom: 7 },
  MN: { center: [46.3, -94.3], zoom: 7 }, MS: { center: [32.7, -89.7], zoom: 7 },
  MO: { center: [38.4, -92.5], zoom: 7 }, MT: { center: [47.0, -109.6], zoom: 6 },
  NE: { center: [41.5, -99.8], zoom: 7 }, NV: { center: [38.8, -116.4], zoom: 7 },
  NH: { center: [43.7, -71.6], zoom: 8 }, NJ: { center: [40.1, -74.7], zoom: 8 },
  NM: { center: [34.4, -106.1], zoom: 7 }, NY: { center: [42.9, -75.5], zoom: 7 },
  NC: { center: [35.5, -79.8], zoom: 7 }, ND: { center: [47.5, -100.5], zoom: 7 },
  OH: { center: [40.3, -82.8], zoom: 7 }, OK: { center: [35.6, -97.5], zoom: 7 },
  OR: { center: [44.0, -120.5], zoom: 7 }, PA: { center: [40.9, -77.8], zoom: 7 },
  RI: { center: [41.7, -71.5], zoom: 10 }, SC: { center: [33.8, -80.9], zoom: 8 },
  SD: { center: [44.4, -100.2], zoom: 7 }, TN: { center: [35.8, -86.3], zoom: 7 },
  TX: { center: [31.5, -99.3], zoom: 6 }, UT: { center: [39.3, -111.7], zoom: 7 },
  VT: { center: [44.0, -72.7], zoom: 8 }, VA: { center: [37.5, -78.8], zoom: 7 },
  WA: { center: [47.4, -120.5], zoom: 7 }, WV: { center: [38.6, -80.6], zoom: 7 },
  WI: { center: [44.6, -89.8], zoom: 7 }, WY: { center: [43.0, -107.5], zoom: 7 },
  DC: { center: [38.9, -77.0], zoom: 12 }, PR: { center: [18.2, -66.5], zoom: 9 },
};

/**
 * Fetch districts from Census TIGERweb ArcGIS REST API.
 * Congressional: layer 0 (118th Congress)
 * State Senate (Upper): layers 16, 13, 11, 26
 * State House (Lower): layers 14, 10, 8, 24
 */
async function fetchTIGERweb(
  stateFips: string,
  type: "congressional" | "upper" | "lower"
): Promise<GeoJSON.FeatureCollection> {
  const layerSets: Record<string, number[]> = {
    congressional: [0, 20, 18],
    upper: [16, 13, 11, 26, 14, 10, 8, 24],
    lower: [14, 10, 8, 24, 16, 13, 11, 26],
  };

  const layers = layerSets[type];

  for (const idx of layers) {
    try {
      const service = type === "congressional"
        ? "TIGERweb/Legislative/MapServer"
        : "TIGERweb/Legislative/MapServer";
      const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/${service}/${idx}/query?where=STATE%3D%27${stateFips}%27&outFields=*&outSR=4326&f=geojson`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.error) continue;
      if (data.type === "FeatureCollection" && data.features?.length > 0) {
        return data;
      }
    } catch {
      continue;
    }
  }

  return { type: "FeatureCollection", features: [] };
}

/**
 * Fetch all three district layers for a given state.
 * Automatically detects which TIGERweb response is upper vs lower based on feature count.
 */
export async function fetchDistrictData(
  stateAbbr: string
): Promise<Record<DistrictLayer, GeoJSON.FeatureCollection>> {
  const fips = STATE_FIPS[stateAbbr.toUpperCase()];
  if (!fips) {
    return {
      congressional: { type: "FeatureCollection", features: [] },
      "state-senate": { type: "FeatureCollection", features: [] },
      "state-house": { type: "FeatureCollection", features: [] },
    };
  }

  const [congressional, dataA, dataB] = await Promise.all([
    fetchTIGERweb(fips, "congressional"),
    fetchTIGERweb(fips, "upper"),
    fetchTIGERweb(fips, "lower"),
  ]);

  // Auto-detect: the chamber with fewer districts is senate/upper
  let senate = dataA;
  let house = dataB;
  if (dataA.features.length > dataB.features.length && dataB.features.length > 0) {
    senate = dataB;
    house = dataA;
  }

  console.log(`District data loaded for ${stateAbbr}:`, {
    congressional: congressional.features.length,
    senate: senate.features.length,
    house: house.features.length,
  });

  return { congressional, "state-senate": senate, "state-house": house };
}
