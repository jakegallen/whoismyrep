import { getCorsHeaders, handleCors, withCache } from "../_shared/cors.ts";

export interface PoliticianSuggestion {
  id: string;
  name: string;
  title: string;
  party: string;
  state: string;
  level: 'federal' | 'state' | 'local';
  bioguideId?: string;
  website?: string;
}

// ── State abbreviations & name mappings ──────────────────────────────────────

const ALL_STATES = [
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia',
  'ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj',
  'nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt',
  'va','wa','wv','wi','wy','dc',
];

const ABBR_TO_NAME: Record<string, string> = {
  al: 'Alabama', ak: 'Alaska', az: 'Arizona', ar: 'Arkansas', ca: 'California',
  co: 'Colorado', ct: 'Connecticut', de: 'Delaware', fl: 'Florida', ga: 'Georgia',
  hi: 'Hawaii', id: 'Idaho', il: 'Illinois', in: 'Indiana', ia: 'Iowa',
  ks: 'Kansas', ky: 'Kentucky', la: 'Louisiana', me: 'Maine', md: 'Maryland',
  ma: 'Massachusetts', mi: 'Michigan', mn: 'Minnesota', ms: 'Mississippi',
  mo: 'Missouri', mt: 'Montana', ne: 'Nebraska', nv: 'Nevada', nh: 'New Hampshire',
  nj: 'New Jersey', nm: 'New Mexico', ny: 'New York', nc: 'North Carolina',
  nd: 'North Dakota', oh: 'Ohio', ok: 'Oklahoma', or: 'Oregon', pa: 'Pennsylvania',
  ri: 'Rhode Island', sc: 'South Carolina', sd: 'South Dakota', tn: 'Tennessee',
  tx: 'Texas', ut: 'Utah', vt: 'Vermont', va: 'Virginia', wa: 'Washington',
  wv: 'West Virginia', wi: 'Wisconsin', wy: 'Wyoming', dc: 'District of Columbia',
};

// ── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += '"';
      }
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // skip CR
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);
  if (lines.length === 0) return [];

  const header = splitCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = vals[j] || '';
    }
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Aggregated state legislator index (all 50 states) ────────────────────────

interface StateLegislatorEntry {
  id: string;
  name: string;
  nameLower: string;
  title: string;
  party: string;
  state: string;
  website?: string;
}

let allStateLegislatorsCache: { entries: StateLegislatorEntry[]; ts: number } | null = null;
const STATE_CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchStateCSV(stateAbbr: string): Promise<Record<string, string>[]> {
  const url = `https://data.openstates.org/people/current/${stateAbbr}.csv`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const text = await resp.text();
  return parseCSV(text);
}

function csvRowToSuggestion(r: Record<string, string>, stateAbbr: string): StateLegislatorEntry {
  const chamber = r.current_chamber;
  const title = chamber === 'upper' ? 'State Senator' : 'State Representative';
  const party = normalizeParty(r.current_party || '');
  const stateName = ABBR_TO_NAME[stateAbbr] || stateAbbr.toUpperCase();

  let website: string | undefined;
  const links = (r.links || '').split(';').map(l => l.trim()).filter(Boolean);
  if (links.length > 0) {
    website = links.find(l => l.includes('.gov')) || links[0];
  }

  return {
    id: r.id || `state-${stateAbbr}-${r.name}`,
    name: r.name || '',
    nameLower: (r.name || '').toLowerCase(),
    title,
    party,
    state: stateName,
    website,
  };
}

async function getAllStateLegislators(): Promise<StateLegislatorEntry[]> {
  if (allStateLegislatorsCache && Date.now() - allStateLegislatorsCache.ts < STATE_CACHE_TTL) {
    console.log(`State legislator cache hit (${allStateLegislatorsCache.entries.length} entries)`);
    return allStateLegislatorsCache.entries;
  }

  console.log('Fetching all state CSVs for legislator index...');
  const t0 = Date.now();

  const entries: StateLegislatorEntry[] = [];
  let stateCount = 0;

  // Fetch in batches of 6 to avoid overwhelming worker resources
  const BATCH_SIZE = 6;
  for (let i = 0; i < ALL_STATES.length; i += BATCH_SIZE) {
    const batch = ALL_STATES.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (abbr) => {
        const rows = await fetchStateCSV(abbr);
        return { abbr, rows };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { abbr, rows } = result.value;
        if (rows.length > 0) stateCount++;
        for (const r of rows) {
          entries.push(csvRowToSuggestion(r, abbr));
        }
      }
    }
  }

  allStateLegislatorsCache = { entries, ts: Date.now() };
  console.log(`Built state legislator index: ${entries.length} legislators from ${stateCount} states in ${Date.now() - t0}ms`);
  return entries;
}

// ── YAML person-file parser (for openstates/people GitHub repo) ──────────────

interface ParsedPerson {
  id: string;
  name: string;
  partyName: string;
  roleType: string;
  roleEndDate: string;
  website: string;
}

function parsePersonYaml(text: string): ParsedPerson {
  let id = '', name = '', partyName = '', roleType = '', roleEndDate = '', website = '';
  const lines = text.split('\n');
  let section = '';

  for (const raw of lines) {
    const t = raw.trimEnd();

    const idM = t.match(/^id:\s*(.+)/);
    if (idM) { id = idM[1].trim().replace(/^['"]|['"]$/g, ''); continue; }

    const nameM = t.match(/^name:\s*(.+)/);
    if (nameM && !name) { name = nameM[1].trim().replace(/^['"]|['"]$/g, ''); continue; }

    if (t === 'party:')  { section = 'party';  continue; }
    if (t === 'roles:')  { section = 'roles';  continue; }
    if (t === 'links:')  { section = 'links';  continue; }
    if (/^[a-z_]+:/.test(t) && !t.startsWith(' ') && !t.startsWith('-')) { section = ''; continue; }

    if (section === 'party' && !partyName) {
      const m = t.match(/^\s*-\s*name:\s*(.+)/);
      if (m) partyName = m[1].trim().replace(/^['"]|['"]$/g, '');
    }
    if (section === 'roles') {
      if (!roleType) {
        const m = t.match(/^\s*-?\s*type:\s*(.+)/);
        if (m) roleType = m[1].trim().replace(/^['"]|['"]$/g, '');
      }
      if (!roleEndDate) {
        const m = t.match(/^\s*-?\s*end_date:\s*(.+)/);
        if (m) roleEndDate = m[1].trim().replace(/^['"]|['"]$/g, '');
      }
    }
    if (section === 'links' && !website) {
      const m = t.match(/^\s+-\s*url:\s*(.+)/);
      if (m) website = m[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return { id, name, partyName, roleType, roleEndDate, website };
}

const ROLE_TITLE_MAP: Record<string, string> = {
  governor: 'Governor',
  lt_governor: 'Lt. Governor',
  lieutenant_governor: 'Lt. Governor',
  secretary_of_state: 'Secretary of State',
  attorney_general: 'Attorney General',
  treasurer: 'State Treasurer',
  state_treasurer: 'State Treasurer',
  comptroller: 'State Comptroller',
  auditor: 'State Auditor',
  superintendent: 'Superintendent',
  commissioner_of_agriculture: 'Commissioner of Agriculture',
  mayor: 'Mayor',
  councilmember: 'City Council Member',
  council_member: 'City Council Member',
  alderman: 'Alderman',
  commissioner: 'Commissioner',
};

// ── Governors, executives & municipal officials (GitHub YAML) ────────────────

interface ExecutiveEntry {
  id: string;
  name: string;
  nameLower: string;
  title: string;
  party: string;
  state: string;
  level: 'state' | 'local';
  website?: string;
}

let executivesCache: { entries: ExecutiveEntry[]; ts: number } | null = null;

async function getAllExecutivesAndMunicipals(): Promise<ExecutiveEntry[]> {
  if (executivesCache && Date.now() - executivesCache.ts < STATE_CACHE_TTL) {
    console.log(`Executives cache hit (${executivesCache.entries.length} entries)`);
    return executivesCache.entries;
  }

  console.log('Fetching GitHub tree for executives/municipalities...');
  const t0 = Date.now();

  try {
    const treeResp = await fetch(
      'https://api.github.com/repos/openstates/people/git/trees/main?recursive=1',
      { headers: { 'User-Agent': 'whoismyrep-search', Accept: 'application/json' } }
    );
    if (!treeResp.ok) {
      console.warn(`GitHub Trees API returned ${treeResp.status}`);
      executivesCache = { entries: [], ts: Date.now() };
      return [];
    }
    const treeData = await treeResp.json();
    if (treeData.truncated) {
      console.warn('GitHub tree was truncated — some officials may be missing');
    }

    const yamlItems: { path: string; stateAbbr: string; category: string }[] = [];
    for (const item of (treeData.tree || [])) {
      if (item.type !== 'blob' || !item.path.endsWith('.yml')) continue;
      const m = item.path.match(/^data\/([a-z]{2})\/(executive|municipalities)\/.+\.yml$/);
      if (m) yamlItems.push({ path: item.path, stateAbbr: m[1], category: m[2] });
    }
    console.log(`Found ${yamlItems.length} executive/municipality YAML paths`);

    const entries: ExecutiveEntry[] = [];
    const BATCH = 15;
    // Use a 1-year grace period for end_date filtering — OpenStates data can be stale
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    for (let i = 0; i < yamlItems.length; i += BATCH) {
      const batch = yamlItems.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async ({ path, stateAbbr, category }) => {
          const resp = await fetch(
            `https://raw.githubusercontent.com/openstates/people/main/${path}`
          );
          if (!resp.ok) return null;
          const text = await resp.text();
          return { text, stateAbbr, category };
        })
      );

      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        const { text, stateAbbr, category } = r.value;
        const person = parsePersonYaml(text);
        if (!person.name) continue;

        // Skip officials whose role ended more than 1 year ago
        if (person.roleEndDate && person.roleEndDate < cutoffDate) continue;

        const title = ROLE_TITLE_MAP[person.roleType]
          || (category === 'executive' ? 'State Official' : 'Local Official');
        const party = normalizeParty(person.partyName);
        const stateName = ABBR_TO_NAME[stateAbbr] || stateAbbr.toUpperCase();

        entries.push({
          id: person.id || `${category}-${stateAbbr}-${person.name}`,
          name: person.name,
          nameLower: person.name.toLowerCase(),
          title,
          party,
          state: stateName,
          level: category === 'municipalities' ? 'local' : 'state',
          website: person.website || undefined,
        });
      }
    }

    executivesCache = { entries, ts: Date.now() };
    console.log(`Built executives index: ${entries.length} officials in ${Date.now() - t0}ms`);
    return entries;
  } catch (e) {
    console.warn('Failed to build executives index:', e);
    executivesCache = { entries: [], ts: Date.now() };
    return [];
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const { query } = await req.json().catch(() => ({}));

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [] }),
        { headers: withCache({ ...getCorsHeaders(req), 'Content-Type': 'application/json' }) }
      );
    }

    const q = query.trim();
    const suggestions: PoliticianSuggestion[] = [];

    const congressKey = Deno.env.get('CONGRESS_API_KEY');

    // ── Fire all data sources in parallel ────────────────────────────────────
    const stateLegislatorsPromise = getAllStateLegislators();
    const executivesPromise = getAllExecutivesAndMunicipals();

    // ── 1. Congress.gov members (federal) ──────────────────────────────────
    if (congressKey) {
      try {
        const fetchPage = async (offset: number): Promise<any[]> => {
          const params = new URLSearchParams({
            'currentMember': 'true',
            'limit': '250',
            'offset': String(offset),
            'format': 'json',
            'api_key': congressKey,
          });
          const resp = await fetch(
            `https://api.congress.gov/v3/member?${params}`,
            { headers: { Accept: 'application/json' } }
          );
          if (!resp.ok) return [];
          const data = await resp.json();
          return data.members || [];
        };

        // Fetch two pages in parallel — covers all ~535 current members
        const [page0, page1] = await Promise.all([fetchPage(0), fetchPage(250)]);
        const allMembers = [...page0, ...page1];

        // Filter by name (Congress.gov stores as "LastName, FirstName")
        const qLower = q.toLowerCase();
        const matches = allMembers.filter((m) => {
          const raw = (m.name || '').toLowerCase();
          const formatted = formatName(m.name || '').toLowerCase();
          return raw.includes(qLower) || formatted.includes(qLower);
        });

        for (const m of matches.slice(0, 8)) {
          const lastTerm = (m.terms?.item || []).at(-1);
          const chamber = lastTerm?.chamber || '';
          const title = chamber.toLowerCase().includes('senate') ? 'Senator' : 'Representative';
          suggestions.push({
            id: `congress-${m.bioguideId}`,
            name: formatName(m.name || ''),
            title,
            party: normalizeParty(m.partyName || ''),
            state: m.state || '',
            level: 'federal',
            bioguideId: m.bioguideId || undefined,
            website: m.url || undefined,
          });
        }
      } catch (e) {
        console.warn('Congress.gov search error:', e);
      }
    }

    // ── 2. Governors, executives & municipal officials (GitHub YAML) ────────
    try {
      const allExecutives = await executivesPromise;
      const qLower2 = q.toLowerCase();
      const execMatches = allExecutives.filter(
        (entry) => entry.nameLower.includes(qLower2)
      );
      for (const entry of execMatches.slice(0, 8)) {
        suggestions.push({
          id: entry.id,
          name: entry.name,
          title: entry.title,
          party: entry.party,
          state: entry.state,
          level: entry.level,
          website: entry.website,
        });
      }
    } catch (e) {
      console.warn('Executive/municipal search error:', e);
    }

    // ── 3. Search state legislators from cached CSV index ──────────────────
    try {
      const allStateLegislators = await stateLegislatorsPromise;
      const qLower = q.toLowerCase();

      const stateMatches = allStateLegislators.filter(
        (entry) => entry.nameLower.includes(qLower)
      );

      for (const entry of stateMatches.slice(0, 8)) {
        suggestions.push({
          id: `state-${entry.id}`,
          name: entry.name,
          title: entry.title,
          party: entry.party,
          state: entry.state,
          level: 'state',
          website: entry.website,
        });
      }
    } catch (e) {
      console.warn('State legislator CSV search error:', e);
    }

    // Deduplicate by lowercased name, federal first
    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(
      JSON.stringify({ success: true, suggestions: unique.slice(0, 10) }),
      { headers: withCache({ ...getCorsHeaders(req), 'Content-Type': 'application/json' }) }
    );
  } catch (err) {
    console.error('search-politicians error:', err);
    return new Response(
      JSON.stringify({ success: false, suggestions: [], error: String(err) }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});

// "Pelosi, Nancy" → "Nancy Pelosi"
function formatName(raw: string): string {
  if (!raw.includes(',')) return raw;
  const [last, first] = raw.split(',').map((s) => s.trim());
  return first ? `${first} ${last}` : last;
}

function normalizeParty(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes('democrat')) return 'Democrat';
  if (r.includes('republican')) return 'Republican';
  if (r.includes('independent')) return 'Independent';
  return raw;
}
