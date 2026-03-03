import { getCorsHeaders } from "../_shared/cors.ts";

interface CommitteeMember {
  name: string;
  role: string;
}

function parseCommittees(results: any[], chamberLabel: string) {
  return results.map((org: any) => {
    const members: CommitteeMember[] = (org.memberships || []).map((m: any) => ({
      name: m.person_name || m.name || '',
      role: m.role || 'member',
    }));
    return {
      id: org.id,
      name: org.name,
      chamber: chamberLabel,
      memberCount: members.length,
      members,
    };
  });
}

// Cache for @unitedstates committee data (refreshed every 24h)
let federalCommitteeCache: { data: any; membership: any; fetchedAt: number } | null = null;
const FEDERAL_CACHE_TTL = 24 * 60 * 60 * 1000;

async function fetchFederalCommittees(bioguideId: string, legislatorName: string) {
  const now = Date.now();
  if (!federalCommitteeCache || now - federalCommitteeCache.fetchedAt > FEDERAL_CACHE_TTL) {
    const [committeesResp, membershipResp] = await Promise.all([
      fetch('https://unitedstates.github.io/congress-legislators/committees-current.json'),
      fetch('https://unitedstates.github.io/congress-legislators/committee-membership-current.json'),
    ]);
    if (!committeesResp.ok || !membershipResp.ok) {
      throw new Error('Failed to fetch federal committee data');
    }
    federalCommitteeCache = {
      data: await committeesResp.json(),
      membership: await membershipResp.json(),
      fetchedAt: now,
    };
  }

  const { data: allCommittees, membership } = federalCommitteeCache;

  // Build a lookup: committee thomas_id → committee info
  const committeeLookup: Record<string, any> = {};
  for (const c of allCommittees) {
    committeeLookup[c.thomas_id] = c;
    // Subcommittees
    for (const sub of c.subcommittees || []) {
      committeeLookup[`${c.thomas_id}${sub.thomas_id}`] = {
        ...sub,
        name: `${sub.name} (Subcommittee of ${c.name})`,
        type: c.type,
        parentName: c.name,
      };
    }
  }

  // Find all committees this member serves on
  const legislatorCommittees: string[] = [];
  const committees: any[] = [];

  for (const [committeeCode, members] of Object.entries(membership)) {
    const memberList = members as any[];
    const isMember = memberList.some(
      (m: any) => m.bioguide === bioguideId
    );
    if (!isMember) continue;

    const info = committeeLookup[committeeCode];
    if (!info) continue;

    const memberEntry = memberList.find((m: any) => m.bioguide === bioguideId);
    const chamberLabel = info.type === 'senate' ? 'Senate' : info.type === 'house' ? 'House' : 'Joint';

    const parsedMembers = memberList.map((m: any) => ({
      name: m.name || '',
      role: m.title || (m.rank === 1 ? 'Chair' : 'Member'),
    }));

    committees.push({
      id: committeeCode,
      name: info.name,
      chamber: chamberLabel,
      memberCount: memberList.length,
      members: parsedMembers,
    });

    legislatorCommittees.push(info.name);
  }

  committees.sort((a: any, b: any) => a.name.localeCompare(b.name));

  console.log(`Federal committees: ${legislatorCommittees.length} for ${legislatorName} (bioguide=${bioguideId})`);
  return { committees, legislatorCommittees };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const { chamber, legislatorName, jurisdiction, stateAbbr, level, bioguideId } = await req.json().catch(() => ({}));
    console.log(`Fetching committees. chamber=${chamber}, legislator=${legislatorName}, jurisdiction=${jurisdiction}, level=${level}, bioguideId=${bioguideId}`);

    // Federal path: use @unitedstates data
    if (level === 'federal' && bioguideId) {
      try {
        const { committees, legislatorCommittees } = await fetchFederalCommittees(bioguideId, legislatorName || '');
        return new Response(
          JSON.stringify({
            success: true,
            committees,
            legislatorCommittees,
            recentBills: [],
            session: (() => { const c = Math.floor((new Date().getFullYear() - 1789) / 2) + 1; const s = [11,12,13].includes(c%100) ? 'th' : c%10===1 ? 'st' : c%10===2 ? 'nd' : c%10===3 ? 'rd' : 'th'; return `${c}${s} Congress`; })(),
          }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.error('Federal committee fetch error:', e);
        return new Response(
          JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Failed to fetch federal committees' }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
    }

    // State path: use OpenStates
    const apiKey = Deno.env.get('OPENSTATES_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenStates API key not configured' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const headers = { 'X-API-KEY': apiKey };
    const ocdJurisdiction = stateAbbr === 'dc'
      ? 'ocd-jurisdiction/country:us/district:dc/government'
      : `ocd-jurisdiction/country:us/state:${stateAbbr.toLowerCase()}/government`;

    // Fetch committees by chamber to correctly label them
    const buildUrl = (ch?: string) => {
      const url = new URL('https://v3.openstates.org/committees');
      url.searchParams.set('jurisdiction', ocdJurisdiction);
      url.searchParams.set('per_page', '20');
      url.searchParams.set('include', 'memberships');
      if (ch) url.searchParams.set('chamber', ch);
      return url.toString();
    };

    let committees: any[] = [];

    if (chamber === 'Senate') {
      const resp = await fetch(buildUrl('upper'), { headers });
      if (resp.ok) {
        const d = await resp.json();
        committees = parseCommittees(d.results || [], 'Senate');
      } else { await resp.text(); }
    } else if (chamber === 'Assembly') {
      const resp = await fetch(buildUrl('lower'), { headers });
      if (resp.ok) {
        const d = await resp.json();
        committees = parseCommittees(d.results || [], 'Assembly');
      } else { await resp.text(); }
    } else {
      // Fetch both chambers in parallel
      const [upperResp, lowerResp] = await Promise.all([
        fetch(buildUrl('upper'), { headers }),
        fetch(buildUrl('lower'), { headers }),
      ]);

      if (upperResp.ok) {
        const d = await upperResp.json();
        committees.push(...parseCommittees(d.results || [], 'Senate'));
      } else { await upperResp.text(); }

      if (lowerResp.ok) {
        const d = await lowerResp.json();
        committees.push(...parseCommittees(d.results || [], 'Assembly'));
      } else { await lowerResp.text(); }

      // Also try without chamber param (for joint committees)
      if (!chamber || chamber === 'Joint') {
        const jointResp = await fetch(buildUrl(), { headers });
        if (jointResp.ok) {
          const d = await jointResp.json();
          const allIds = new Set(committees.map((c: any) => c.id));
          const jointOnes = parseCommittees(
            (d.results || []).filter((o: any) => !allIds.has(o.id)),
            'Joint'
          );
          committees.push(...jointOnes);
        } else { await jointResp.text(); }
      }

      // Filter to Joint only if that was requested
      if (chamber === 'Joint') {
        committees = committees.filter((c: any) => c.chamber === 'Joint');
      }
    }

    // Sort alphabetically
    committees.sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Fetch session info for bills
    const sessionsUrl = `https://v3.openstates.org/jurisdictions/${ocdJurisdiction}`;
    let currentSession = '';
    try {
      const sessResp = await fetch(sessionsUrl, { headers });
      if (sessResp.ok) {
        const sessData = await sessResp.json();
        const sessions = sessData.legislative_sessions || [];
        const sorted = sessions.sort((a: any, b: any) =>
          (b.start_date || '').localeCompare(a.start_date || '')
        );
        currentSession = sorted[0]?.identifier || '';
      } else { await sessResp.text(); }
    } catch (e) {
      console.log('Session fetch error:', e);
    }

    // Fetch recent bills with committee actions
    let recentBills: any[] = [];
    if (currentSession) {
      const billsUrl = new URL('https://v3.openstates.org/bills');
      billsUrl.searchParams.set('jurisdiction', jurisdiction);
      billsUrl.searchParams.set('session', currentSession);
      billsUrl.searchParams.set('sort', 'updated_desc');
      billsUrl.searchParams.set('per_page', '20');
      billsUrl.searchParams.set('include', 'actions');
      if (chamber === 'Senate') billsUrl.searchParams.set('chamber', 'upper');
      else if (chamber === 'Assembly') billsUrl.searchParams.set('chamber', 'lower');

      try {
        const billsResp = await fetch(billsUrl.toString(), { headers });
        if (billsResp.ok) {
          const billsData = await billsResp.json();
          recentBills = (billsData.results || []).map((bill: any) => {
            const actions = bill.actions || [];
            const committeeActions = actions.filter((a: any) =>
              a.description?.toLowerCase().includes('committee') ||
              a.description?.toLowerCase().includes('hearing') ||
              a.description?.toLowerCase().includes('referred')
            );
            const latestAction = committeeActions[committeeActions.length - 1] || actions[actions.length - 1];
            return {
              id: bill.id,
              identifier: bill.identifier,
              title: bill.title,
              chamber: bill.from_organization?.classification === 'upper' ? 'Senate' : 'Assembly',
              lastAction: latestAction?.description || '',
              lastActionDate: latestAction?.date || bill.updated_at || '',
              committeeRef: committeeActions.length > 0
                ? committeeActions[committeeActions.length - 1]?.description || ''
                : '',
            };
          });
        } else { await billsResp.text(); }
      } catch (e) {
        console.log('Bills fetch error:', e);
      }
    }

    // Find legislator's committees
    let legislatorCommittees: string[] = [];
    if (legislatorName && committees.length > 0) {
      const lastName = legislatorName.split(' ').pop()?.toLowerCase() || '';
      legislatorCommittees = committees
        .filter((c: any) =>
          c.members.some((m: any) => m.name.toLowerCase().includes(lastName))
        )
        .map((c: any) => c.name);
    }

    console.log(`Found ${committees.length} committees, ${recentBills.length} bills, session=${currentSession}`);

    return new Response(
      JSON.stringify({
        success: true,
        committees,
        legislatorCommittees,
        recentBills,
        session: currentSession,
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching committees:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch committees' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
