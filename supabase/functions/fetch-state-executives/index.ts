import { getCorsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

/**
 * Fetch governors, mayors, and other executive officials for a given state.
 * Reuses the same OpenStates GitHub YAML data as search-politicians, but
 * filters to a single state and returns all executives instead of searching.
 *
 * Body: { stateAbbr: "nv" }
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface ExecutiveEntry {
  id: string;
  name: string;
  title: string;
  party: string;
  state: string;
  level: "state" | "local";
  website?: string;
}

// ── YAML parser (minimal, matches search-politicians) ────────────────────────

function parsePersonYaml(text: string): {
  id: string;
  name: string;
  partyName: string;
  roleType: string;
  roleEndDate: string;
  website: string;
} {
  let id = "";
  let name = "";
  let partyName = "";
  let roleType = "";
  let roleEndDate = "";
  let website = "";
  let section = "";

  for (const raw of text.split("\n")) {
    const t = raw.trimEnd();

    if (/^id:\s/.test(t)) {
      const m = t.match(/^id:\s*(.+)/);
      if (m) id = m[1].trim().replace(/^['"]|['"]$/g, "");
      continue;
    }
    if (/^name:\s/.test(t)) {
      const m = t.match(/^name:\s*(.+)/);
      if (m) name = m[1].trim().replace(/^['"]|['"]$/g, "");
      continue;
    }

    if (/^party:/.test(t)) {
      section = "party";
      continue;
    }
    if (/^roles:/.test(t)) {
      section = "roles";
      continue;
    }
    if (/^links:/.test(t)) {
      section = "links";
      continue;
    }
    if (/^[a-z]/.test(t) && !/^\s/.test(t)) {
      section = "";
    }

    if (section === "party" && !partyName) {
      const m = t.match(/^\s+-\s*name:\s*(.+)/);
      if (m) partyName = m[1].trim().replace(/^['"]|['"]$/g, "");
    }
    if (section === "roles") {
      if (!roleType) {
        const m = t.match(/^\s+type:\s*(.+)/);
        if (m) roleType = m[1].trim().replace(/^['"]|['"]$/g, "");
      }
      if (!roleEndDate) {
        const m = t.match(/^\s+end_date:\s*(.+)/);
        if (m) roleEndDate = m[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
    if (section === "links" && !website) {
      const m = t.match(/^\s+-\s*url:\s*(.+)/);
      if (m) website = m[1].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return { id, name, partyName, roleType, roleEndDate, website };
}

const ROLE_TITLE_MAP: Record<string, string> = {
  governor: "Governor",
  lt_governor: "Lt. Governor",
  lieutenant_governor: "Lt. Governor",
  secretary_of_state: "Secretary of State",
  attorney_general: "Attorney General",
  treasurer: "State Treasurer",
  state_treasurer: "State Treasurer",
  comptroller: "State Comptroller",
  auditor: "State Auditor",
  superintendent: "Superintendent",
  commissioner_of_agriculture: "Commissioner of Agriculture",
  mayor: "Mayor",
  councilmember: "City Council Member",
  council_member: "City Council Member",
  alderman: "Alderman",
  commissioner: "Commissioner",
};

function normalizeParty(raw: string): string {
  const l = raw.toLowerCase();
  if (l.includes("democrat")) return "Democrat";
  if (l.includes("republican")) return "Republican";
  if (l.includes("independent") || l.includes("nonpartisan") || l === "")
    return "Independent";
  return raw || "Unknown";
}

// ── Cache per state (15 min) ─────────────────────────────────────────────────

const CACHE_TTL = 15 * 60 * 1000;
const stateCache = new Map<string, { entries: ExecutiveEntry[]; ts: number }>();

async function fetchExecutivesForState(
  stateAbbr: string
): Promise<ExecutiveEntry[]> {
  const cached = stateCache.get(stateAbbr);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.entries;

  const lower = stateAbbr.toLowerCase();

  // Fetch the GitHub tree to find YAML files for this state's executive + municipalities
  const treeResp = await fetch(
    "https://api.github.com/repos/openstates/people/git/trees/main?recursive=1",
    {
      headers: {
        "User-Agent": "whoismyrep-executives",
        Accept: "application/json",
      },
    }
  );

  if (!treeResp.ok) {
    console.warn(`GitHub Trees API returned ${treeResp.status}`);
    stateCache.set(stateAbbr, { entries: [], ts: Date.now() });
    return [];
  }

  const treeData = await treeResp.json();
  const yamlPaths: { path: string; category: string }[] = [];

  for (const item of treeData.tree || []) {
    if (item.type !== "blob" || !item.path.endsWith(".yml")) continue;
    const m = item.path.match(
      new RegExp(`^data/${lower}/(executive|municipalities)/.+\\.yml$`)
    );
    if (m) yamlPaths.push({ path: item.path, category: m[1] });
  }

  console.log(
    `[${stateAbbr}] Found ${yamlPaths.length} executive/municipality YAML paths`
  );

  const entries: ExecutiveEntry[] = [];
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  // Fetch all YAML files in parallel batches of 10
  const BATCH = 10;
  for (let i = 0; i < yamlPaths.length; i += BATCH) {
    const batch = yamlPaths.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async ({ path, category }) => {
        const resp = await fetch(
          `https://raw.githubusercontent.com/openstates/people/main/${path}`
        );
        if (!resp.ok) return null;
        const text = await resp.text();
        return { text, category };
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const { text, category } = r.value;
      const person = parsePersonYaml(text);
      if (!person.name) continue;

      // Skip officials whose role ended more than 1 year ago
      if (person.roleEndDate && person.roleEndDate < cutoffDate) continue;

      const title =
        ROLE_TITLE_MAP[person.roleType] ||
        (category === "executive" ? "State Official" : "Local Official");
      const party = normalizeParty(person.partyName);

      entries.push({
        id: person.id || `${category}-${lower}-${person.name}`,
        name: person.name,
        title,
        party,
        state: stateAbbr.toUpperCase(),
        level: category === "municipalities" ? "local" : "state",
        website: person.website || undefined,
      });
    }
  }

  // Sort: Governor first, then Lt. Governor, then by title alphabetically
  const TITLE_ORDER: Record<string, number> = {
    Governor: 0,
    "Lt. Governor": 1,
    "Attorney General": 2,
    "Secretary of State": 3,
    Mayor: 4,
  };
  entries.sort((a, b) => {
    const oa = TITLE_ORDER[a.title] ?? 50;
    const ob = TITLE_ORDER[b.title] ?? 50;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });

  stateCache.set(stateAbbr, { entries, ts: Date.now() });
  console.log(`[${stateAbbr}] Built executives list: ${entries.length} officials`);
  return entries;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const { stateAbbr } = await req.json().catch(() => ({} as any));

    if (!stateAbbr || typeof stateAbbr !== "string" || stateAbbr.length !== 2) {
      return jsonResponse(
        { success: false, error: "stateAbbr is required (2-letter code)" },
        req,
        { status: 400, cache: false }
      );
    }

    const executives = await fetchExecutivesForState(stateAbbr);
    return jsonResponse({ success: true, executives }, req, { maxAge: 900 });
  } catch (err) {
    console.error("fetch-state-executives error:", err);
    return jsonResponse(
      { success: false, error: "Internal error" },
      req,
      { status: 500, cache: false }
    );
  }
});
