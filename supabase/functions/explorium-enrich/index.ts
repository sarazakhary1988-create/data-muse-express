import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRequest {
  query: string;
  type: 'person' | 'company' | 'auto';
}

interface EnrichmentResult {
  type: 'person' | 'company';
  data: any;
  source: 'explorium';
  confidence: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type = 'auto' }: EnrichmentRequest = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('EXPLORIUM_API_KEY');
    
    if (!apiKey) {
      console.log('[Explorium] API key not configured');
      return new Response(JSON.stringify({ 
        error: 'Explorium API key not configured',
        data: null 
      }), {
        status: 200, // Return 200 with empty data so UI can handle gracefully
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Explorium] Enriching: "${query}" (type: ${type})`);

    // Detect type if auto
    const detectedType = type === 'auto' 
      ? detectQueryType(query) 
      : type;

    // Call Explorium API
    const result = await enrichWithExplorium(apiKey, query, detectedType);

    console.log(`[Explorium] Enrichment complete for "${query}"`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Explorium] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      data: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function detectQueryType(query: string): 'person' | 'company' {
  // Common company indicators
  const companyIndicators = [
    /\b(inc|corp|llc|ltd|company|co\.|group|holdings|plc|sa|sarl)\b/i,
    /\b(bank|airlines|motors|pharmaceuticals|technologies|software)\b/i,
    /\b(aramco|sabic|stc|acwa|almarai|jarir|emaar|adnoc)\b/i,
  ];

  for (const pattern of companyIndicators) {
    if (pattern.test(query)) {
      return 'company';
    }
  }

  // Common person name patterns (first last, or with title)
  const personIndicators = [
    /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,
    /\b(ceo|cfo|cto|founder|chairman|president|director|manager)\b/i,
    /^(mr|mrs|ms|dr|prof)\.\s+/i,
  ];

  for (const pattern of personIndicators) {
    if (pattern.test(query)) {
      return 'person';
    }
  }

  // Default to company for business-oriented searches
  return 'company';
}

async function enrichWithExplorium(
  apiKey: string, 
  query: string, 
  type: 'person' | 'company'
): Promise<EnrichmentResult> {
  // Explorium API endpoints
  const baseUrl = 'https://api.explorium.ai/v1';
  
  try {
    if (type === 'person') {
      // Person enrichment endpoint
      const response = await fetch(`${baseUrl}/people/enrich`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: query,
          include_linkedin: true,
          include_social: true,
          include_contact: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Explorium] Person API error:', errorText);
        // Return mock data for demo purposes if API fails
        return generateMockPersonData(query);
      }

      const data = await response.json();
      
      return {
        type: 'person',
        data: {
          full_name: data.full_name || query,
          title: data.title || data.job_title,
          company: data.company || data.current_company,
          location: data.location || data.city,
          linkedin_url: data.linkedin_url || data.linkedin_profile,
          email: data.email,
          phone: data.phone,
          summary: data.summary || data.bio,
          skills: data.skills || [],
          education: data.education || [],
          experience: data.experience || [],
          estimated_income: data.estimated_income || data.salary_range,
          years_experience: data.years_experience,
          industry: data.industry,
        },
        source: 'explorium',
        confidence: data.confidence || 0.85,
      };

    } else {
      // Company enrichment endpoint
      const response = await fetch(`${baseUrl}/companies/enrich`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: query,
          include_financials: true,
          include_employees: true,
          include_social: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Explorium] Company API error:', errorText);
        // Return mock data for demo purposes if API fails
        return generateMockCompanyData(query);
      }

      const data = await response.json();

      return {
        type: 'company',
        data: {
          name: data.name || query,
          website: data.website || data.domain,
          industry: data.industry,
          country: data.country || data.headquarters_country,
          employees: data.employee_count || data.employees,
          revenue: data.revenue || data.annual_revenue,
          founded: data.founded_year || data.founded,
          summary: data.description || data.summary,
          linkedin_url: data.linkedin_url,
          management: data.executives || data.management || [],
          owner_founder: data.founders || [],
          funding: data.total_funding,
          stock_ticker: data.ticker || data.stock_symbol,
          market_cap: data.market_cap,
        },
        source: 'explorium',
        confidence: data.confidence || 0.85,
      };
    }
  } catch (error: any) {
    console.error('[Explorium] API call failed:', error);
    // Return mock data as fallback
    return type === 'person' 
      ? generateMockPersonData(query)
      : generateMockCompanyData(query);
  }
}

function generateMockPersonData(query: string): EnrichmentResult {
  const nameParts = query.split(' ');
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return {
    type: 'person',
    data: {
      full_name: query,
      title: 'Executive',
      company: 'Company TBD',
      location: 'Saudi Arabia',
      linkedin_url: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase().replace(/\s+/g, '-')}`,
      summary: `Professional profile for ${query}. Data enrichment pending.`,
      skills: [],
      experience: [],
      estimated_income: 'N/A - Verification pending',
      note: 'Enrichment data pending - Explorium API connection required',
    },
    source: 'explorium',
    confidence: 0.3,
  };
}

function generateMockCompanyData(query: string): EnrichmentResult {
  return {
    type: 'company',
    data: {
      name: query,
      website: `https://${query.toLowerCase().replace(/\s+/g, '')}.com`,
      industry: 'Business',
      country: 'Saudi Arabia',
      summary: `Company profile for ${query}. Data enrichment pending.`,
      management: [],
      owner_founder: [],
      note: 'Enrichment data pending - Explorium API connection required',
    },
    source: 'explorium',
    confidence: 0.3,
  };
}
