/**
 * Nevada district GeoJSON data sources and configuration.
 * Congressional: unitedstates/districts repo on GitHub (CORS-friendly raw.githubusercontent.com).
 * State legislative: Census Bureau TIGERweb ArcGIS REST API.
 */

export type DistrictLayer = "congressional" | "state-senate" | "state-assembly";

export interface DistrictLayerConfig {
  id: DistrictLayer;
  label: string;
  nameField: string;
  fillColor: string;
  getPartyColor?: (feature: GeoJSON.Feature) => string;
}

const DEM_COLOR = "hsl(210, 80%, 55%)";
const REP_COLOR = "hsl(0, 72%, 51%)";
const TOSSUP_COLOR = "hsl(43, 90%, 55%)";

const congressionalParty: Record<string, string> = {
  "1": DEM_COLOR, "2": REP_COLOR, "3": DEM_COLOR, "4": DEM_COLOR,
};

const senateDist: Record<string, string> = {
  "1": DEM_COLOR, "2": DEM_COLOR, "3": REP_COLOR, "4": DEM_COLOR,
  "5": REP_COLOR, "6": DEM_COLOR, "7": REP_COLOR, "8": DEM_COLOR,
  "9": DEM_COLOR, "10": DEM_COLOR, "11": DEM_COLOR, "12": DEM_COLOR,
  "13": REP_COLOR, "14": REP_COLOR, "15": REP_COLOR, "16": REP_COLOR,
  "17": DEM_COLOR, "18": REP_COLOR, "19": REP_COLOR, "20": DEM_COLOR,
  "21": DEM_COLOR,
};

const assemblyDist: Record<string, string> = {
  "1": DEM_COLOR, "2": DEM_COLOR, "3": REP_COLOR, "4": DEM_COLOR,
  "5": DEM_COLOR, "6": DEM_COLOR, "7": DEM_COLOR, "8": DEM_COLOR,
  "9": DEM_COLOR, "10": DEM_COLOR, "11": DEM_COLOR, "12": DEM_COLOR,
  "13": DEM_COLOR, "14": DEM_COLOR, "15": REP_COLOR, "16": DEM_COLOR,
  "17": DEM_COLOR, "18": DEM_COLOR, "19": DEM_COLOR, "20": DEM_COLOR,
  "21": DEM_COLOR, "22": DEM_COLOR, "23": REP_COLOR, "24": DEM_COLOR,
  "25": DEM_COLOR, "26": REP_COLOR, "27": REP_COLOR, "28": DEM_COLOR,
  "29": DEM_COLOR, "30": REP_COLOR, "31": REP_COLOR, "32": REP_COLOR,
  "33": REP_COLOR, "34": REP_COLOR, "35": REP_COLOR, "36": REP_COLOR,
  "37": REP_COLOR, "38": REP_COLOR, "39": REP_COLOR, "40": REP_COLOR,
  "41": REP_COLOR, "42": REP_COLOR,
};

function extractDistrictNumber(feature: GeoJSON.Feature): string {
  const props = feature.properties || {};
  return (
    props.district || props.CD118FP || props.BASENAME ||
    props.SLDUST || props.SLDLST ||
    props.NAMELSAD?.match(/\d+/)?.[0] ||
    props.NAME?.match(/\d+/)?.[0] || "0"
  );
}

export const districtLayerConfigs: Record<DistrictLayer, DistrictLayerConfig> = {
  congressional: {
    id: "congressional",
    label: "Congressional Districts",
    nameField: "district",
    fillColor: TOSSUP_COLOR,
    getPartyColor: (f) => congressionalParty[extractDistrictNumber(f)] || TOSSUP_COLOR,
  },
  "state-senate": {
    id: "state-senate",
    label: "State Senate Districts",
    nameField: "NAMELSAD",
    fillColor: TOSSUP_COLOR,
    getPartyColor: (f) => senateDist[extractDistrictNumber(f)] || TOSSUP_COLOR,
  },
  "state-assembly": {
    id: "state-assembly",
    label: "State Assembly Districts",
    nameField: "NAMELSAD",
    fillColor: TOSSUP_COLOR,
    getPartyColor: (f) => assemblyDist[extractDistrictNumber(f)] || TOSSUP_COLOR,
  },
};

/**
 * Fetch congressional districts from GitHub (unitedstates/districts).
 * The state-level shape.geojson contains the full state outline as a single feature;
 * individual district shapes are at cds/2012/NV-{n}/shape.geojson.
 */
async function fetchCongressional(): Promise<GeoJSON.FeatureCollection> {
  const features: GeoJSON.Feature[] = [];

  // Fetch each congressional district individually from GitHub raw
  await Promise.all(
    ["1", "2", "3", "4"].map(async (d) => {
      try {
        const url = `https://raw.githubusercontent.com/unitedstates/districts/gh-pages/cds/2012/NV-${d}/shape.geojson`;
        const res = await fetch(url);
        if (!res.ok) return;
        const geo = await res.json();
        if (geo.type === "Polygon" || geo.type === "MultiPolygon") {
          features.push({
            type: "Feature",
            properties: { district: d, NAMELSAD: `Congressional District ${d}` },
            geometry: geo,
          });
        } else if (geo.type === "Feature") {
          geo.properties = { ...geo.properties, district: d, NAMELSAD: `Congressional District ${d}` };
          features.push(geo);
        } else if (geo.type === "FeatureCollection") {
          geo.features.forEach((f: GeoJSON.Feature) => {
            f.properties = { ...f.properties, district: d, NAMELSAD: `Congressional District ${d}` };
            features.push(f);
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch congressional NV-${d}:`, e);
      }
    })
  );

  return { type: "FeatureCollection", features };
}

/**
 * Fetch state legislative districts from Census TIGERweb.
 * SLDU = State Legislative District (Upper / Senate)
 * SLDL = State Legislative District (Lower / Assembly)
 * The WHERE clause needs quotes around the FIPS code value.
 */
async function fetchTIGERweb(chamber: "upper" | "lower"): Promise<GeoJSON.FeatureCollection> {
  // Try multiple layer indices since the service changes periodically
  // TIGERweb layer indices — note: the "upper" (Senate) and "lower" (Assembly) 
  // layers may be swapped in practice, so we try both orderings
  const layerIndices = chamber === "upper"
    ? [16, 13, 11, 26, 14, 10, 8, 24]  // Try SLDL first (may map to Senate in some versions)
    : [14, 10, 8, 24, 16, 13, 11, 26]; // Try SLDU first

  for (const idx of layerIndices) {
    try {
      // Important: STATE value must be quoted in WHERE clause
      const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/${idx}/query?where=STATE%3D%2732%27&outFields=*&outSR=4326&f=geojson`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.error) {
        console.warn(`TIGERweb layer ${idx} error:`, data.error.message);
        continue;
      }
      if (data.type === "FeatureCollection" && data.features?.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn(`TIGERweb layer ${idx} fetch failed:`, e);
      continue;
    }
  }

  return { type: "FeatureCollection", features: [] };
}

export async function fetchDistrictData(): Promise<Record<DistrictLayer, GeoJSON.FeatureCollection>> {
  const [congressional, dataA, dataB] = await Promise.all([
    fetchCongressional(),
    fetchTIGERweb("upper"),
    fetchTIGERweb("lower"),
  ]);

  // Nevada has 21 Senate and 42 Assembly districts. Auto-detect which is which.
  let senate = dataA;
  let assembly = dataB;
  if (dataA.features.length === 42 && dataB.features.length === 21) {
    senate = dataB;
    assembly = dataA;
  }

  console.log("District data loaded:", {
    congressional: congressional.features.length,
    senate: senate.features.length,
    assembly: assembly.features.length,
  });

  return { congressional, "state-senate": senate, "state-assembly": assembly };
}

export const NEVADA_CENTER: [number, number] = [38.8, -116.4];
export const NEVADA_ZOOM = 7;
