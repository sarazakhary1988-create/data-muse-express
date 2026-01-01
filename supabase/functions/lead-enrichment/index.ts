import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PersonEnrichmentRequest {
  type: 'person';
  firstName?: string;
  lastName?: string;
  company?: string;
  country?: string;
  linkedinUrl?: string;
  email?: string;
  reportType: 'full' | 'executive' | 'sales' | 'hr';
}

interface CompanyEnrichmentRequest {
  type: 'company';
  companyName: string;
  industry?: string;
  country?: string;
  website?: string;
  reportType: 'full' | 'executive' | 'sales' | 'hr';
}

type EnrichmentRequest = PersonEnrichmentRequest | CompanyEnrichmentRequest;

interface EnrichmentResult {
  success: boolean;
  data?: {
    name: string;
    type: 'person' | 'company';
    // Person fields
    title?: string;
    company?: string;
    linkedinUrl?: string;
    email?: string;
    phone?: string;
    education?: string[];
    experience?: Array<{ title: string; company: string; duration: string }>;
    skills?: string[];
    // Company fields
    industry?: string;
    location?: string;
    website?: string;
    employees?: string;
    revenue?: string;
    founded?: string;
    // Shared fields
    overview: string;
    financials?: {
      revenue?: string;
      funding?: string;
      valuation?: string;
      investors?: string[];
    };
    leadership?: Array<{
      name: string;
      title: string;
      background?: string;
    }>;
    boardMembers?: Array<{
      name: string;
      title?: string;
      otherRoles?: string;
    }>;
    keyFacts: string[];
    recentNews?: string[];
    sources: Array<{ title: string; url: string }>;
  };
  error?: string;
}

// Perform web search
async function searchWeb(query: string, maxResults: number = 10): Promise<any[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/web-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        query,
        maxResults,
        searchEngine: 'all',
        scrapeContent: true,
      }),
    });
    
    if (!response.ok) {
      console.error('[lead-enrichment] Web search failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[lead-enrichment] Web search error:', error);
    return [];
  }
}

// Scrape specific URL
async function scrapeUrl(url: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/research-scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
    });
    
    if (!response.ok) return '';
    const data = await response.json();
    return data.data?.markdown || '';
  } catch {
    return '';
  }
}

// Build search queries for comprehensive research
function buildSearchQueries(request: EnrichmentRequest): string[] {
  const queries: string[] = [];
  
  if (request.type === 'person') {
    const fullName = `${request.firstName || ''} ${request.lastName || ''}`.trim();
    
    if (request.linkedinUrl) {
      queries.push(`"${fullName}" LinkedIn profile`);
    }
    
    if (fullName) {
      queries.push(`"${fullName}" ${request.company || ''} professional profile`);
      queries.push(`"${fullName}" ${request.company || ''} executive biography`);
      queries.push(`"${fullName}" career background experience`);
    }
    
    if (request.company) {
      queries.push(`${request.company} ${fullName} announcement news`);
    }
  } else {
    const company = request.companyName;
    
    // Company overview and general info
    queries.push(`"${company}" company overview about profile`);
    
    // Financial information
    queries.push(`"${company}" revenue funding valuation financials`);
    
    // Leadership and founders
    queries.push(`"${company}" founder CEO executives leadership team`);
    queries.push(`"${company}" board members directors`);
    
    // If website provided, we'll scrape it directly
    if (request.website) {
      queries.push(`site:${request.website} about leadership team`);
    }
    
    // Industry-specific
    if (request.industry) {
      queries.push(`"${company}" ${request.industry} market position competitors`);
    }
    
    // Location-specific
    if (request.country && request.country !== 'All Countries') {
      queries.push(`"${company}" ${request.country} office operations`);
    }
  }
  
  return queries.slice(0, 5); // Limit to 5 queries
}

// Generate the enrichment report using AI
async function generateEnrichmentReport(
  request: EnrichmentRequest,
  searchResults: any[],
  websiteContent: string
): Promise<EnrichmentResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!apiKey) {
    console.error('[lead-enrichment] LOVABLE_API_KEY not configured');
    return { success: false, error: 'AI not configured' };
  }
  
  // Combine all content
  const allContent = searchResults.map(r => 
    `Source: ${r.url}\nTitle: ${r.title}\n${r.markdown || r.description || ''}`
  ).join('\n\n---\n\n');
  
  const combinedContent = websiteContent 
    ? `Official Website Content:\n${websiteContent}\n\n---\n\nWeb Research:\n${allContent}`
    : allContent;
  
  // Build system prompt based on type
  const isCompany = request.type === 'company';
  const companyName = isCompany ? (request as CompanyEnrichmentRequest).companyName : '';
  const personName = !isCompany ? `${(request as PersonEnrichmentRequest).firstName || ''} ${(request as PersonEnrichmentRequest).lastName || ''}`.trim() : '';
  
  const systemPrompt = isCompany ? `You are an expert business intelligence analyst specializing in company research.

YOUR TASK: Generate a COMPREHENSIVE company enrichment report for "${companyName}".

CRITICAL: You MUST extract and provide the following information from the sources. Use "Not found in sources" only if truly absent.

REQUIRED DATA POINTS:
1. COMPANY OVERVIEW
   - Full legal name and trading names
   - Industry and sector
   - Headquarters location
   - Year founded
   - Company description (2-3 paragraphs)

2. FINANCIAL INFORMATION
   - Revenue (most recent)
   - Funding rounds and amounts
   - Total funding raised
   - Valuation (if available)
   - Key investors/VCs

3. LEADERSHIP & FOUNDERS
   - Founder(s): Name, background, previous companies
   - CEO: Name, background, tenure
   - Other C-suite executives
   - For each: education, previous roles, notable achievements

4. BOARD OF DIRECTORS
   - Full name of each board member
   - Their title/role on board
   - Other notable positions they hold
   - Background summary

5. KEY FACTS & METRICS
   - Employee count
   - Office locations
   - Key products/services
   - Major clients/customers
   - Recent milestones

6. RECENT NEWS
   - Latest announcements
   - Press releases
   - Major developments

OUTPUT AS JSON with this exact structure:
{
  "name": "Company Name",
  "type": "company",
  "industry": "Industry",
  "location": "HQ Location",
  "website": "URL",
  "employees": "X employees",
  "founded": "Year",
  "overview": "2-3 paragraph company description",
  "financials": {
    "revenue": "$X million/billion",
    "funding": "$X total raised",
    "valuation": "$X valuation",
    "investors": ["Investor 1", "Investor 2"]
  },
  "leadership": [
    {"name": "Founder Name", "title": "Founder & CEO", "background": "Previous experience, education"},
    {"name": "CTO Name", "title": "Chief Technology Officer", "background": "Background"}
  ],
  "boardMembers": [
    {"name": "Board Member", "title": "Independent Director", "otherRoles": "CEO at X, Board at Y"}
  ],
  "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "recentNews": ["News item 1", "News item 2"]
}` : `You are an expert talent intelligence analyst specializing in professional profile research.

YOUR TASK: Generate a COMPREHENSIVE person enrichment report for "${personName}".

CRITICAL: Extract and provide detailed information about this person from the sources.

REQUIRED DATA POINTS:
1. PROFESSIONAL PROFILE
   - Current title and company
   - Previous roles and companies (career history)
   - Years of experience
   - Key achievements

2. BACKGROUND
   - Education (degrees, institutions, years)
   - Skills and expertise areas
   - Languages spoken

3. CURRENT COMPANY
   - Company name and role
   - Time in position
   - Key responsibilities

4. SOCIAL & CONTACT
   - LinkedIn URL
   - Email (if publicly available)
   - Other public profiles

OUTPUT AS JSON with this exact structure:
{
  "name": "Full Name",
  "type": "person",
  "title": "Current Title",
  "company": "Current Company",
  "linkedinUrl": "LinkedIn URL",
  "email": "Email if available",
  "education": ["Degree, Institution, Year"],
  "experience": [
    {"title": "Previous Title", "company": "Previous Company", "duration": "2018-2022"}
  ],
  "skills": ["Skill 1", "Skill 2"],
  "overview": "2-3 paragraph professional summary",
  "keyFacts": ["Achievement 1", "Achievement 2"],
  "recentNews": ["News item if any"]
}`;

  const userPrompt = `Research Subject: ${isCompany ? companyName : personName}

Sources to analyze:
${combinedContent.slice(0, 60000)}

Extract ALL available information and generate the enrichment report. For any field truly not found, write "Not found in sources" but try to extract as much as possible.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please try again later.' };
      }
      if (response.status === 402) {
        return { success: false, error: 'AI credits exhausted. Please add credits.' };
      }
      console.error('[lead-enrichment] AI error:', response.status);
      return { success: false, error: 'AI analysis failed' };
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let parsedData: any;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      parsedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('[lead-enrichment] Failed to parse AI response:', parseError);
      // Return a basic result with the raw content
      return {
        success: true,
        data: {
          name: isCompany ? companyName : personName,
          type: request.type,
          overview: content,
          keyFacts: [],
          sources: searchResults.slice(0, 5).map(r => ({ title: r.title, url: r.url })),
        }
      };
    }
    
    // Add sources to the result
    parsedData.sources = searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url }));
    
    return { success: true, data: parsedData };
  } catch (error) {
    console.error('[lead-enrichment] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Enrichment failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request = await req.json() as EnrichmentRequest;
    
    console.log('[lead-enrichment] Starting enrichment:', request.type, request.type === 'company' ? request.companyName : `${request.firstName} ${request.lastName}`);
    
    // Build search queries
    const queries = buildSearchQueries(request);
    console.log('[lead-enrichment] Search queries:', queries);
    
    // Execute searches in parallel
    const searchPromises = queries.map(q => searchWeb(q, 8));
    const searchResultArrays = await Promise.all(searchPromises);
    
    // Combine and deduplicate results
    const allResults: any[] = [];
    const seenUrls = new Set<string>();
    for (const results of searchResultArrays) {
      for (const result of results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
        }
      }
    }
    
    console.log('[lead-enrichment] Total unique results:', allResults.length);
    
    // If company has website, scrape it for official info
    let websiteContent = '';
    if (request.type === 'company' && request.website) {
      console.log('[lead-enrichment] Scraping company website:', request.website);
      websiteContent = await scrapeUrl(request.website);
      
      // Also try about/team pages
      try {
        const aboutUrl = new URL('/about', request.website).toString();
        const teamUrl = new URL('/team', request.website).toString();
        const leadershipUrl = new URL('/leadership', request.website).toString();
        
        const [aboutContent, teamContent, leadershipContent] = await Promise.all([
          scrapeUrl(aboutUrl),
          scrapeUrl(teamUrl),
          scrapeUrl(leadershipUrl),
        ]);
        
        websiteContent += '\n\n--- About Page ---\n' + aboutContent;
        websiteContent += '\n\n--- Team Page ---\n' + teamContent;
        websiteContent += '\n\n--- Leadership Page ---\n' + leadershipContent;
      } catch {
        // Ignore errors for subpages
      }
    }
    
    // Generate enrichment report
    const result = await generateEnrichmentReport(request, allResults, websiteContent);
    
    console.log('[lead-enrichment] Enrichment complete, success:', result.success);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[lead-enrichment] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Enrichment failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
