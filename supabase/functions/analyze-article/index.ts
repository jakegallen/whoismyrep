import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json();

    // Support both legacy fields and new politician-context fields
    const {
      title,
      summary,
      category,
      // New structured context fields
      politicianName,
      party,
      office,
      state,
      level,
      chamber,
      inOfficeSince,
      committees,
      recentBills,
      votingSummary,
    } = body;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Build rich context from structured data if available
    const name = politicianName || title?.replace(/\s*—.*/, '') || 'Unknown';
    const contextParts: string[] = [];

    contextParts.push(`Politician: ${name}`);
    if (party) contextParts.push(`Party: ${party}`);
    if (office) contextParts.push(`Office: ${office}`);
    if (state) contextParts.push(`State: ${state}`);
    if (level) contextParts.push(`Level: ${level}`);
    if (chamber) contextParts.push(`Chamber: ${chamber}`);
    if (inOfficeSince) contextParts.push(`In office since: ${inOfficeSince}`);
    if (summary) contextParts.push(`Bio: ${summary}`);

    if (committees && committees.length > 0) {
      contextParts.push(`Committee memberships: ${committees.slice(0, 8).join(', ')}`);
    }
    if (recentBills && recentBills.length > 0) {
      const billList = recentBills.slice(0, 5).map((b: any) =>
        typeof b === 'string' ? b : `${b.identifier || b.id}: ${b.title || ''}`
      ).join('; ');
      contextParts.push(`Recent bills: ${billList}`);
    }
    if (votingSummary) {
      const vs = votingSummary;
      contextParts.push(
        `Voting record (${vs.session || 'current session'}): ${vs.totalVotes || 0} total votes, ` +
        `${vs.yesVotes || 0} yes, ${vs.noVotes || 0} no, ` +
        `${vs.attendance || 0}% attendance, ${vs.partyLineRate || 0}% majority alignment`
      );
    }

    const politicianContext = contextParts.join('\n');

    console.log(`Generating analysis for ${name} (${level}/${state})`);

    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a nonpartisan U.S. political analyst writing a concise profile overview for a civic transparency platform. Given structured data about a legislator, produce a helpful, data-driven analysis in markdown.

Structure your response with these sections:

## At a Glance
A brief 2-3 sentence overview of who this legislator is, their role, and what they're known for.

## Legislative Focus
Based on their committee assignments and recent bills, what policy areas does this legislator prioritize? (2-3 short paragraphs)

## Voting Patterns
Analyze their voting record data. What does their attendance and majority-alignment rate suggest about their legislative style? Are they an independent voice or do they tend to vote with the majority? (1-2 paragraphs)

## Key Issues to Watch
3-4 bullet points on current political dynamics relevant to this legislator — upcoming elections, major legislation in their committees, or regional issues.

IMPORTANT RULES:
- Be factual and balanced. Do NOT editorialize or express personal opinions.
- If you don't have data for a section, write a brief note like "No committee data available" rather than inventing information.
- Do NOT fabricate specific vote counts, bill numbers, or quotes.
- Keep the total response under 500 words.
- Use present tense for current roles, past tense for historical facts.`,
          },
          {
            role: 'user',
            content: `Generate a profile analysis for this legislator:\n\n${politicianContext}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again shortly.' }),
          { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted.' }),
          { status: 402, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiResp.text();
      console.error('AI error:', aiResp.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate analysis' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResp.json();
    const analysis = aiData.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
