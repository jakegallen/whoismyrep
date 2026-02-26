const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type = 'all', search, page = 1, per_page = 20 } = await req.json().catch(() => ({}));

    const params = new URLSearchParams({
      per_page: String(per_page),
      page: String(page),
      order: 'newest',
    });

    // Filter by document type
    if (type === 'executive_orders') {
      params.append('conditions[type][]', 'PRESDOCU');
      params.append('conditions[presidential_document_type][]', 'executive_order');
    } else if (type === 'rules') {
      params.append('conditions[type][]', 'RULE');
    } else if (type === 'proposed_rules') {
      params.append('conditions[type][]', 'PRORULE');
    } else if (type === 'notices') {
      params.append('conditions[type][]', 'NOTICE');
    }

    // Always filter for Nevada-related content
    const searchTerms = ['Nevada', search].filter(Boolean).join(' ');
    if (searchTerms) {
      params.set('conditions[term]', searchTerms);
    }

    const url = `https://www.federalregister.gov/api/v1/documents.json?${params}`;
    console.log('Fetching Federal Register:', url);

    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`Federal Register API error: ${resp.status} ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Federal Register API error: ${resp.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();
    const results = data.results || [];

    const documents = results.map((doc: any) => {
      let docType = 'Notice';
      if (doc.type === 'Presidential Document') docType = 'Executive Order';
      else if (doc.type === 'Rule') docType = 'Final Rule';
      else if (doc.type === 'Proposed Rule') docType = 'Proposed Rule';
      else if (doc.type === 'Notice') docType = 'Notice';

      return {
        id: doc.document_number || '',
        title: doc.title || '',
        type: docType,
        abstract: doc.abstract || '',
        publicationDate: doc.publication_date || '',
        agencies: (doc.agencies || []).map((a: any) => a.name).filter(Boolean),
        url: doc.html_url || '',
        pdfUrl: doc.pdf_url || '',
        citation: doc.citation || '',
        documentNumber: doc.document_number || '',
        signingDate: doc.signing_date || '',
        president: doc.president?.name || '',
        significantDocument: doc.significant || false,
        topics: doc.topics || [],
        subtype: doc.subtype || '',
      };
    });

    console.log(`Fetched ${documents.length} Federal Register documents (page ${page})`);

    return new Response(
      JSON.stringify({
        success: true,
        documents,
        total: data.count || documents.length,
        page: page,
        totalPages: Math.ceil((data.count || 1) / per_page),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching Federal Register:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch documents' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
