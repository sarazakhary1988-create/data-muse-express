import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

interface ChatEditRequest {
  type: 'chat_edit';
  currentReport: string;
  editInstruction: string;
  reportContext: {
    name: string;
    entityType: 'person' | 'company';
  };
}

type EnrichmentRequest = PersonEnrichmentRequest | CompanyEnrichmentRequest | ChatEditRequest;

// Perform web search
async function searchWeb(query: string, maxResults: number = 12): Promise<any[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  try {
    console.log(`[lead-enrichment] Searching: ${query}`);
    const response = await fetch(`${supabaseUrl}/functions/v1/research-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        query,
        limit: maxResults,
        deepScrape: true,
      }),
    });
    
    if (!response.ok) {
      console.error('[lead-enrichment] Search failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[lead-enrichment] Search error:', error);
    return [];
  }
}

// Scrape specific URL
async function scrapeUrl(url: string): Promise<{ markdown: string; links: string[] }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  try {
    console.log(`[lead-enrichment] Scraping: ${url}`);
    const response = await fetch(`${supabaseUrl}/functions/v1/research-scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
    });
    
    if (!response.ok) return { markdown: '', links: [] };
    const data = await response.json();
    return { 
      markdown: data.data?.markdown || '', 
      links: data.data?.links || [] 
    };
  } catch {
    return { markdown: '', links: [] };
  }
}

// Build comprehensive search queries for person
function buildPersonSearchQueries(request: PersonEnrichmentRequest): string[] {
  const queries: string[] = [];
  const fullName = `${request.firstName || ''} ${request.lastName || ''}`.trim();
  
  if (request.linkedinUrl) {
    queries.push(`${fullName} LinkedIn profile biography`);
  }
  
  if (fullName) {
    // Professional profile
    queries.push(`"${fullName}" ${request.company || ''} professional profile biography`);
    queries.push(`"${fullName}" career work experience education background`);
    
    // Social media discovery
    queries.push(`"${fullName}" ${request.company || ''} LinkedIn Twitter social media profiles`);
    
    // Investment and business interests
    queries.push(`"${fullName}" investor investments board member advisory`);
    
    // News and recent activity
    queries.push(`"${fullName}" ${request.company || ''} news announcement interview`);
  }
  
  if (request.email) {
    queries.push(`"${request.email}" contact profile`);
  }
  
  if (request.company) {
    queries.push(`${request.company} ${fullName} executive leadership`);
  }
  
  return queries.slice(0, 6);
}

// Build comprehensive search queries for company
function buildCompanySearchQueries(request: CompanyEnrichmentRequest): string[] {
  const queries: string[] = [];
  const company = request.companyName;
  
  // Company overview
  queries.push(`"${company}" company overview about headquarters address phone`);
  
  // Financial information
  queries.push(`"${company}" revenue funding valuation financials annual report`);
  
  // Leadership
  queries.push(`"${company}" CEO founder executives leadership team biography`);
  queries.push(`"${company}" board directors members governance`);
  
  // Ownership
  queries.push(`"${company}" shareholders ownership investors stake equity`);
  
  // News and developments
  queries.push(`"${company}" acquisition investment funding news 2024 2025`);
  
  // Social media
  queries.push(`"${company}" LinkedIn company page social media website`);
  
  // Industry specific
  if (request.industry) {
    queries.push(`"${company}" ${request.industry} market competitors position`);
  }
  
  // Location specific
  if (request.country && request.country !== 'All Countries') {
    queries.push(`"${company}" ${request.country} office operations headquarters`);
  }
  
  return queries.slice(0, 8);
}

// Generate person enrichment report using OpenAI
async function generatePersonReport(
  request: PersonEnrichmentRequest,
  searchResults: any[],
  scrapedContent: string,
  socialProfiles: { linkedin?: string; twitter?: string; website?: string; others: string[] }
): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('[lead-enrichment] OPENAI_API_KEY not configured');
    return { success: false, error: 'OpenAI API not configured' };
  }
  
  const fullName = `${request.firstName || ''} ${request.lastName || ''}`.trim();
  const allContent = searchResults.map(r => 
    `Source: ${r.url}\nTitle: ${r.title}\n${r.markdown || r.description || ''}`
  ).join('\n\n---\n\n');
  
  const combinedContent = scrapedContent 
    ? `Direct Profile Content:\n${scrapedContent}\n\n---\n\nWeb Research:\n${allContent}`
    : allContent;
  
  const systemPrompt = `You are an expert lead intelligence analyst powered by OpenAI GPT-4o. Generate a COMPREHENSIVE person enrichment profile.

YOUR TASK: Create a detailed professional intelligence report for "${fullName}".

You MUST extract and generate ALL of the following fields. Use "Not found in sources" only if truly absent.

OUTPUT AS JSON with this EXACT structure:
{
  "name": "Full Name",
  "type": "person",
  "title": "Current Job Title",
  "company": "Current Company",
  "estimatedAnnualIncome": "$X - $Y range based on title/company/industry",
  "aiProfileSummary": "2-3 paragraph professional AI-generated summary of this person",
  "bestTimeToContact": {
    "prediction": "e.g., Tuesday-Thursday, 9-11 AM local time",
    "reasoning": "Based on role, seniority, industry patterns",
    "confidence": "high/medium/low"
  },
  "linkedinUrl": "LinkedIn profile URL",
  "twitterUrl": "Twitter/X profile URL",
  "email": "Email if found",
  "phone": "Phone if found",
  "location": "City, Country",
  "education": [
    {"degree": "MBA", "institution": "Harvard Business School", "year": "2015", "details": "Focus on Strategy"}
  ],
  "workExperience": [
    {"title": "CEO", "company": "Company Name", "duration": "2020-Present", "description": "Key responsibilities and achievements"}
  ],
  "skills": ["Leadership", "Strategy", "M&A"],
  "investmentInterests": {
    "sectors": ["Technology", "Healthcare"],
    "investmentStyle": "Growth equity, Series B-C",
    "pastInvestments": ["Company A", "Company B"],
    "boardPositions": ["Company X", "Company Y"]
  },
  "interestIndicators": {
    "businessInterests": ["AI/ML", "Fintech", "SaaS"],
    "personalInterests": ["Golf", "Philanthropy"],
    "networkingEvents": ["TechCrunch Disrupt", "Davos"],
    "publicationsOrMedia": ["Forbes contributor", "Bloomberg interviews"]
  },
  "overview": "Comprehensive professional bio",
  "keyFacts": ["Achievement 1", "Achievement 2"],
  "recentNews": ["Recent news item 1"],
  "socialProfiles": {
    "linkedin": "URL",
    "twitter": "URL",
    "website": "URL",
    "others": ["GitHub URL", "Medium URL"]
  }
}

CRITICAL INSTRUCTIONS:
1. estimatedAnnualIncome: Base on job title, company size, industry, and location. Provide a range.
2. bestTimeToContact: Analyze their role (executives prefer early morning, sales prefer mid-week), timezone, and industry.
3. investmentInterests: Look for any mention of investments, board positions, advisory roles, or fund involvement.
4. interestIndicators: Analyze their content, speeches, articles, hobbies, and affiliations.
5. Be specific with data - no vague statements.`;

  const userPrompt = `Research Subject: ${fullName}
${request.company ? `Current Company: ${request.company}` : ''}
${request.country ? `Country: ${request.country}` : ''}
${request.email ? `Email: ${request.email}` : ''}
${request.linkedinUrl ? `LinkedIn: ${request.linkedinUrl}` : ''}

Social Profiles Found:
- LinkedIn: ${socialProfiles.linkedin || 'Not found'}
- Twitter: ${socialProfiles.twitter || 'Not found'}
- Website: ${socialProfiles.website || 'Not found'}
- Other profiles: ${socialProfiles.others.join(', ') || 'None found'}

Sources to analyze:
${combinedContent.slice(0, 60000)}

Extract ALL available information and generate the complete person profile JSON.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[lead-enrichment] OpenAI error:', response.status, errText);
      if (response.status === 429) return { success: false, error: 'Rate limit exceeded' };
      if (response.status === 402) return { success: false, error: 'OpenAI credits exhausted' };
      return { success: false, error: 'OpenAI API error' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON
    let parsedData: any;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsedData = JSON.parse((jsonMatch[1] || content).trim());
    } catch {
      return {
        success: true,
        data: {
          name: fullName,
          type: 'person',
          overview: content,
          keyFacts: [],
          sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url })),
        }
      };
    }
    
    // Add sources
    parsedData.sources = searchResults.slice(0, 15).map(r => ({ title: r.title, url: r.url }));
    
    return { success: true, data: parsedData };
  } catch (error) {
    console.error('[lead-enrichment] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// Generate company enrichment report using OpenAI
async function generateCompanyReport(
  request: CompanyEnrichmentRequest,
  searchResults: any[],
  websiteContent: string,
  socialProfiles: { linkedin?: string; twitter?: string; website?: string; others: string[] }
): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('[lead-enrichment] OPENAI_API_KEY not configured');
    return { success: false, error: 'OpenAI API not configured' };
  }
  
  const allContent = searchResults.map(r => 
    `Source: ${r.url}\nTitle: ${r.title}\n${r.markdown || r.description || ''}`
  ).join('\n\n---\n\n');
  
  const combinedContent = websiteContent 
    ? `Official Website Content:\n${websiteContent}\n\n---\n\nWeb Research:\n${allContent}`
    : allContent;
  
  const systemPrompt = `You are an expert business intelligence analyst powered by OpenAI GPT-4o. Generate a COMPREHENSIVE company enrichment profile.

YOUR TASK: Create a detailed company intelligence report for "${request.companyName}".

You MUST extract and generate ALL of the following fields. Use "Not found in sources" only if truly absent.

OUTPUT AS JSON with this EXACT structure:
{
  "name": "Company Legal Name",
  "type": "company",
  "tradingNames": ["DBA names"],
  "industry": "Primary Industry",
  "subIndustry": "Specific sector",
  "location": "Headquarters City, Country",
  "offices": [
    {"location": "City, Country", "type": "HQ/Regional/Branch", "address": "Full address", "phone": "+1 xxx"}
  ],
  "website": "Official website URL",
  "linkedinUrl": "LinkedIn company page URL",
  "socialMedia": {
    "linkedin": "URL",
    "twitter": "URL",
    "facebook": "URL",
    "instagram": "URL",
    "youtube": "URL"
  },
  "employees": "X employees or X-Y range",
  "founded": "Year",
  "overview": "3-4 paragraph comprehensive company description",
  "estimatedRevenueRange": "$X million - $Y million or $X billion",
  "revenueGrowth": "X% YoY if available",
  "financials": {
    "revenue": "$X",
    "netIncome": "$X if public",
    "funding": "$X total raised",
    "lastFundingRound": {"amount": "$X", "date": "YYYY-MM", "series": "Series X"},
    "valuation": "$X",
    "investors": ["Investor 1", "Investor 2"]
  },
  "ownership": {
    "type": "Private/Public/Government",
    "majorShareholders": [
      {"name": "Shareholder Name", "stake": "X%", "type": "Individual/Institution"}
    ],
    "ultimateOwner": "Parent company or individual"
  },
  "leadership": [
    {
      "name": "CEO Name",
      "title": "Chief Executive Officer",
      "aiProfileSummary": "2-3 sentence AI summary of this person",
      "background": "Previous roles and education",
      "linkedinUrl": "Personal LinkedIn if found",
      "tenure": "Since YYYY"
    }
  ],
  "boardMembers": [
    {
      "name": "Board Member Name",
      "title": "Independent Director",
      "aiProfileSummary": "2-3 sentence AI summary",
      "otherRoles": "CEO at X, Board at Y",
      "background": "Key background info"
    }
  ],
  "keyPeople": [
    {
      "name": "Person Name",
      "title": "VP of Sales",
      "aiProfileSummary": "2-3 sentence AI summary",
      "department": "Sales",
      "linkedinUrl": "LinkedIn URL if found"
    }
  ],
  "products": ["Product/Service 1", "Product/Service 2"],
  "keyClients": ["Client 1", "Client 2"],
  "competitors": ["Competitor 1", "Competitor 2"],
  "keyFacts": ["Fact 1", "Fact 2"],
  "recentNews": [
    {"headline": "News title", "date": "YYYY-MM-DD", "summary": "Brief summary", "url": "Source URL"}
  ],
  "investmentActivity": {
    "acquisitions": [{"company": "Name", "date": "YYYY", "amount": "$X"}],
    "investments": [{"company": "Name", "date": "YYYY", "amount": "$X"}],
    "fundingReceived": [{"round": "Series X", "date": "YYYY", "amount": "$X", "investors": ["A", "B"]}]
  },
  "marketPosition": "Analysis of market position and competitive advantages"
}

CRITICAL INSTRUCTIONS:
1. For EVERY leadership/board/key person, generate an AI Profile Summary
2. estimatedRevenueRange: Provide a realistic range based on industry, employee count, and available data
3. Include ALL office locations, phone numbers, and addresses found
4. List ALL social media profiles discovered
5. For ownership, try to identify the ultimate beneficial owner
6. Include acquisition, investment, and funding history`;

  const userPrompt = `Research Subject: ${request.companyName}
${request.industry ? `Industry: ${request.industry}` : ''}
${request.country ? `Country Focus: ${request.country}` : ''}
${request.website ? `Website: ${request.website}` : ''}

Social Profiles Found:
- LinkedIn: ${socialProfiles.linkedin || 'Not found'}
- Twitter: ${socialProfiles.twitter || 'Not found'}
- Website: ${socialProfiles.website || request.website || 'Not found'}
- Other profiles: ${socialProfiles.others.join(', ') || 'None found'}

Sources to analyze:
${combinedContent.slice(0, 60000)}

Extract ALL available information and generate the complete company profile JSON.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[lead-enrichment] OpenAI error:', response.status, errText);
      if (response.status === 429) return { success: false, error: 'Rate limit exceeded' };
      return { success: false, error: 'OpenAI API error' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON
    let parsedData: any;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsedData = JSON.parse((jsonMatch[1] || content).trim());
    } catch {
      return {
        success: true,
        data: {
          name: request.companyName,
          type: 'company',
          overview: content,
          keyFacts: [],
          sources: searchResults.slice(0, 10).map(r => ({ title: r.title, url: r.url })),
        }
      };
    }
    
    // Add sources
    parsedData.sources = searchResults.slice(0, 15).map(r => ({ title: r.title, url: r.url }));
    
    return { success: true, data: parsedData };
  } catch (error) {
    console.error('[lead-enrichment] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// Chat to edit report
async function chatEditReport(request: ChatEditRequest): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return { success: false, error: 'OpenAI API not configured' };
  }
  
  const systemPrompt = `You are an AI assistant helping to edit and improve a lead enrichment report.
The user will provide the current report content and an instruction for how to modify it.
Apply the requested changes while maintaining the professional format and accuracy.
Return the COMPLETE updated report with all changes applied.
Preserve all sections and data that were not specifically asked to be changed.`;

  const userPrompt = `Current Report for ${request.reportContext.name} (${request.reportContext.entityType}):

${request.currentReport}

---

User's Edit Instruction: ${request.editInstruction}

Apply the requested changes and return the complete updated report:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to edit report' };
    }

    const data = await response.json();
    const updatedReport = data.choices?.[0]?.message?.content || '';
    
    return { success: true, updatedReport };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// Extract social profiles from search results
function extractSocialProfiles(searchResults: any[], links: string[]): { linkedin?: string; twitter?: string; website?: string; others: string[] } {
  const profiles: { linkedin?: string; twitter?: string; website?: string; others: string[] } = { others: [] };
  
  const allUrls = [
    ...searchResults.map(r => r.url),
    ...links,
  ];
  
  for (const url of allUrls) {
    if (!url) continue;
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('linkedin.com/in/') || lowerUrl.includes('linkedin.com/company/')) {
      if (!profiles.linkedin) profiles.linkedin = url;
    } else if (lowerUrl.includes('twitter.com/') || lowerUrl.includes('x.com/')) {
      if (!profiles.twitter) profiles.twitter = url;
    } else if (lowerUrl.includes('github.com/')) {
      profiles.others.push(url);
    } else if (lowerUrl.includes('medium.com/')) {
      profiles.others.push(url);
    } else if (lowerUrl.includes('crunchbase.com/')) {
      profiles.others.push(url);
    } else if (lowerUrl.includes('bloomberg.com/profile/')) {
      profiles.others.push(url);
    } else if (lowerUrl.includes('facebook.com/')) {
      profiles.others.push(url);
    } else if (lowerUrl.includes('instagram.com/')) {
      profiles.others.push(url);
    }
  }
  
  return profiles;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request = await req.json() as EnrichmentRequest;
    
    // Handle chat edit request
    if (request.type === 'chat_edit') {
      console.log('[lead-enrichment] Processing chat edit request');
      const result = await chatEditReport(request as ChatEditRequest);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[lead-enrichment] Starting enrichment:', 
      request.type, 
      request.type === 'company' ? (request as CompanyEnrichmentRequest).companyName : 
        `${(request as PersonEnrichmentRequest).firstName} ${(request as PersonEnrichmentRequest).lastName}`
    );
    
    // Build search queries
    const queries = request.type === 'person' 
      ? buildPersonSearchQueries(request as PersonEnrichmentRequest)
      : buildCompanySearchQueries(request as CompanyEnrichmentRequest);
    
    console.log('[lead-enrichment] Search queries:', queries);
    
    // Execute all searches in parallel
    const searchPromises = queries.map(q => searchWeb(q, 10));
    const searchResultArrays = await Promise.all(searchPromises);
    
    // Combine and deduplicate results
    const allResults: any[] = [];
    const seenUrls = new Set<string>();
    const allLinks: string[] = [];
    
    for (const results of searchResultArrays) {
      for (const result of results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
          if (result.links) allLinks.push(...result.links);
        }
      }
    }
    
    console.log('[lead-enrichment] Total unique results:', allResults.length);
    
    // Extract social profiles
    const socialProfiles = extractSocialProfiles(allResults, allLinks);
    console.log('[lead-enrichment] Social profiles found:', socialProfiles);
    
    // Scrape additional content based on type
    let additionalContent = '';
    
    if (request.type === 'company') {
      const companyReq = request as CompanyEnrichmentRequest;
      
      // Scrape company website
      if (companyReq.website) {
        console.log('[lead-enrichment] Scraping company website:', companyReq.website);
        const websiteResult = await scrapeUrl(companyReq.website);
        additionalContent = websiteResult.markdown;
        
        // Try to get about/team pages
        try {
          const aboutUrl = new URL('/about', companyReq.website).toString();
          const teamUrl = new URL('/team', companyReq.website).toString();
          const leadershipUrl = new URL('/leadership', companyReq.website).toString();
          const contactUrl = new URL('/contact', companyReq.website).toString();
          
          const [aboutResult, teamResult, leadershipResult, contactResult] = await Promise.all([
            scrapeUrl(aboutUrl),
            scrapeUrl(teamUrl),
            scrapeUrl(leadershipUrl),
            scrapeUrl(contactUrl),
          ]);
          
          additionalContent += '\n\n--- About Page ---\n' + aboutResult.markdown;
          additionalContent += '\n\n--- Team Page ---\n' + teamResult.markdown;
          additionalContent += '\n\n--- Leadership Page ---\n' + leadershipResult.markdown;
          additionalContent += '\n\n--- Contact Page ---\n' + contactResult.markdown;
        } catch {
          // Ignore errors for subpages
        }
      }
      
      // Scrape LinkedIn company page if found
      if (socialProfiles.linkedin && socialProfiles.linkedin.includes('/company/')) {
        const linkedinResult = await scrapeUrl(socialProfiles.linkedin);
        additionalContent += '\n\n--- LinkedIn Company Page ---\n' + linkedinResult.markdown;
      }
      
      // Generate company report
      const result = await generateCompanyReport(
        companyReq,
        allResults,
        additionalContent,
        socialProfiles
      );
      
      console.log('[lead-enrichment] Company enrichment complete, success:', result.success);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Person enrichment
      const personReq = request as PersonEnrichmentRequest;
      
      // Scrape LinkedIn profile if provided
      if (personReq.linkedinUrl) {
        socialProfiles.linkedin = personReq.linkedinUrl;
        const linkedinResult = await scrapeUrl(personReq.linkedinUrl);
        additionalContent = linkedinResult.markdown;
      } else if (socialProfiles.linkedin) {
        const linkedinResult = await scrapeUrl(socialProfiles.linkedin);
        additionalContent = linkedinResult.markdown;
      }
      
      // Generate person report
      const result = await generatePersonReport(
        personReq,
        allResults,
        additionalContent,
        socialProfiles
      );
      
      console.log('[lead-enrichment] Person enrichment complete, success:', result.success);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[lead-enrichment] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Enrichment failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
