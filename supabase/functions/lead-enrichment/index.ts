import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Backend is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// Perform web search (real-time)
async function searchWeb(query: string, maxResults: number = 12, opts?: { country?: string }): Promise<any[]> {
  try {
    console.log(`[lead-enrichment] Web search: ${query}`);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.functions.invoke('web-search', {
      body: {
        query,
        maxResults,
        searchEngine: 'all',
        scrapeContent: true,
        country: opts?.country,
      },
    });

    if (error) {
      console.error('[lead-enrichment] Web search invoke error:', error);
      return [];
    }

    if (!data?.success) {
      console.error('[lead-enrichment] Web search failed:', data?.error);
      return [];
    }

    return data.results || data.data || [];
  } catch (error) {
    console.error('[lead-enrichment] Web search error:', error);
    return [];
  }
}

// Scrape specific URL (real-time)
async function scrapeUrl(url: string, opts?: { onlyMainContent?: boolean }): Promise<{ markdown: string; links: string[] }> {
  try {
    console.log(`[lead-enrichment] Scraping: ${url}`);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.functions.invoke('research-scrape', {
      body: {
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: opts?.onlyMainContent ?? true,
      },
    });

    if (error || !data?.success) return { markdown: '', links: [] };

    return {
      markdown: data.data?.markdown || '',
      links: data.data?.links || [],
    };
  } catch (error) {
    console.error('[lead-enrichment] Scrape error:', error);
    return { markdown: '', links: [] };
  }
}

// Web crawl a website recursively (real-time)
async function webCrawl(url: string, query: string, opts?: { maxPages?: number; maxDepth?: number }): Promise<{
  pages: Array<{ url: string; title: string; markdown: string; wordCount: number }>;
  combinedContent: string;
  totalPages: number;
}> {
  try {
    console.log(`[lead-enrichment] Web crawl: ${url} for "${query}"`);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.functions.invoke('web-crawl', {
      body: {
        url,
        query,
        maxPages: opts?.maxPages ?? 10,
        maxDepth: opts?.maxDepth ?? 2,
        followLinks: true,
        scrapeContent: true,
      },
    });

    if (error || !data?.success) {
      console.error('[lead-enrichment] Web crawl failed:', error || data?.error);
      return { pages: [], combinedContent: '', totalPages: 0 };
    }

    const successfulPages = (data.pages || [])
      .filter((p: any) => p.status === 'success' && p.wordCount > 50)
      .slice(0, opts?.maxPages ?? 10);

    const combinedContent = successfulPages
      .map((p: any) => `## ${p.title}\nSource: ${p.url}\n\n${p.markdown?.slice(0, 3000) || ''}`)
      .join('\n\n---\n\n');

    console.log(`[lead-enrichment] Web crawl found ${successfulPages.length} pages`);

    return {
      pages: successfulPages.map((p: any) => ({
        url: p.url,
        title: p.title,
        markdown: p.markdown || '',
        wordCount: p.wordCount || 0,
      })),
      combinedContent,
      totalPages: successfulPages.length,
    };
  } catch (error) {
    console.error('[lead-enrichment] Web crawl error:', error);
    return { pages: [], combinedContent: '', totalPages: 0 };
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

// Known company domain mappings for validation
const KNOWN_COMPANY_DOMAINS: Record<string, string[]> = {
  'microsoft': ['microsoft.com', 'azure.com', 'linkedin.com/company/microsoft'],
  'apple': ['apple.com', 'linkedin.com/company/apple'],
  'google': ['google.com', 'alphabet.com', 'linkedin.com/company/google'],
  'amazon': ['amazon.com', 'aws.amazon.com', 'linkedin.com/company/amazon'],
  'meta': ['meta.com', 'facebook.com', 'linkedin.com/company/meta'],
  'netflix': ['netflix.com', 'linkedin.com/company/netflix'],
  'tesla': ['tesla.com', 'linkedin.com/company/tesla'],
  'nvidia': ['nvidia.com', 'linkedin.com/company/nvidia'],
  'ibm': ['ibm.com', 'linkedin.com/company/ibm'],
  'oracle': ['oracle.com', 'linkedin.com/company/oracle'],
  'salesforce': ['salesforce.com', 'linkedin.com/company/salesforce'],
  'adobe': ['adobe.com', 'linkedin.com/company/adobe'],
  'intel': ['intel.com', 'linkedin.com/company/intel'],
  'cisco': ['cisco.com', 'linkedin.com/company/cisco'],
  'samsung': ['samsung.com', 'linkedin.com/company/samsung'],
  'walmart': ['walmart.com', 'linkedin.com/company/walmart'],
  'jpmorgan': ['jpmorgan.com', 'jpmorganchase.com', 'linkedin.com/company/jpmorgan'],
  'goldman sachs': ['goldmansachs.com', 'linkedin.com/company/goldman-sachs'],
  'berkshire hathaway': ['berkshirehathaway.com'],
  'visa': ['visa.com', 'linkedin.com/company/visa'],
  'mastercard': ['mastercard.com', 'linkedin.com/company/mastercard'],
  'paypal': ['paypal.com', 'linkedin.com/company/paypal'],
  'uber': ['uber.com', 'linkedin.com/company/uber'],
  'airbnb': ['airbnb.com', 'linkedin.com/company/airbnb'],
  'spotify': ['spotify.com', 'linkedin.com/company/spotify'],
  'twitter': ['x.com', 'twitter.com', 'linkedin.com/company/twitter'],
  'openai': ['openai.com', 'linkedin.com/company/openai'],
  'anthropic': ['anthropic.com', 'linkedin.com/company/anthropic'],
};

// Validate company domain match
function validateCompanyDomain(companyName: string, url: string): { isValid: boolean; confidence: number; expectedDomains: string[] } {
  const normalizedCompany = companyName.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const urlLower = url.toLowerCase();
  
  // Check known mappings first
  for (const [known, domains] of Object.entries(KNOWN_COMPANY_DOMAINS)) {
    if (normalizedCompany.includes(known) || known.includes(normalizedCompany)) {
      const matchesDomain = domains.some(d => urlLower.includes(d));
      return {
        isValid: matchesDomain,
        confidence: matchesDomain ? 0.98 : 0.2,
        expectedDomains: domains,
      };
    }
  }
  
  // Fallback: check if domain contains company name words
  const companyWords = normalizedCompany.split(/\s+/).filter(w => w.length > 2);
  const matchCount = companyWords.filter(word => urlLower.includes(word)).length;
  const confidence = matchCount / Math.max(companyWords.length, 1);
  
  return {
    isValid: confidence > 0.5,
    confidence: confidence,
    expectedDomains: [`${normalizedCompany.replace(/\s+/g, '')}.com`],
  };
}

// Entity extraction for query understanding
function extractEntities(query: string): { companies: string[]; persons: string[]; keywords: string[] } {
  const companies: string[] = [];
  const persons: string[] = [];
  const keywords: string[] = [];
  
  // Known company patterns
  const companyPatterns = [
    /\b(Microsoft|Apple|Google|Amazon|Meta|Netflix|Tesla|Nvidia|IBM|Oracle|Salesforce|Adobe|Intel|Cisco|Samsung|Walmart|JPMorgan|Goldman\s*Sachs|Visa|Mastercard|PayPal|Uber|Airbnb|Spotify|Twitter|OpenAI|Anthropic)\b/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Inc|Corp|Corporation|LLC|Ltd|Company|Co)\b/gi,
  ];
  
  // Known person patterns (CEO, executives)
  const personPatterns = [
    /\b(Tim\s+Cook|Satya\s+Nadella|Elon\s+Musk|Mark\s+Zuckerberg|Jeff\s+Bezos|Sundar\s+Pichai|Jensen\s+Huang|Sam\s+Altman)\b/gi,
    /CEO\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+CEO/gi,
  ];
  
  for (const pattern of companyPatterns) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      const company = (match[1] || match[0]).trim();
      if (!companies.includes(company)) companies.push(company);
    }
  }
  
  for (const pattern of personPatterns) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      const person = (match[1] || match[0]).trim();
      if (!persons.includes(person)) persons.push(person);
    }
  }
  
  // Extract keywords (important terms)
  const keywordPatterns = [
    /\b(quarterly\s+earnings|revenue|financials|annual\s+report|market\s+cap|stock|shares|IPO|acquisition|merger)\b/gi,
    /\b(CEO|CFO|CTO|COO|executive|board|director|leadership)\b/gi,
    /\b(headquarters|location|office|address)\b/gi,
  ];
  
  for (const pattern of keywordPatterns) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      const keyword = match[0].trim().toLowerCase();
      if (!keywords.includes(keyword)) keywords.push(keyword);
    }
  }
  
  return { companies, persons, keywords };
}

// Build comprehensive search queries for company
function buildCompanySearchQueries(request: CompanyEnrichmentRequest): string[] {
  const queries: string[] = [];
  const company = request.companyName;
  
  // Extract entities for better targeting
  const entities = extractEntities(company);
  console.log(`[lead-enrichment] Extracted entities:`, entities);
  
  // Company overview - prioritize official sources
  queries.push(`"${company}" site:${company.toLowerCase().replace(/\s+/g, '')}.com`);
  queries.push(`"${company}" official website about company overview`);
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
  
  return queries.slice(0, 10);
}

// Generate person enrichment report using OpenAI - DETAILED BUSINESS DATA
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
  
  const systemPrompt = `You are an expert lead intelligence analyst. Enrich this person with business-usable data.

CRITICAL: Generate COMPREHENSIVE, DETAILED data for every field. Do not leave fields empty - use research to populate all sections with meaningful business intelligence.

Return JSON with this EXACT structure:
{
  "name": "Full Name",
  "type": "person",
  "profile": {
    "full_name": "Complete full name",
    "title": "Current job title with seniority level",
    "company": "Current company name",
    "location": "City, State/Province, Country",
    "linkedin_url": "LinkedIn profile URL",
    "email": "Professional email if found",
    "phone": "Phone number if found",
    "summary": "3-4 paragraph comprehensive professional biography covering career trajectory, achievements, expertise areas, and industry impact",
    "skills": ["Skill 1", "Skill 2", "Skill 3", "...up to 15 relevant skills"],
    "education": [
      {"degree": "Degree name", "institution": "University name", "year": "Graduation year", "field": "Field of study", "honors": "Any honors/distinctions"}
    ],
    "experience": [
      {"title": "Job title", "company": "Company name", "duration": "Start - End", "location": "Location", "description": "Detailed 2-3 sentence description of responsibilities and achievements"}
    ]
  },
  "profileSummary": "Executive-level 2 paragraph summary of who this person is, their career highlights, and why they matter in their industry",
  "companyPositioning": "Analysis of their current company's market position, their role in the organization, and strategic importance",
  "estimatedAnnualIncome": "$X,XXX,XXX - $X,XXX,XXX based on title, company size, industry benchmarks, and location",
  "annualIncome": {
    "estimate": "$X,XXX,XXX - $X,XXX,XXX",
    "methodology": "Explanation of how this was estimated based on role, company, industry, location",
    "confidence": "high/medium/low"
  },
  "yearsOfExperience": "XX years in industry, XX years in current role",
  "bestTimeToContact": {
    "prediction": "Specific days and times (e.g., Tuesday-Thursday, 9-11 AM PST)",
    "reasoning": "Detailed explanation based on role, industry patterns, timezone",
    "confidence": "high/medium/low"
  },
  "keyInsights": [
    "Insight 1 about their career trajectory or decision-making patterns",
    "Insight 2 about their professional network or influence",
    "Insight 3 about their business priorities or interests",
    "Insight 4 about opportunities to engage",
    "Insight 5 about potential challenges or considerations"
  ],
  "strengths": [
    "Professional strength 1 with evidence",
    "Professional strength 2 with evidence",
    "Professional strength 3 with evidence"
  ],
  "recommendations": [
    "Recommendation 1 for engaging with this person",
    "Recommendation 2 for building relationship",
    "Recommendation 3 for timing and approach"
  ],
  "investmentInterests": {
    "sectors": ["Technology sectors of interest"],
    "investmentStyle": "Their investment approach if applicable",
    "pastInvestments": ["Company A", "Company B"],
    "boardPositions": ["Company X board role"]
  },
  "interestIndicators": {
    "businessInterests": ["AI/ML", "FinTech", "etc."],
    "personalInterests": ["Hobbies and interests"],
    "networkingEvents": ["Conferences they attend"],
    "publicationsOrMedia": ["Media appearances, articles, podcasts"]
  },
  "insights": [
    "Key business insight 1",
    "Key business insight 2",
    "Key business insight 3"
  ],
  "sources": [{"title": "Source title", "url": "Source URL"}]
}

CRITICAL INSTRUCTIONS:
1. estimatedAnnualIncome: Calculate precise range based on job title level, company size (startup vs Fortune 500), industry (tech vs non-profit), and location (SF vs rural). Be specific.
2. yearsOfExperience: Calculate from earliest work experience to present. Break down by industry vs current role.
3. profile.summary: Write a comprehensive 3-4 paragraph biography that covers their complete professional journey.
4. profile.experience: Include ALL positions with detailed descriptions of responsibilities and achievements.
5. keyInsights: Provide 5 actionable business insights about this person.
6. strengths: Identify 3 key professional strengths with evidence from their background.
7. recommendations: Give 3 specific recommendations for engaging with this person.
8. Include only plausible business data based on research. Leave unknown fields empty rather than guessing.`;

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

Sources to analyze (extract ALL available information):
${combinedContent.slice(0, 60000)}

Generate the COMPLETE detailed person profile JSON with ALL fields populated.`;

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
        max_tokens: 8192,
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
    
    // Flatten profile fields to top level for compatibility
    if (parsedData.profile) {
      parsedData.title = parsedData.profile.title || parsedData.title;
      parsedData.company = parsedData.profile.company || parsedData.company;
      parsedData.location = parsedData.profile.location || parsedData.location;
      parsedData.linkedinUrl = parsedData.profile.linkedin_url || parsedData.linkedinUrl;
      parsedData.email = parsedData.profile.email || parsedData.email;
      parsedData.phone = parsedData.profile.phone || parsedData.phone;
      parsedData.aiProfileSummary = parsedData.profile.summary || parsedData.profileSummary || parsedData.aiProfileSummary;
      parsedData.skills = parsedData.profile.skills || parsedData.skills;
      parsedData.education = parsedData.profile.education || parsedData.education;
      parsedData.workExperience = parsedData.profile.experience || parsedData.workExperience;
    }
    
    // Ensure overview exists
    parsedData.overview = parsedData.profileSummary || parsedData.aiProfileSummary || parsedData.overview || '';
    
    // Extract keyFacts from insights if not present
    if (!parsedData.keyFacts && parsedData.keyInsights) {
      parsedData.keyFacts = parsedData.keyInsights;
    }
    if (!parsedData.keyFacts && parsedData.insights) {
      parsedData.keyFacts = parsedData.insights;
    }
    
    // Add sources
    parsedData.sources = searchResults.slice(0, 15).map(r => ({ title: r.title, url: r.url }));
    
    return { success: true, data: parsedData };
  } catch (error) {
    console.error('[lead-enrichment] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

function pruneEmptyDeep(value: any): any {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^not found in sources$/i.test(trimmed)) return undefined;
    if (/^not found$/i.test(trimmed)) return undefined;
    return value;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map(pruneEmptyDeep)
      .filter((v) => v !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = pruneEmptyDeep(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value;
}

function safeJsonParseFromModel(text: string): any | null {
  const raw = text.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    // Last attempt: find first {...}
    const brace = candidate.match(/\{[\s\S]*\}/);
    if (!brace) return null;
    try {
      return JSON.parse(brace[0]);
    } catch {
      return null;
    }
  }
}

// Generate company enrichment report using OpenAI - DETAILED BUSINESS DATA
async function generateCompanyReport(
  request: CompanyEnrichmentRequest,
  evidenceSources: Array<{ url: string; title?: string; content: string }>,
  websiteUrl: string | undefined,
  socialProfiles: { linkedin?: string; twitter?: string; website?: string; others: string[] }
): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('[lead-enrichment] OPENAI_API_KEY not configured');
    return { success: false, error: 'OpenAI API not configured' };
  }

  const sourcesWithContent = evidenceSources
    .filter(s => typeof s.content === 'string' && s.content.trim().length > 200)
    .slice(0, 25);

  if (sourcesWithContent.length < 2) {
    return {
      success: false,
      error: 'Insufficient real-time sources retrieved. Provide the official website or more specific company details.',
    };
  }

  const evidenceText = sourcesWithContent
    .map((s, i) => {
      const title = (s.title || '').trim();
      return `SOURCE ${i + 1}\nURL: ${s.url}\nTITLE: ${title || 'Untitled'}\nCONTENT:\n${s.content.slice(0, 4000)}`;
    })
    .join('\n\n---\n\n');

  const systemPrompt = `You are an expert company intelligence analyst. Enrich this company with business-usable data.

CRITICAL: Generate COMPREHENSIVE, DETAILED data for every field. Extract ALL available information from sources.

Return JSON with this EXACT structure:
{
  "name": "Company full legal name",
  "type": "company",
  "company": {
    "name": "Company name",
    "website": "Official website URL",
    "industry": "Primary industry",
    "sub_industry": "Specific sub-industry or sector",
    "country": "Headquarters country",
    "headquarters": "Full headquarters address",
    "employees": "Employee count or range (e.g., 1,000-5,000)",
    "founded": "Year founded",
    "revenue": "Annual revenue or estimate range",
    "summary": "4-5 paragraph comprehensive company overview covering history, business model, market position, competitive advantages, and strategic direction",
    "management": [
      {
        "name": "Executive name",
        "title": "C-Suite or VP title",
        "profile_summary_popup": "3-4 sentence AI-generated profile covering their background, expertise, notable achievements, and leadership style. Make this detailed enough to display in a popup when their name is clicked.",
        "linkedin_url": "LinkedIn profile URL if found",
        "tenure": "How long in role"
      }
    ],
    "owner_founder": [
      {
        "name": "Owner/Founder name",
        "title": "Founder, Co-Founder, Owner, Chairman, etc.",
        "profile_summary_popup": "3-4 sentence AI-generated profile covering their entrepreneurial journey, vision, investments, and influence. Make this detailed for popup display.",
        "linkedin_url": "LinkedIn profile URL if found",
        "ownership_stake": "Ownership percentage if known"
      }
    ],
    "board_members": [
      {
        "name": "Board member name",
        "title": "Board role (Director, Chairman, etc.)",
        "profile_summary_popup": "AI-generated profile for popup display",
        "other_roles": "Other board positions or companies"
      }
    ]
  },
  "profileSummary": "Executive summary paragraph about the company's market position and strategic importance",
  "companyPositioning": "Detailed analysis of market position, competitive landscape, and strategic differentiation",
  "estimatedRevenueRange": "$XXM - $XXXM or $X.XB - $X.XB with confidence level",
  "revenue": {
    "estimate": "Revenue figure or range",
    "source": "How this was determined (public filings, estimates, etc.)",
    "confidence": "high/medium/low"
  },
  "offices": [
    {
      "location": "City, Country",
      "type": "Headquarters/Regional Office/R&D Center/etc.",
      "address": "Full street address if available",
      "phone": "Office phone number if available"
    }
  ],
  "socialMedia": {
    "linkedin": "LinkedIn company page URL",
    "twitter": "Twitter/X profile URL",
    "facebook": "Facebook page URL",
    "instagram": "Instagram profile URL",
    "youtube": "YouTube channel URL"
  },
  "keyInsights": [
    "Strategic insight 1 about business direction",
    "Strategic insight 2 about market opportunity",
    "Strategic insight 3 about competitive position",
    "Strategic insight 4 about growth trajectory",
    "Strategic insight 5 about risks or challenges"
  ],
  "strengths": [
    "Competitive strength 1 with evidence",
    "Competitive strength 2 with evidence",
    "Competitive strength 3 with evidence"
  ],
  "recommendations": [
    "Business recommendation 1",
    "Business recommendation 2",
    "Business recommendation 3"
  ],
  "investmentActivity": {
    "acquisitions": [{"company": "Acquired company", "date": "Date", "amount": "Deal value", "rationale": "Strategic rationale"}],
    "investments": [{"company": "Investment target", "date": "Date", "amount": "Amount", "stage": "Series/Stage"}],
    "fundingReceived": [{"round": "Series X", "date": "Date", "amount": "Amount", "investors": ["Investor names"]}]
  },
  "news": [
    {"headline": "News headline", "date": "Date", "summary": "2-3 sentence summary", "url": "Source URL", "significance": "Why this matters"}
  ],
  "products": ["Product/Service 1", "Product/Service 2"],
  "keyClients": ["Client 1", "Client 2"],
  "competitors": ["Competitor 1", "Competitor 2"],
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "sources": [{"title": "Source title", "url": "Source URL"}]
}

CRITICAL INSTRUCTIONS:
1. management/owner_founder profile_summary_popup: These are CLICKABLE names that show a popup. Write detailed 3-4 sentence summaries covering background, achievements, expertise, and leadership style. Make them informative enough to stand alone.
2. estimatedRevenueRange: Provide specific range based on company size, industry, employee count. Include confidence level.
3. offices: Include ALL offices found with complete addresses and phone numbers.
4. socialMedia: Include ALL social media URLs (LinkedIn, Twitter, Facebook, Instagram, YouTube).
5. keyInsights: Provide 5 actionable strategic insights about this company.
6. investmentActivity: Include ALL acquisitions, investments made, and funding received with details.
7. news: Include recent significant news with dates and summaries.
8. Include only data supported by sources. Leave unknown fields empty rather than guessing.`;

  const userPrompt = `Company: ${request.companyName}
${request.industry ? `Industry hint: ${request.industry}` : ''}
${request.country ? `Country hint: ${request.country}` : ''}
${websiteUrl ? `Official website candidate: ${websiteUrl}` : ''}

Known URLs from site discovery:
- Website: ${socialProfiles.website || websiteUrl || 'unknown'}
- LinkedIn: ${socialProfiles.linkedin || 'unknown'}
- Twitter/X: ${socialProfiles.twitter || 'unknown'}
- Other: ${(socialProfiles.others || []).slice(0, 10).join(', ') || 'none'}

SOURCES (extract ALL available information):
${evidenceText}

Generate the COMPLETE detailed company profile JSON with ALL fields populated, especially management and owner_founder with detailed profile_summary_popup for clickable names.`;

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
        max_tokens: 8192,
        temperature: 0.2,
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

    const parsed = safeJsonParseFromModel(content);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Failed to parse model output (expected JSON)' };
    }

    // Flatten company fields to top level for compatibility
    const flattened: any = {
      name: request.companyName,
      type: 'company',
      overview: parsed.company?.summary || parsed.profileSummary || '',
      website: parsed.company?.website || websiteUrl || socialProfiles.website,
      industry: parsed.company?.industry,
      subIndustry: parsed.company?.sub_industry,
      location: parsed.company?.headquarters || parsed.company?.country,
      employees: parsed.company?.employees,
      founded: parsed.company?.founded,
      estimatedRevenueRange: parsed.estimatedRevenueRange || parsed.revenue?.estimate || parsed.company?.revenue,
      offices: parsed.offices,
      socialMedia: parsed.socialMedia || {
        linkedin: socialProfiles.linkedin,
        twitter: socialProfiles.twitter,
      },
      // Leadership with AI profile summaries for popups
      leadership: (parsed.company?.management || []).map((m: any) => ({
        name: m.name,
        title: m.title,
        aiProfileSummary: m.profile_summary_popup,
        linkedinUrl: m.linkedin_url,
        tenure: m.tenure,
        background: m.profile_summary_popup,
      })),
      // Owners/Founders with AI profile summaries for popups
      ownership: {
        type: 'Private/Public',
        ultimateOwner: parsed.company?.owner_founder?.[0]?.name,
        majorShareholders: (parsed.company?.owner_founder || []).map((o: any) => ({
          name: o.name,
          stake: o.ownership_stake,
          type: o.title,
          aiProfileSummary: o.profile_summary_popup,
        })),
      },
      // Board members with AI profile summaries
      boardMembers: (parsed.company?.board_members || []).map((b: any) => ({
        name: b.name,
        title: b.title,
        aiProfileSummary: b.profile_summary_popup,
        otherRoles: b.other_roles,
      })),
      // Key people combines all leadership for display
      keyPeople: [
        ...(parsed.company?.management || []).map((m: any) => ({
          name: m.name,
          title: m.title,
          aiProfileSummary: m.profile_summary_popup,
          linkedinUrl: m.linkedin_url,
          department: 'Executive',
        })),
        ...(parsed.company?.owner_founder || []).map((o: any) => ({
          name: o.name,
          title: o.title,
          aiProfileSummary: o.profile_summary_popup,
          department: 'Ownership',
        })),
      ],
      financials: {
        revenue: parsed.company?.revenue || parsed.revenue?.estimate,
        funding: parsed.investmentActivity?.fundingReceived?.[0]?.amount,
        valuation: parsed.valuation,
        investors: parsed.investmentActivity?.fundingReceived?.[0]?.investors,
      },
      investmentActivity: parsed.investmentActivity,
      products: parsed.products,
      keyClients: parsed.keyClients,
      competitors: parsed.competitors,
      keyFacts: parsed.keyInsights || parsed.insights || [],
      strengths: parsed.strengths,
      recommendations: parsed.recommendations,
      recentNews: parsed.news,
      companyPositioning: parsed.companyPositioning,
      profileSummary: parsed.profileSummary,
      evidence: pruneEmptyDeep(parsed),
      sources: sourcesWithContent.slice(0, 15).map(s => ({
        title: (s.title || '').trim() || s.url,
        url: s.url,
      })),
    };

    const cleaned = pruneEmptyDeep(flattened);
    if (!cleaned?.overview || !cleaned?.sources?.length) {
      return { success: false, error: 'Not enough grounded information to produce a company profile.' };
    }

    return { success: true, data: cleaned };
  } catch (error) {
    console.error('[lead-enrichment] Company report error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// Chat to edit report
async function chatEditReport(request: ChatEditRequest): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return { success: false, error: 'OpenAI API not configured' };
  }
  
  const systemPrompt = `You are an AI assistant that edits an existing lead enrichment report.

HARD RULES:
- You MUST NOT introduce any new facts, numbers, names, URLs, or claims that are not already present in the current report.
- You may only: reformat, reorganize, clarify wording, remove content, or change tone.
- If the user asks to "add" something that is not in the report, you must respond that it is not available in the current evidence and suggest re-running enrichment.

Return the COMPLETE updated report with changes applied.`;

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

      const supabase = getSupabaseAdmin();

      // 1) Run the SAME wide research engine used by the app for real-time sources
      const companyQuery = `${companyReq.companyName} company profile headquarters address phone leadership CEO founder board directors shareholders ownership revenue funding valuation investors acquisitions investments news`;

      const { data: wideData, error: wideErr } = await supabase.functions.invoke('wide-research', {
        body: {
          query: companyQuery,
          items: buildCompanySearchQueries(companyReq),
          config: {
            maxSubAgents: 8,
            scrapeDepth: 'deep',
            country: companyReq.country,
            minSourcesPerItem: 2,
          },
        },
      });

      if (wideErr || !wideData?.success) {
        console.error('[lead-enrichment] wide-research failed:', wideErr || wideData?.error);
        return new Response(
          JSON.stringify({ success: false, error: 'Wide research failed to retrieve real-time sources' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aggregated = Array.isArray(wideData.aggregatedSources) ? wideData.aggregatedSources : [];
      const evidenceSources: Array<{ url: string; title?: string; content: string }> = aggregated
        .filter((s: any) => s?.url && typeof s?.content === 'string')
        .map((s: any) => ({ url: s.url, title: s.title, content: s.content }))
        .slice(0, 20);

      // 2) Determine official website (prefer user input, then best candidate from sources)
      const normalizeUrl = (u: string) => {
        try {
          const url = new URL(u.startsWith('http') ? u : `https://${u}`);
          url.hash = '';
          return url.toString();
        } catch {
          return u;
        }
      };

      const isLikelyOfficial = (u: string) => {
        const host = (() => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } })();
        if (!host) return false;
        const bad = ['wikipedia.org', 'crunchbase.com', 'bloomberg.com', 'reuters.com', 'linkedin.com', 'facebook.com', 'x.com', 'twitter.com'];
        if (bad.some(d => host.includes(d))) return false;
        return true;
      };

      let websiteUrl = companyReq.website ? normalizeUrl(companyReq.website) : undefined;
      if (!websiteUrl) {
        const candidate = evidenceSources.map(s => s.url).find(isLikelyOfficial);
        if (candidate) websiteUrl = candidate;
      }

      // 3) Use web-crawl for deep site exploration
      let siteLinks: string[] = [];
      let homepageLinks: string[] = [];

      if (websiteUrl) {
        // First, crawl the website recursively
        const crawlResult = await webCrawl(websiteUrl, companyReq.companyName, { 
          maxPages: 15, 
          maxDepth: 2 
        });
        
        if (crawlResult.totalPages > 0) {
          console.log(`[lead-enrichment] Web crawl found ${crawlResult.totalPages} pages`);
          additionalContent += crawlResult.combinedContent;
          
          // Add crawled pages to evidence
          for (const page of crawlResult.pages.slice(0, 10)) {
            if (page.wordCount > 100) {
              evidenceSources.unshift({ url: page.url, title: page.title, content: page.markdown });
            }
          }
        }

        // Also scrape homepage with boilerplate to capture social links
        const home = await scrapeUrl(websiteUrl, { onlyMainContent: false });
        additionalContent += home.markdown ? `\n\n--- Official Website (Homepage) ---\n${home.markdown}` : '';
        homepageLinks = home.links || [];

        // Map specific terms for targeted pages
        const mapTerms = ['about', 'contact', 'team', 'leadership', 'management', 'board', 'investor', 'press', 'news'];
        const mapCalls = mapTerms.map(async (term) => {
          try {
            const { data: mapData } = await supabase.functions.invoke('research-map', {
              body: { url: websiteUrl, search: term, limit: 50 },
            });
            if (mapData?.success && Array.isArray(mapData.links)) return mapData.links as string[];
            return [];
          } catch {
            return [];
          }
        });

        const mapped = (await Promise.all(mapCalls)).flat();
        const dedup = new Set<string>();
        for (const u of mapped) {
          if (!u || dedup.has(u)) continue;
          dedup.add(u);
          siteLinks.push(u);
        }

        // Scrape any remaining key pages not already crawled
        const alreadyCrawled = new Set(crawlResult.pages.map(p => p.url));
        const prioritized = siteLinks
          .filter(isLikelyOfficial)
          .filter(u => !alreadyCrawled.has(u))
          .slice(0, 5);

        const pageScrapes = await Promise.all(prioritized.map(u => scrapeUrl(u, { onlyMainContent: true })));
        pageScrapes.forEach((res, idx) => {
          const u = prioritized[idx];
          if (res.markdown && res.markdown.trim().length > 100) {
            additionalContent += `\n\n--- Official Website Page: ${u} ---\n${res.markdown}`;
            evidenceSources.unshift({ url: u, title: u, content: res.markdown });
          }
        });
      }

      // 4) Extract social profiles (prefer official website links)
      const socialFromWebsite = extractSocialProfiles([], [...homepageLinks, ...siteLinks]);
      socialProfiles.website = websiteUrl;
      socialProfiles.linkedin = socialProfiles.linkedin || socialFromWebsite.linkedin;
      socialProfiles.twitter = socialProfiles.twitter || socialFromWebsite.twitter;
      socialProfiles.others = [...new Set([...(socialProfiles.others || []), ...(socialFromWebsite.others || [])])];

      // 5) Generate STRICT grounded company profile (no estimates / no placeholders)
      const result = await generateCompanyReport(companyReq, evidenceSources, websiteUrl, socialProfiles);

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
