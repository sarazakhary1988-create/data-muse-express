import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

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

interface TestRequest {
  type: 'test_person' | 'test_company';
  testData?: {
    name?: string;
    company?: string;
  };
}

interface DisambiguateRequest {
  type: 'disambiguate';
  searchType: 'person' | 'company';
  firstName?: string;
  lastName?: string;
  company?: string;
  companyName?: string;
  country?: string;
  industry?: string;
}

interface DisambiguationCandidate {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  linkedinUrl?: string;
  website?: string;
  industry?: string;
  employees?: string;
  snippet?: string;
  confidence: number;
  sources: string[];
}

type EnrichmentRequest = PersonEnrichmentRequest | CompanyEnrichmentRequest | ChatEditRequest | TestRequest | DisambiguateRequest;

// TailoredReportData - Complete report structure with all 11 sections
interface TailoredReportData {
  // Section 1: Profile Summary
  profileSummary: string;
  
  // Section 2: Company Positioning
  companyPositioning: string;
  
  // Section 3: Estimated Revenue / Annual Income
  estimatedRevenue?: string;
  estimatedAnnualIncome?: string;
  annualIncome?: {
    estimate: string;
    methodology: string;
    confidence: 'high' | 'medium' | 'low';
  };
  
  // Section 4: Years of Experience
  yearsOfExperience?: string;
  
  // Section 5: Education
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
    field?: string;
    honors?: string;
  }>;
  
  // Section 6: Skills
  skills?: string[];
  
  // Section 7: Work Experience
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    location?: string;
    description?: string;
  }>;
  
  // Section 8: Key Insights (AI-generated, 3-4 bullets)
  keyInsights: string[];
  
  // Section 9: Strengths (AI-generated, 3-4 bullets)
  strengths: string[];
  
  // Section 10: Recommendations (AI-generated, 1 paragraph)
  recommendations: string[];
  
  // Section 11: Sources & Evidence
  sources: Array<{ title: string; url: string; confidence?: number }>;
  
  // Additional metadata
  enrichmentTimestamp: string;
  reportType: 'person' | 'company';
  confidenceScore: number;
}

// BusinessEnrichment - Raw data from research
interface BusinessEnrichment {
  name: string;
  type: 'person' | 'company';
  
  // Company fields
  industry?: string;
  subIndustry?: string;
  website?: string;
  employees?: string;
  founded?: string;
  revenue?: string;
  headquarters?: string;
  
  // Person fields
  title?: string;
  currentCompany?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  
  // Shared fields
  overview?: string;
  leadership?: Array<{
    name: string;
    title: string;
    aiProfileSummary?: string;
    linkedinUrl?: string;
    tenure?: string;
  }>;
  ownership?: {
    type?: string;
    majorShareholders?: Array<{
      name: string;
      stake?: string;
      type?: string;
      aiProfileSummary?: string;
    }>;
    ultimateOwner?: string;
  };
  
  // Evidence
  rawSources: Array<{ url: string; title?: string; content: string }>;
}

// Research Finding format for integration
interface ResearchFinding {
  id: string;
  category: string;
  claim: string;
  evidence: string;
  source: string;
  sourceUrl: string;
  confidence: number;
  verificationStatus: 'verified' | 'unverified' | 'contradicted';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

function pruneEmptyDeep(value: any): any {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^not found in sources$/i.test(trimmed)) return undefined;
    if (/^not found$/i.test(trimmed)) return undefined;
    if (/^unknown$/i.test(trimmed)) return undefined;
    if (/^n\/a$/i.test(trimmed)) return undefined;
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
    const brace = candidate.match(/\{[\s\S]*\}/);
    if (!brace) return null;
    try {
      return JSON.parse(brace[0]);
    } catch {
      return null;
    }
  }
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// ============================================================================
// WEB SEARCH & SCRAPING
// ============================================================================

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

// ============================================================================
// SEARCH QUERY BUILDERS
// ============================================================================

function buildPersonSearchQueries(request: PersonEnrichmentRequest): string[] {
  const queries: string[] = [];
  const fullName = `${request.firstName || ''} ${request.lastName || ''}`.trim();
  
  if (request.linkedinUrl) {
    queries.push(`${fullName} LinkedIn profile biography`);
  }
  
  if (fullName) {
    queries.push(`"${fullName}" ${request.company || ''} professional profile biography`);
    queries.push(`"${fullName}" career work experience education background`);
    queries.push(`"${fullName}" ${request.company || ''} LinkedIn Twitter social media profiles`);
    queries.push(`"${fullName}" investor investments board member advisory`);
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

function buildCompanySearchQueries(request: CompanyEnrichmentRequest): string[] {
  const queries: string[] = [];
  const company = request.companyName;
  
  queries.push(`"${company}" site:${company.toLowerCase().replace(/\s+/g, '')}.com`);
  queries.push(`"${company}" official website about company overview`);
  queries.push(`"${company}" company overview about headquarters address phone`);
  queries.push(`"${company}" revenue funding valuation financials annual report`);
  queries.push(`"${company}" CEO founder executives leadership team biography`);
  queries.push(`"${company}" board directors members governance`);
  queries.push(`"${company}" shareholders ownership investors stake equity`);
  queries.push(`"${company}" acquisition investment funding news 2024 2025`);
  queries.push(`"${company}" LinkedIn company page social media website`);
  
  if (request.industry) {
    queries.push(`"${company}" ${request.industry} market competitors position`);
  }
  
  if (request.country && request.country !== 'All Countries') {
    queries.push(`"${company}" ${request.country} office operations headquarters`);
  }
  
  return queries.slice(0, 10);
}

// ============================================================================
// FIELD MAPPING: BusinessEnrichment → TailoredReportData
// ============================================================================

function mapEnrichmentToReportFields(enrichment: any, type: 'person' | 'company'): Partial<TailoredReportData> {
  const mapped: Partial<TailoredReportData> = {
    reportType: type,
    enrichmentTimestamp: new Date().toISOString(),
    sources: [],
  };

  if (type === 'company') {
    // Company field mappings
    mapped.companyPositioning = enrichment.companyPositioning || enrichment.marketPosition || 
      `${enrichment.name || 'Company'} operates in the ${enrichment.industry || 'business'} sector${enrichment.subIndustry ? `, specifically in ${enrichment.subIndustry}` : ''}.`;
    
    mapped.estimatedRevenue = enrichment.estimatedRevenueRange || enrichment.financials?.revenue || enrichment.revenue;
    
    mapped.profileSummary = enrichment.profileSummary || enrichment.overview || '';
    
  } else {
    // Person field mappings
    mapped.companyPositioning = enrichment.companyPositioning || 
      `${enrichment.name || 'Individual'} works at ${enrichment.company || enrichment.currentCompany || 'their organization'} as ${enrichment.title || 'a professional'}.`;
    
    mapped.estimatedAnnualIncome = enrichment.estimatedAnnualIncome || enrichment.annualIncome?.estimate;
    mapped.annualIncome = enrichment.annualIncome;
    
    mapped.yearsOfExperience = enrichment.yearsOfExperience;
    
    mapped.education = enrichment.education?.map((e: any) => ({
      degree: e.degree || '',
      institution: e.institution || '',
      year: e.year || '',
      field: e.field,
      honors: e.honors,
    }));
    
    mapped.skills = enrichment.skills;
    
    mapped.experience = enrichment.workExperience?.map((e: any) => ({
      title: e.title || '',
      company: e.company || '',
      duration: e.duration || '',
      location: e.location,
      description: e.description,
    }));
    
    mapped.profileSummary = enrichment.profileSummary || enrichment.aiProfileSummary || enrichment.overview || '';
  }

  // Common mappings
  mapped.keyInsights = enrichment.keyInsights || enrichment.insights || [];
  mapped.strengths = enrichment.strengths || [];
  mapped.recommendations = enrichment.recommendations || [];
  mapped.sources = enrichment.sources || [];
  
  // Calculate confidence score based on data completeness
  let confidencePoints = 0;
  const maxPoints = type === 'company' ? 10 : 12;
  
  if (mapped.profileSummary && mapped.profileSummary.length > 100) confidencePoints += 2;
  if (mapped.companyPositioning && mapped.companyPositioning.length > 50) confidencePoints += 1;
  if (mapped.keyInsights && mapped.keyInsights.length >= 3) confidencePoints += 2;
  if (mapped.strengths && mapped.strengths.length >= 2) confidencePoints += 1;
  if (mapped.recommendations && mapped.recommendations.length >= 1) confidencePoints += 1;
  if (mapped.sources && mapped.sources.length >= 3) confidencePoints += 1;
  
  if (type === 'person') {
    if (mapped.education && mapped.education.length > 0) confidencePoints += 1;
    if (mapped.experience && mapped.experience.length > 0) confidencePoints += 1;
    if (mapped.skills && mapped.skills.length >= 5) confidencePoints += 1;
    if (mapped.yearsOfExperience) confidencePoints += 1;
  } else {
    if (mapped.estimatedRevenue) confidencePoints += 2;
  }
  
  mapped.confidenceScore = Math.round((confidencePoints / maxPoints) * 100);
  
  return mapped;
}

// ============================================================================
// AI ENHANCEMENT: Generate Enhanced Report Sections (Uses LLM Router)
// ============================================================================

async function enhanceReportWithAI(
  baseData: any,
  type: 'person' | 'company',
  sources: Array<{ url: string; content: string }>
): Promise<{
  profileSummary: string;
  keyInsights: string[];
  strengths: string[];
  recommendations: string[];
}> {
  const entityName = baseData.name || 'Unknown';
  const sourceContent = sources.slice(0, 10).map(s => s.content.slice(0, 2000)).join('\n\n---\n\n');

  const systemPrompt = `You are an expert business analyst. Generate enhanced report sections for ${type === 'person' ? 'a person' : 'a company'}.

Based on the provided data and sources, generate:
1. profileSummary: Exactly 2 compelling sentences summarizing who this ${type} is and why they matter
2. keyInsights: Exactly 3-4 bullet points with actionable business insights
3. strengths: Exactly 3-4 bullet points highlighting competitive advantages or professional strengths
4. recommendations: Exactly 1 paragraph with specific recommendations for engagement

Return JSON with these exact fields. Be specific and actionable.`;

  const userPrompt = `Entity: ${entityName} (${type})
${type === 'person' ? `Title: ${baseData.title || 'Unknown'}` : `Industry: ${baseData.industry || 'Unknown'}`}
${type === 'person' ? `Company: ${baseData.company || 'Unknown'}` : `Revenue: ${baseData.revenue || baseData.estimatedRevenueRange || 'Unknown'}`}

Current Data:
${JSON.stringify(baseData, null, 2).slice(0, 4000)}

Source Evidence:
${sourceContent.slice(0, 8000)}

Generate enhanced sections with specific, evidence-based content.`;

  try {
    // Use the LLM Router which prioritizes local models (DeepSeek/Llama/Qwen)
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.functions.invoke('llm-router', {
      body: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        task: 'synthesis',
        preferLocal: true, // Prefer local models (Ollama/vLLM/HF TGI)
        maxTokens: 2048,
        temperature: 0.3,
      },
    });

    if (error || !data?.success) {
      console.error('[lead-enrichment] LLM Router failed:', error || data?.error);
      return {
        profileSummary: baseData.overview || baseData.profileSummary || '',
        keyInsights: baseData.keyInsights || [],
        strengths: baseData.strengths || [],
        recommendations: baseData.recommendations || [],
      };
    }

    const parsed = safeJsonParseFromModel(data.content);

    if (!parsed) {
      return {
        profileSummary: baseData.overview || baseData.profileSummary || '',
        keyInsights: baseData.keyInsights || [],
        strengths: baseData.strengths || [],
        recommendations: baseData.recommendations || [],
      };
    }

    console.log(`[lead-enrichment] AI enhancement successful for ${entityName} using ${data.model}:`, {
      profileSummaryLength: (parsed.profileSummary || '').length,
      keyInsightsCount: (parsed.keyInsights || []).length,
      strengthsCount: (parsed.strengths || []).length,
      recommendationsCount: Array.isArray(parsed.recommendations) ? parsed.recommendations.length : parsed.recommendations ? 1 : 0,
      inferenceType: data.inferenceType,
    });

    return {
      profileSummary: parsed.profileSummary || baseData.overview || baseData.profileSummary || '',
      keyInsights: parsed.keyInsights || baseData.keyInsights || [],
      strengths: parsed.strengths || baseData.strengths || [],
      recommendations: Array.isArray(parsed.recommendations) 
        ? parsed.recommendations 
        : parsed.recommendations 
          ? [parsed.recommendations] 
          : baseData.recommendations || [],
    };
  } catch (error) {
    console.error('[lead-enrichment] AI enhancement error:', error);
    return {
      profileSummary: baseData.overview || baseData.profileSummary || '',
      keyInsights: baseData.keyInsights || [],
      strengths: baseData.strengths || [],
      recommendations: baseData.recommendations || [],
    };
  }
}

// ============================================================================
// FINDINGS CONVERSION: Enrichment → Research Findings Format
// ============================================================================

function formatEnrichmentForFindings(
  enrichment: any,
  type: 'person' | 'company'
): ResearchFinding[] {
  const findings: ResearchFinding[] = [];
  const sources = enrichment.sources || [];
  
  // Helper to get source URL
  const getSourceUrl = (index: number): string => sources[index % sources.length]?.url || 'Unknown';
  const getSourceTitle = (index: number): string => sources[index % sources.length]?.title || 'Research';

  if (type === 'company') {
    // Company overview finding
    if (enrichment.overview || enrichment.profileSummary) {
      findings.push({
        id: generateUUID(),
        category: 'Company Overview',
        claim: `${enrichment.name} is ${enrichment.industry ? `a ${enrichment.industry} company` : 'an organization'}`,
        evidence: enrichment.overview || enrichment.profileSummary,
        source: getSourceTitle(0),
        sourceUrl: getSourceUrl(0),
        confidence: 0.9,
        verificationStatus: sources.length >= 3 ? 'verified' : 'unverified',
      });
    }

    // Revenue finding
    if (enrichment.estimatedRevenueRange || enrichment.financials?.revenue) {
      findings.push({
        id: generateUUID(),
        category: 'Financial Data',
        claim: `Estimated revenue: ${enrichment.estimatedRevenueRange || enrichment.financials?.revenue}`,
        evidence: `Revenue data derived from ${sources.length} research sources including financial reports and market analysis.`,
        source: getSourceTitle(1),
        sourceUrl: getSourceUrl(1),
        confidence: enrichment.estimatedRevenueRange?.includes('$') ? 0.75 : 0.5,
        verificationStatus: 'unverified',
      });
    }

    // Leadership findings
    if (enrichment.leadership && enrichment.leadership.length > 0) {
      enrichment.leadership.slice(0, 5).forEach((leader: any, idx: number) => {
        findings.push({
          id: generateUUID(),
          category: 'Leadership',
          claim: `${leader.name} serves as ${leader.title}`,
          evidence: leader.aiProfileSummary || leader.background || `Key executive at ${enrichment.name}`,
          source: getSourceTitle(2 + idx),
          sourceUrl: getSourceUrl(2 + idx),
          confidence: 0.85,
          verificationStatus: 'verified',
        });
      });
    }

    // Ownership findings
    if (enrichment.ownership?.majorShareholders) {
      enrichment.ownership.majorShareholders.slice(0, 3).forEach((owner: any, idx: number) => {
        findings.push({
          id: generateUUID(),
          category: 'Ownership',
          claim: `${owner.name} ${owner.stake ? `holds ${owner.stake} stake` : 'is a major shareholder'}`,
          evidence: owner.aiProfileSummary || `Identified as ${owner.type || 'shareholder'} of ${enrichment.name}`,
          source: getSourceTitle(5 + idx),
          sourceUrl: getSourceUrl(5 + idx),
          confidence: owner.stake ? 0.7 : 0.6,
          verificationStatus: 'unverified',
        });
      });
    }

  } else {
    // Person overview finding
    if (enrichment.aiProfileSummary || enrichment.profileSummary) {
      findings.push({
        id: generateUUID(),
        category: 'Professional Profile',
        claim: `${enrichment.name} is ${enrichment.title || 'a professional'} at ${enrichment.company || 'their organization'}`,
        evidence: enrichment.aiProfileSummary || enrichment.profileSummary,
        source: getSourceTitle(0),
        sourceUrl: getSourceUrl(0),
        confidence: 0.9,
        verificationStatus: sources.length >= 2 ? 'verified' : 'unverified',
      });
    }

    // Income finding
    if (enrichment.estimatedAnnualIncome || enrichment.annualIncome?.estimate) {
      findings.push({
        id: generateUUID(),
        category: 'Compensation',
        claim: `Estimated annual income: ${enrichment.estimatedAnnualIncome || enrichment.annualIncome?.estimate}`,
        evidence: enrichment.annualIncome?.methodology || 'Based on role, company size, and industry benchmarks',
        source: getSourceTitle(1),
        sourceUrl: getSourceUrl(1),
        confidence: enrichment.annualIncome?.confidence === 'high' ? 0.8 : 0.6,
        verificationStatus: 'unverified',
      });
    }

    // Experience finding
    if (enrichment.yearsOfExperience) {
      findings.push({
        id: generateUUID(),
        category: 'Experience',
        claim: `${enrichment.yearsOfExperience} of professional experience`,
        evidence: `Career history spanning multiple roles and organizations`,
        source: getSourceTitle(2),
        sourceUrl: getSourceUrl(2),
        confidence: 0.75,
        verificationStatus: 'verified',
      });
    }

    // Education findings
    if (enrichment.education && enrichment.education.length > 0) {
      enrichment.education.slice(0, 3).forEach((edu: any, idx: number) => {
        findings.push({
          id: generateUUID(),
          category: 'Education',
          claim: `${edu.degree} from ${edu.institution}`,
          evidence: `${edu.field ? `Studied ${edu.field}` : 'Academic background'}${edu.year ? `, ${edu.year}` : ''}`,
          source: getSourceTitle(3 + idx),
          sourceUrl: getSourceUrl(3 + idx),
          confidence: 0.85,
          verificationStatus: 'verified',
        });
      });
    }
  }

  // Key insights as findings
  if (enrichment.keyInsights) {
    enrichment.keyInsights.slice(0, 4).forEach((insight: string, idx: number) => {
      findings.push({
        id: generateUUID(),
        category: 'Key Insight',
        claim: insight,
        evidence: 'AI-generated insight based on comprehensive research analysis',
        source: 'Research Analysis',
        sourceUrl: getSourceUrl(idx),
        confidence: 0.7,
        verificationStatus: 'unverified',
      });
    });
  }

  return findings;
}

// ============================================================================
// FALLBACK SYSTEM: AI Research for Companies
// ============================================================================

async function wideResearchCompany(
  companyName: string,
  hints: { industry?: string; country?: string; website?: string }
): Promise<BusinessEnrichment | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('[lead-enrichment] OPENAI_API_KEY not configured for fallback research');
    return null;
  }

  console.log(`[lead-enrichment] Fallback: AI research for ${companyName}`);

  const systemPrompt = `You are a business intelligence researcher. Generate plausible, research-quality business data for a company based on general knowledge.

CRITICAL RULES:
1. Only provide information that would typically be publicly available
2. Use realistic ranges for financial estimates (not exact figures)
3. Mark any speculative information clearly
4. Focus on verifiable facts like industry, founding date, headquarters location
5. For leadership, only include well-known executives if publicly documented

Return JSON with this structure:
{
  "name": "Company name",
  "type": "company",
  "industry": "Primary industry",
  "subIndustry": "Specific sector",
  "website": "Official website URL",
  "founded": "Year founded if known",
  "headquarters": "Headquarters location",
  "employees": "Employee count range (e.g., 1,000-5,000)",
  "revenue": "Revenue range estimate with confidence note",
  "overview": "2-3 paragraph company overview",
  "leadership": [{"name": "CEO name", "title": "CEO", "aiProfileSummary": "Brief background"}],
  "ownership": {"type": "Private/Public", "ultimateOwner": "Parent company or founders"},
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "recommendations": ["Recommendation 1"],
  "confidenceNote": "Overall confidence assessment"
}`;

  const userPrompt = `Research company: ${companyName}
${hints.industry ? `Industry hint: ${hints.industry}` : ''}
${hints.country ? `Country hint: ${hints.country}` : ''}
${hints.website ? `Website hint: ${hints.website}` : ''}

Generate comprehensive business intelligence data. Be realistic and conservative with estimates.`;

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
        max_tokens: 3000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      console.error('[lead-enrichment] Fallback AI research failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParseFromModel(content);

    if (!parsed) return null;

    return {
      name: parsed.name || companyName,
      type: 'company',
      industry: parsed.industry,
      subIndustry: parsed.subIndustry,
      website: parsed.website || hints.website,
      employees: parsed.employees,
      founded: parsed.founded,
      revenue: parsed.revenue,
      headquarters: parsed.headquarters,
      overview: parsed.overview,
      leadership: parsed.leadership,
      ownership: parsed.ownership,
      rawSources: [{
        url: 'AI Research',
        title: 'AI-Generated Research',
        content: `Generated via AI research fallback. Confidence: ${parsed.confidenceNote || 'Medium'}`
      }]
    };
  } catch (error) {
    console.error('[lead-enrichment] Fallback research error:', error);
    return null;
  }
}

// ============================================================================
// GENERATE TAILORED REPORT (MAIN FUNCTION)
// ============================================================================

async function generateTailoredReport(
  enrichment: any,
  type: 'person' | 'company',
  sources: Array<{ url: string; content: string }>
): Promise<TailoredReportData> {
  console.log(`[lead-enrichment] Generating tailored report for ${type}`);

  // Step 1: Map enrichment fields to report structure
  const mappedFields = mapEnrichmentToReportFields(enrichment, type);

  // Step 2: Enhance with AI-generated sections
  const aiEnhanced = await enhanceReportWithAI(enrichment, type, sources);

  // Step 3: Merge all data into complete TailoredReportData
  const report: TailoredReportData = {
    // AI-enhanced sections (prioritize AI output)
    profileSummary: aiEnhanced.profileSummary || mappedFields.profileSummary || '',
    keyInsights: aiEnhanced.keyInsights.length > 0 ? aiEnhanced.keyInsights : (mappedFields.keyInsights || []),
    strengths: aiEnhanced.strengths.length > 0 ? aiEnhanced.strengths : (mappedFields.strengths || []),
    recommendations: aiEnhanced.recommendations.length > 0 ? aiEnhanced.recommendations : (mappedFields.recommendations || []),
    
    // Mapped sections
    companyPositioning: mappedFields.companyPositioning || '',
    estimatedRevenue: mappedFields.estimatedRevenue,
    estimatedAnnualIncome: mappedFields.estimatedAnnualIncome,
    annualIncome: mappedFields.annualIncome,
    yearsOfExperience: mappedFields.yearsOfExperience,
    education: mappedFields.education,
    skills: mappedFields.skills,
    experience: mappedFields.experience,
    
    // Metadata
    sources: (mappedFields.sources || []).map((s, idx) => ({
      ...s,
      confidence: Math.max(0.5, 1 - (idx * 0.05)) // Decreasing confidence for lower-ranked sources
    })),
    enrichmentTimestamp: new Date().toISOString(),
    reportType: type,
    confidenceScore: mappedFields.confidenceScore || 50,
  };

  // Ensure minimum content for each section
  if (report.keyInsights.length === 0) {
    report.keyInsights = [
      `${enrichment.name} represents a notable ${type === 'company' ? 'organization' : 'professional'} in their field.`,
      `Further research recommended to uncover additional strategic insights.`,
      `Current data suggests potential for business engagement.`
    ];
  }

  if (report.strengths.length === 0) {
    report.strengths = [
      `Established presence in their respective market or industry.`,
      `Demonstrates capability and track record based on available evidence.`
    ];
  }

  if (report.recommendations.length === 0) {
    report.recommendations = [
      `Consider reaching out through professional channels to explore potential synergies. Initial engagement should focus on understanding their current priorities and challenges before presenting any proposals.`
    ];
  }

  console.log(`[lead-enrichment] Tailored report generated with confidence score: ${report.confidenceScore}%`);

  return report;
}

// ============================================================================
// PERSON REPORT GENERATION
// ============================================================================

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
  
  const systemPrompt = `You are an expert lead intelligence analyst. Enrich this person with COMPREHENSIVE, DETAILED business-usable data.

CRITICAL: Generate detailed data for ALL 11 report sections. Every field must be populated with meaningful business intelligence.

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
    "skills": ["Skill 1", "Skill 2", "...up to 15 relevant skills"],
    "education": [
      {"degree": "Degree name", "institution": "University name", "year": "Graduation year", "field": "Field of study", "honors": "Any honors/distinctions"}
    ],
    "experience": [
      {"title": "Job title", "company": "Company name", "duration": "Start - End", "location": "Location", "description": "Detailed 2-3 sentence description of responsibilities and achievements"}
    ]
  },
  "profileSummary": "Executive-level 2 sentence summary of who this person is and why they matter",
  "companyPositioning": "Analysis of their current company's market position and their strategic role",
  "estimatedAnnualIncome": "$X,XXX,XXX - $X,XXX,XXX based on title, company, industry, location",
  "annualIncome": {
    "estimate": "$X,XXX,XXX - $X,XXX,XXX",
    "methodology": "How this was estimated based on role, company, industry, location",
    "confidence": "high/medium/low"
  },
  "yearsOfExperience": "XX years in industry, XX years in current role",
  "bestTimeToContact": {
    "prediction": "Specific days and times (e.g., Tuesday-Thursday, 9-11 AM PST)",
    "reasoning": "Explanation based on role, industry patterns, timezone",
    "confidence": "high/medium/low"
  },
  "keyInsights": [
    "Insight 1 about their career trajectory",
    "Insight 2 about their professional network",
    "Insight 3 about their business priorities",
    "Insight 4 about opportunities to engage"
  ],
  "strengths": [
    "Professional strength 1 with evidence",
    "Professional strength 2 with evidence",
    "Professional strength 3 with evidence"
  ],
  "recommendations": [
    "Recommendation for engaging with this person - one detailed paragraph covering approach, timing, and talking points"
  ],
  "investmentInterests": {
    "sectors": ["Technology sectors of interest"],
    "investmentStyle": "Their investment approach if applicable",
    "pastInvestments": ["Company A", "Company B"],
    "boardPositions": ["Board role at Company X"]
  },
  "interestIndicators": {
    "businessInterests": ["AI/ML", "FinTech", "etc."],
    "personalInterests": ["Hobbies and interests"],
    "networkingEvents": ["Conferences they attend"],
    "publicationsOrMedia": ["Media appearances, articles, podcasts"]
  },
  "insights": ["Key business insight 1", "Key business insight 2", "Key business insight 3"],
  "sources": [{"title": "Source title", "url": "Source URL"}]
}

ALL 11 REPORT SECTIONS MUST BE POPULATED:
1. profileSummary - 2 compelling sentences
2. companyPositioning - Their role in market context
3. estimatedAnnualIncome / annualIncome - Specific range with methodology
4. yearsOfExperience - Calculate from career history
5. education - Complete academic background
6. skills - 10-15 relevant professional skills
7. experience - Full work history with descriptions
8. keyInsights - 3-4 actionable bullets
9. strengths - 3-4 professional strengths
10. recommendations - 1 detailed paragraph
11. sources - All research sources used`;

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

Generate the COMPLETE detailed person profile JSON with ALL 11 sections populated.`;

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
    
    parsedData.overview = parsedData.profileSummary || parsedData.aiProfileSummary || parsedData.overview || '';
    
    if (!parsedData.keyFacts && parsedData.keyInsights) {
      parsedData.keyFacts = parsedData.keyInsights;
    }
    if (!parsedData.keyFacts && parsedData.insights) {
      parsedData.keyFacts = parsedData.insights;
    }
    
    parsedData.sources = searchResults.slice(0, 15).map(r => ({ title: r.title, url: r.url }));
    
    // Generate tailored report with all sections
    const evidenceSources = searchResults.map(r => ({ url: r.url, content: r.markdown || r.description || '' }));
    const tailoredReport = await generateTailoredReport(parsedData, 'person', evidenceSources);
    
    // Merge tailored report into response
    parsedData.tailoredReport = tailoredReport;
    parsedData.findings = formatEnrichmentForFindings(parsedData, 'person');
    
    return { success: true, data: parsedData };
  } catch (error) {
    console.error('[lead-enrichment] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// ============================================================================
// COMPANY REPORT GENERATION
// ============================================================================

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

  // FALLBACK: If insufficient sources, use AI research
  if (sourcesWithContent.length < 2) {
    console.log('[lead-enrichment] Insufficient sources, using fallback AI research');
    const fallbackData = await wideResearchCompany(request.companyName, {
      industry: request.industry,
      country: request.country,
      website: request.website,
    });
    
    if (fallbackData) {
      const tailoredReport = await generateTailoredReport(fallbackData, 'company', []);
      
      return {
        success: true,
        data: {
          ...fallbackData,
          name: request.companyName,
          type: 'company',
          overview: fallbackData.overview || '',
          keyFacts: fallbackData.leadership?.map(l => `${l.name} - ${l.title}`) || [],
          socialMedia: { linkedin: socialProfiles.linkedin, twitter: socialProfiles.twitter },
          sources: [{ title: 'AI Research', url: 'Generated via AI research fallback' }],
          tailoredReport,
          findings: formatEnrichmentForFindings(fallbackData, 'company'),
          fallbackUsed: true,
        }
      };
    }
    
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

  const systemPrompt = `You are an expert company intelligence analyst. Enrich this company with COMPREHENSIVE, DETAILED business-usable data.

CRITICAL: Generate detailed data for ALL report sections. Every field must be populated with meaningful business intelligence.

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
    "summary": "4-5 paragraph comprehensive company overview",
    "management": [
      {
        "name": "Executive name",
        "title": "C-Suite or VP title",
        "profile_summary_popup": "3-4 sentence AI-generated profile for popup display",
        "linkedin_url": "LinkedIn profile URL if found",
        "tenure": "How long in role"
      }
    ],
    "owner_founder": [
      {
        "name": "Owner/Founder name",
        "title": "Founder, Co-Founder, Owner, Chairman, etc.",
        "profile_summary_popup": "3-4 sentence AI-generated profile for popup display",
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
  "profileSummary": "Executive summary paragraph (2 sentences) about the company's market position and strategic importance",
  "companyPositioning": "Detailed analysis of market position, competitive landscape, and strategic differentiation",
  "estimatedRevenueRange": "$XXM - $XXXM or $X.XB - $X.XB with confidence level",
  "revenue": {
    "estimate": "Revenue figure or range",
    "source": "How this was determined",
    "confidence": "high/medium/low"
  },
  "offices": [
    {
      "location": "City, Country",
      "type": "Headquarters/Regional Office/R&D Center",
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
    "Strategic insight 4 about growth trajectory"
  ],
  "strengths": [
    "Competitive strength 1 with evidence",
    "Competitive strength 2 with evidence",
    "Competitive strength 3 with evidence"
  ],
  "recommendations": [
    "Business recommendation - one detailed paragraph"
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

CRITICAL: management/owner_founder profile_summary_popup fields are CLICKABLE names that show a popup. Write detailed 3-4 sentence summaries.`;

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

Generate the COMPLETE detailed company profile JSON with ALL sections populated.`;

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
      leadership: (parsed.company?.management || []).map((m: any) => ({
        name: m.name,
        title: m.title,
        aiProfileSummary: m.profile_summary_popup,
        linkedinUrl: m.linkedin_url,
        tenure: m.tenure,
        background: m.profile_summary_popup,
      })),
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
      boardMembers: (parsed.company?.board_members || []).map((b: any) => ({
        name: b.name,
        title: b.title,
        aiProfileSummary: b.profile_summary_popup,
        otherRoles: b.other_roles,
      })),
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
      keyInsights: parsed.keyInsights || [],
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
      // Try fallback
      const fallbackData = await wideResearchCompany(request.companyName, {
        industry: request.industry,
        country: request.country,
        website: request.website,
      });
      
      if (fallbackData) {
        // Generate tailored report for fallback data too
        const tailoredReport = await generateTailoredReport(fallbackData, 'company', []);
        
        return {
          success: true,
          data: {
            ...fallbackData,
            name: request.companyName,
            type: 'company',
            fallbackUsed: true,
            tailoredReport,
            findings: formatEnrichmentForFindings(fallbackData, 'company'),
          }
        };
      }
      
      return { success: false, error: 'Not enough grounded information to produce a company profile.' };
    }

    // Generate tailored report with all sections
    const tailoredReport = await generateTailoredReport(cleaned, 'company', evidenceSources);
    cleaned.tailoredReport = tailoredReport;
    cleaned.findings = formatEnrichmentForFindings(cleaned, 'company');

    return { success: true, data: cleaned };
  } catch (error) {
    console.error('[lead-enrichment] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// ============================================================================
// CHAT EDIT REPORT
// ============================================================================

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

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

async function generateTestPersonData(): Promise<any> {
  const testPerson: Record<string, any> = {
    name: 'Sarah Chen',
    type: 'person',
    title: 'Chief Technology Officer',
    company: 'TechVentures Inc.',
    location: 'San Francisco, California, USA',
    linkedinUrl: 'https://linkedin.com/in/sarahchen-cto',
    email: 'sarah.chen@techventures.com',
    phone: '+1 (415) 555-0123',
    
    profileSummary: 'Sarah Chen is a visionary technology leader with over 18 years of experience driving digital transformation at Fortune 500 companies. She is recognized as a thought leader in AI/ML implementation and cloud architecture.',
    
    companyPositioning: 'As CTO of TechVentures Inc., Sarah leads a team of 200+ engineers building next-generation enterprise software solutions. The company is positioned as a market leader in B2B SaaS with $150M ARR.',
    
    estimatedAnnualIncome: '$450,000 - $650,000',
    annualIncome: {
      estimate: '$450,000 - $650,000',
      methodology: 'Based on CTO compensation at mid-stage growth companies ($100M+ revenue) in the San Francisco Bay Area, including base salary, equity, and performance bonuses.',
      confidence: 'high'
    },
    
    yearsOfExperience: '18 years in technology, 8 years in executive leadership roles',
    
    bestTimeToContact: {
      prediction: 'Tuesday-Thursday, 7:00-8:30 AM PST or 4:00-5:30 PM PST',
      reasoning: 'Executive leaders typically have morning slots before meetings begin and end-of-day windows. Mid-week avoids Monday planning and Friday wind-down.',
      confidence: 'medium'
    },
    
    education: [
      { degree: 'Ph.D. Computer Science', institution: 'Stanford University', year: '2008', field: 'Distributed Systems', honors: 'Summa Cum Laude' },
      { degree: 'B.S. Computer Science', institution: 'MIT', year: '2004', field: 'Computer Science and Mathematics', honors: 'Valedictorian' }
    ],
    
    workExperience: [
      { title: 'Chief Technology Officer', company: 'TechVentures Inc.', duration: '2019 - Present', location: 'San Francisco, CA', description: 'Leading technology strategy and engineering organization. Scaled team from 50 to 200+ engineers. Drove migration to cloud-native architecture resulting in 40% cost reduction.' },
      { title: 'VP of Engineering', company: 'CloudScale Systems', duration: '2015 - 2019', location: 'Palo Alto, CA', description: 'Managed 80-person engineering team building enterprise cloud infrastructure. Led successful $500M acquisition by Oracle.' },
      { title: 'Senior Engineering Manager', company: 'Google', duration: '2010 - 2015', location: 'Mountain View, CA', description: 'Led development of Google Cloud Platform core services. Managed cross-functional team of 40 engineers across three time zones.' }
    ],
    
    skills: [
      'Cloud Architecture', 'AI/ML Strategy', 'Team Leadership', 'Distributed Systems', 
      'Agile Methodologies', 'Technical Vision', 'Stakeholder Management', 'M&A Integration',
      'Python', 'Go', 'Kubernetes', 'AWS', 'GCP', 'System Design', 'Executive Communication'
    ],
    
    keyInsights: [
      'Sarah has a track record of scaling engineering organizations 3-4x while maintaining high velocity - valuable insight for discussing organizational growth challenges.',
      'Her academic background in distributed systems combined with practical cloud experience makes her particularly receptive to technically-grounded conversations.',
      'Previous successful exit experience ($500M acquisition) suggests she understands the importance of strategic partnerships and vendor relationships.',
      'Active speaker at tech conferences - she values thought leadership and industry contribution, creating potential collaboration opportunities.'
    ],
    
    strengths: [
      'Deep technical expertise combined with business acumen - can bridge conversations between technical teams and executive stakeholders.',
      'Proven ability to execute large-scale digital transformation initiatives with measurable ROI outcomes.',
      'Strong network in Silicon Valley tech ecosystem through Stanford alumni connections and conference speaking engagements.',
      'Experience with high-growth environments and M&A processes provides valuable perspective on partnership discussions.'
    ],
    
    recommendations: [
      'Approach Sarah with technically substantive content rather than generic sales pitches. Given her PhD background and hands-on technical leadership, she will respond best to conversations that demonstrate deep understanding of cloud architecture challenges. Lead with a specific case study or technical white paper relevant to enterprise SaaS infrastructure. Best timing for outreach is mid-week mornings when she likely reviews external communications before internal meetings consume her day. Consider connecting through Stanford alumni networks or tech conference organizers for warm introductions.'
    ],
    
    investmentInterests: {
      sectors: ['Enterprise SaaS', 'Developer Tools', 'AI/ML Infrastructure'],
      investmentStyle: 'Angel investor focusing on technical founders',
      pastInvestments: ['DataMesh (Series A)', 'CodePilot AI (Seed)'],
      boardPositions: ['Advisory Board - TechStars Cloud Program']
    },
    
    interestIndicators: {
      businessInterests: ['Cloud Computing', 'AI/ML', 'Engineering Leadership', 'Startup Mentorship'],
      personalInterests: ['Marathon Running', 'AI Ethics Research', 'STEM Education Advocacy'],
      networkingEvents: ['KubeCon', 'Google Cloud Next', 'Grace Hopper Conference'],
      publicationsOrMedia: ['Guest on "Software Engineering Daily" podcast', 'Author of "Scaling Engineering Teams" on Medium']
    },
    
    overview: 'Sarah Chen is a highly accomplished technology executive with a unique combination of deep technical expertise and proven business leadership. With a PhD in Distributed Systems from Stanford and executive experience at Google, she brings rare credibility to conversations about enterprise technology strategy.',
    
    keyFacts: [
      'PhD in Distributed Systems from Stanford University',
      'Led engineering organization growth from 50 to 200+ engineers',
      'Previous VP of Engineering at company acquired for $500M',
      '18 years of technology industry experience',
      'Active angel investor in enterprise SaaS startups'
    ],
    
    sources: [
      { title: 'LinkedIn Profile - Sarah Chen', url: 'https://linkedin.com/in/sarahchen-cto' },
      { title: 'TechVentures Leadership Page', url: 'https://techventures.com/about/leadership' },
      { title: 'Stanford Alumni Spotlight', url: 'https://alumni.stanford.edu/spotlight/sarah-chen' },
      { title: 'Software Engineering Daily Interview', url: 'https://softwareengineeringdaily.com/sarah-chen-cto' },
      { title: 'Crunchbase Profile', url: 'https://crunchbase.com/person/sarah-chen' }
    ],
  };

  // Generate tailored report
  const tailoredReport = await generateTailoredReport(testPerson, 'person', []);
  testPerson.tailoredReport = tailoredReport;
  testPerson.findings = formatEnrichmentForFindings(testPerson, 'person');

  return testPerson;
}

async function generateTestCompanyData(): Promise<any> {
  const testCompany: Record<string, any> = {
    name: 'NexGen Analytics Corporation',
    type: 'company',
    website: 'https://nexgenanalytics.com',
    industry: 'Enterprise Software',
    subIndustry: 'Business Intelligence & Analytics',
    location: 'Boston, Massachusetts, USA',
    employees: '850-1,200',
    founded: '2015',
    
    profileSummary: 'NexGen Analytics is a fast-growing enterprise software company specializing in AI-powered business intelligence solutions. The company has achieved 150% YoY growth and is recognized as a Gartner Magic Quadrant Leader.',
    
    companyPositioning: 'NexGen Analytics occupies a strong position in the enterprise BI market, competing directly with Tableau and Power BI while differentiating through advanced AI/ML capabilities. Their focus on predictive analytics and natural language querying has attracted Fortune 500 clients seeking next-generation data insights.',
    
    estimatedRevenueRange: '$85M - $120M ARR',
    financials: {
      revenue: '$85M - $120M ARR',
      funding: '$180M total raised',
      valuation: '$800M - $1B (estimated)',
      investors: ['Sequoia Capital', 'Accel Partners', 'Insight Venture Partners'],
      lastFundingRound: { amount: '$75M', date: 'March 2024', series: 'Series D' }
    },
    
    overview: 'NexGen Analytics Corporation is transforming how enterprises leverage data for strategic decision-making. Founded in 2015 by a team of MIT data scientists, the company has grown from a startup to a market leader with over 500 enterprise customers globally. Their flagship product, NexGen Insights Platform, combines traditional BI capabilities with cutting-edge AI/ML to deliver predictive analytics, automated insights, and natural language data exploration. The company has raised $180M in funding and is positioned for a potential IPO in 2025-2026.',
    
    offices: [
      { location: 'Boston, MA, USA', type: 'Global Headquarters', address: '100 Federal Street, Suite 3200, Boston, MA 02110', phone: '+1 (617) 555-0100' },
      { location: 'San Francisco, CA, USA', type: 'West Coast Office', address: '535 Mission Street, San Francisco, CA 94105', phone: '+1 (415) 555-0200' },
      { location: 'London, UK', type: 'EMEA Headquarters', address: '30 Finsbury Square, London EC2A 1AG', phone: '+44 20 7555 0300' },
      { location: 'Singapore', type: 'APAC Office', address: '1 Raffles Place, Tower 2, Singapore 048616', phone: '+65 6555 0400' }
    ],
    
    socialMedia: {
      linkedin: 'https://linkedin.com/company/nexgen-analytics',
      twitter: 'https://twitter.com/nexgenanalytics',
      facebook: 'https://facebook.com/nexgenanalytics',
      instagram: 'https://instagram.com/nexgenanalytics',
      youtube: 'https://youtube.com/c/nexgenanalytics'
    },
    
    leadership: [
      { name: 'Dr. Michael Reynolds', title: 'Chief Executive Officer & Co-Founder', aiProfileSummary: 'Dr. Michael Reynolds is a serial entrepreneur with two successful exits prior to founding NexGen Analytics. He holds a PhD in Machine Learning from MIT and was previously VP of Product at Palantir. Under his leadership, NexGen has grown from 5 to 1,000+ employees and achieved unicorn status.', linkedinUrl: 'https://linkedin.com/in/michaelreynolds', tenure: '9 years (Founder)' },
      { name: 'Jennifer Walsh', title: 'Chief Operating Officer', aiProfileSummary: 'Jennifer Walsh brings 20 years of enterprise software experience, including 8 years at Salesforce where she led global operations. She joined NexGen in 2020 and has been instrumental in scaling the company from 200 to 1,000+ employees while maintaining operational excellence.', linkedinUrl: 'https://linkedin.com/in/jenniferwalsh', tenure: '4 years' },
      { name: 'Dr. Amit Patel', title: 'Chief Technology Officer & Co-Founder', aiProfileSummary: 'Dr. Amit Patel is a renowned AI researcher with over 50 published papers and 15 patents. He leads NexGen\'s 300-person engineering organization and has built the company\'s proprietary AI/ML platform from the ground up. Prior to NexGen, he was a Principal Scientist at Google Brain.', linkedinUrl: 'https://linkedin.com/in/amitpatel', tenure: '9 years (Founder)' },
      { name: 'Sarah Thompson', title: 'Chief Revenue Officer', aiProfileSummary: 'Sarah Thompson is a proven sales leader who previously built and led the enterprise sales organization at Snowflake during its hypergrowth phase. She has grown NexGen\'s sales team from 50 to 200+ reps and expanded the company\'s Fortune 500 customer base by 300%.', linkedinUrl: 'https://linkedin.com/in/sarahthompson-cro', tenure: '3 years' }
    ],
    
    ownership: {
      type: 'Private (VC-backed)',
      ultimateOwner: 'Founders retain 25% equity',
      majorShareholders: [
        { name: 'Sequoia Capital', stake: '22%', type: 'Lead Investor (Series B, C, D)', aiProfileSummary: 'Sequoia Capital is one of Silicon Valley\'s most prestigious venture capital firms, known for early investments in Apple, Google, and Stripe. They led NexGen\'s Series B and have remained active investors, with Partner Jim Goetz serving on the board.' },
        { name: 'Dr. Michael Reynolds', stake: '15%', type: 'Co-Founder & CEO', aiProfileSummary: 'As co-founder and CEO, Michael has retained significant equity and continues to drive the company\'s strategic vision toward an eventual IPO.' },
        { name: 'Accel Partners', stake: '12%', type: 'Investor (Series A, B)', aiProfileSummary: 'Accel Partners was the first institutional investor in NexGen, backing the founders when the company was pre-revenue based on the strength of the founding team\'s credentials.' }
      ]
    },
    
    boardMembers: [
      { name: 'Jim Goetz', title: 'Board Director', aiProfileSummary: 'Jim Goetz is a Partner at Sequoia Capital and one of the most successful venture capitalists in Silicon Valley. He led Sequoia\'s investment in WhatsApp, which was acquired by Facebook for $19B. He brings invaluable experience in scaling consumer and enterprise technology companies.', otherRoles: 'Partner at Sequoia Capital, Board Member at several portfolio companies' },
      { name: 'Ruth Porat', title: 'Independent Board Director', aiProfileSummary: 'Ruth Porat is the President and Chief Investment Officer at Alphabet Inc. Previously CFO of Morgan Stanley during the financial crisis, she brings exceptional financial expertise and public company governance experience to NexGen\'s board.', otherRoles: 'President & CIO, Alphabet Inc.' }
    ],
    
    products: ['NexGen Insights Platform', 'NexGen AI Assistant', 'NexGen Data Catalog', 'NexGen Embedded Analytics'],
    keyClients: ['JPMorgan Chase', 'Pfizer', 'Walmart', 'Boeing', 'Procter & Gamble'],
    competitors: ['Tableau (Salesforce)', 'Power BI (Microsoft)', 'Looker (Google)', 'ThoughtSpot', 'Sisense'],
    
    investmentActivity: {
      acquisitions: [
        { company: 'DataViz Pro', date: 'October 2023', amount: '$45M', rationale: 'Acquired for advanced visualization capabilities and 50-person engineering team' },
        { company: 'AI Query Labs', date: 'March 2022', amount: '$18M', rationale: 'Acquired for natural language processing technology patents' }
      ],
      fundingReceived: [
        { round: 'Series D', date: 'March 2024', amount: '$75M', investors: ['Insight Venture Partners', 'Sequoia Capital'] },
        { round: 'Series C', date: 'June 2022', amount: '$60M', investors: ['Sequoia Capital', 'Accel Partners'] },
        { round: 'Series B', date: 'January 2020', amount: '$35M', investors: ['Sequoia Capital', 'Accel Partners'] }
      ]
    },
    
    keyInsights: [
      'NexGen is on a clear IPO trajectory with $180M raised and $100M+ ARR - expect public market preparation activities in 2025.',
      'Heavy investment in AI/ML differentiation positions them well against legacy BI vendors but creates competition with emerging AI-native startups.',
      'Geographic expansion into EMEA and APAC signals international growth ambitions and potential need for local partnerships.',
      'Two strategic acquisitions in 24 months indicate active M&A strategy - may be open to technology or talent acquisitions.'
    ],
    
    strengths: [
      'Strong technical moat with proprietary AI/ML platform and 15+ patents protecting core technology.',
      'Blue-chip customer base including 5 Fortune 50 companies provides validation and case study opportunities.',
      'Well-capitalized with $180M raised and experienced board including former public company executives.',
      'Founder-led company with technical co-founders still actively driving product innovation.'
    ],
    
    recommendations: [
      'NexGen represents a high-value partnership opportunity given their growth trajectory and market position. Approach through the CRO or VP of Partnerships rather than direct sales channels. Lead with enterprise-grade technical credibility and reference customers in the Fortune 500 segment. Given their IPO preparation timeline, frame discussions around how your solution can accelerate their go-to-market or strengthen their technology platform pre-IPO. Consider warm introductions through mutual investors (Sequoia or Accel portfolio companies) for faster engagement.'
    ],
    
    recentNews: [
      { headline: 'NexGen Analytics Raises $75M Series D', date: 'March 2024', summary: 'NexGen Analytics announced a $75M Series D round led by Insight Venture Partners, bringing total funding to $180M. The company plans to use funds for international expansion and AI R&D.', url: 'https://techcrunch.com/nexgen-series-d', significance: 'Signals strong investor confidence and IPO preparation' },
      { headline: 'NexGen Named Gartner Magic Quadrant Leader', date: 'January 2024', summary: 'For the second consecutive year, NexGen Analytics was positioned as a Leader in Gartner\'s Magic Quadrant for Analytics and BI Platforms, recognized for completeness of vision and ability to execute.', url: 'https://gartner.com/mq-bi-2024', significance: 'Validates market position and supports enterprise sales efforts' },
      { headline: 'NexGen Acquires DataViz Pro for $45M', date: 'October 2023', summary: 'NexGen Analytics acquired DataViz Pro, a data visualization startup, for $45M to enhance its platform\'s visualization capabilities and add 50 engineers to its team.', url: 'https://businesswire.com/nexgen-dataviz', significance: 'Demonstrates active M&A strategy and technology investment' }
    ],
    
    keyFacts: [
      '$180M total funding raised through Series D',
      '850-1,200 employees globally across 4 offices',
      'Gartner Magic Quadrant Leader for 2 consecutive years',
      '500+ enterprise customers including Fortune 500 companies',
      'Founded by MIT PhD researchers in 2015'
    ],
    
    sources: [
      { title: 'NexGen Analytics - Official Website', url: 'https://nexgenanalytics.com' },
      { title: 'Crunchbase - NexGen Analytics', url: 'https://crunchbase.com/organization/nexgen-analytics' },
      { title: 'LinkedIn Company Page', url: 'https://linkedin.com/company/nexgen-analytics' },
      { title: 'TechCrunch - Series D Announcement', url: 'https://techcrunch.com/nexgen-series-d' },
      { title: 'Gartner Magic Quadrant Report', url: 'https://gartner.com/mq-bi-2024' },
      { title: 'Bloomberg Company Profile', url: 'https://bloomberg.com/profile/company/nexgen' }
    ],
  };

  // Generate tailored report
  const tailoredReport = await generateTailoredReport(testCompany, 'company', []);
  testCompany.tailoredReport = tailoredReport;
  testCompany.findings = formatEnrichmentForFindings(testCompany, 'company');

  return testCompany;
}

// ============================================================================
// SOCIAL PROFILES EXTRACTION
// ============================================================================

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

// ============================================================================
// DISAMBIGUATION: Find Multiple Candidates
// ============================================================================

async function findDisambiguationCandidates(
  request: DisambiguateRequest
): Promise<DisambiguationCandidate[]> {
  const candidates: DisambiguationCandidate[] = [];
  const seenIdentifiers = new Set<string>();
  
  if (request.searchType === 'person') {
    const fullName = `${request.firstName || ''} ${request.lastName || ''}`.trim();
    if (!fullName) return [];
    
    // Build multiple search queries to find different people with same name
    const queries = [
      `"${fullName}" LinkedIn profile`,
      `"${fullName}" ${request.company || ''} executive`,
      `"${fullName}" professional profile biography`,
      `"${fullName}" CEO founder CTO director`,
    ].filter(q => q.trim());
    
    const searchPromises = queries.slice(0, 3).map(q => searchWeb(q, 15, { country: request.country }));
    const searchResultArrays = await Promise.all(searchPromises);
    
    for (const results of searchResultArrays) {
      for (const result of results) {
        // Extract person info from search result
        const title = result.title || '';
        const snippet = result.snippet || result.description || '';
        const url = result.url || '';
        
        // Try to identify unique individuals
        const identifier = extractPersonIdentifier(title, snippet, url);
        if (seenIdentifiers.has(identifier)) continue;
        seenIdentifiers.add(identifier);
        
        // Parse person details from result
        const personInfo = parsePersonFromSearchResult(result, fullName);
        if (!personInfo) continue;
        
        candidates.push({
          id: generateUUID(),
          name: personInfo.name || fullName,
          title: personInfo.title,
          company: personInfo.company,
          location: personInfo.location,
          linkedinUrl: personInfo.linkedinUrl,
          snippet: snippet.slice(0, 200),
          confidence: personInfo.confidence,
          sources: [url],
        });
      }
    }
  } else {
    // Company disambiguation
    const companyName = request.companyName || '';
    if (!companyName) return [];
    
    const queries = [
      `"${companyName}" company official website`,
      `"${companyName}" headquarters ${request.country || ''}`,
      `"${companyName}" ${request.industry || ''} company profile`,
    ].filter(q => q.trim());
    
    const searchPromises = queries.slice(0, 3).map(q => searchWeb(q, 15, { country: request.country }));
    const searchResultArrays = await Promise.all(searchPromises);
    
    for (const results of searchResultArrays) {
      for (const result of results) {
        const title = result.title || '';
        const snippet = result.snippet || result.description || '';
        const url = result.url || '';
        
        const identifier = extractCompanyIdentifier(title, snippet, url);
        if (seenIdentifiers.has(identifier)) continue;
        seenIdentifiers.add(identifier);
        
        const companyInfo = parseCompanyFromSearchResult(result, companyName);
        if (!companyInfo) continue;
        
        candidates.push({
          id: generateUUID(),
          name: companyInfo.name || companyName,
          website: companyInfo.website,
          industry: companyInfo.industry,
          location: companyInfo.location,
          employees: companyInfo.employees,
          snippet: snippet.slice(0, 200),
          confidence: companyInfo.confidence,
          sources: [url],
        });
      }
    }
  }
  
  // Sort by confidence and deduplicate similar entries
  const sorted = candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
  
  return deduplicateCandidates(sorted);
}

function extractPersonIdentifier(title: string, snippet: string, url: string): string {
  // Create identifier from LinkedIn URL if present
  const linkedinMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  if (linkedinMatch) return `linkedin:${linkedinMatch[1].toLowerCase()}`;
  
  // Extract company + title as identifier
  const companyMatch = snippet.match(/(?:at|@)\s+([A-Z][A-Za-z0-9\s&]+)/);
  const titleMatch = snippet.match(/(CEO|CTO|CFO|COO|VP|Director|Manager|Founder|President|Partner|Principal)/i);
  
  if (companyMatch && titleMatch) {
    return `${titleMatch[1].toLowerCase()}:${companyMatch[1].toLowerCase().trim()}`;
  }
  
  return url.toLowerCase();
}

function extractCompanyIdentifier(title: string, snippet: string, url: string): string {
  // Use domain as identifier
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return title.toLowerCase().slice(0, 50);
  }
}

function parsePersonFromSearchResult(result: any, searchName: string): {
  name: string;
  title?: string;
  company?: string;
  location?: string;
  linkedinUrl?: string;
  confidence: number;
} | null {
  const title = result.title || '';
  const snippet = result.snippet || result.description || '';
  const url = result.url || '';
  
  // Skip irrelevant results
  if (!title.toLowerCase().includes(searchName.split(' ')[0].toLowerCase())) {
    return null;
  }
  
  // Skip news articles, Wikipedia, etc. that aren't profile pages
  const skipPatterns = ['wikipedia.org', 'news.', 'article', 'obituary', '/wiki/'];
  if (skipPatterns.some(p => url.toLowerCase().includes(p))) {
    return null;
  }
  
  let confidence = 50;
  let personTitle: string | undefined;
  let company: string | undefined;
  let location: string | undefined;
  let linkedinUrl: string | undefined;
  
  // LinkedIn profile
  if (url.includes('linkedin.com/in/')) {
    linkedinUrl = url;
    confidence += 30;
    
    // Parse "Name - Title at Company" format
    const linkedinParts = title.split(' - ');
    if (linkedinParts.length >= 2) {
      const titleCompany = linkedinParts[1];
      const atMatch = titleCompany.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
      if (atMatch) {
        personTitle = atMatch[1].trim();
        company = atMatch[2].replace(/\|.*$/, '').trim();
      } else {
        personTitle = titleCompany.replace(/\|.*$/, '').trim();
      }
    }
  }
  
  // Extract from snippet
  const titlePatterns = [
    /(?:is\s+(?:the\s+)?|as\s+(?:the\s+)?)(CEO|CTO|CFO|COO|President|VP|Vice President|Director|Founder|Partner|Managing Director|Principal|Head of [A-Za-z]+)/i,
    /(CEO|CTO|CFO|COO|President|VP|Vice President|Director|Founder|Partner|Managing Director|Principal)/i,
  ];
  
  for (const pattern of titlePatterns) {
    const match = snippet.match(pattern);
    if (match && !personTitle) {
      personTitle = match[1];
      confidence += 10;
      break;
    }
  }
  
  // Extract company from snippet
  const companyPatterns = [
    /(?:at|of|for|with)\s+([A-Z][A-Za-z0-9\s&,]+?)(?:\.|,|$|\s+(?:as|where|and))/,
    /(?:founded|co-founded|leads?|runs?)\s+([A-Z][A-Za-z0-9\s&]+)/i,
  ];
  
  for (const pattern of companyPatterns) {
    const match = snippet.match(pattern);
    if (match && !company) {
      company = match[1].trim().slice(0, 50);
      confidence += 5;
      break;
    }
  }
  
  // Extract location
  const locationMatch = snippet.match(/(?:based in|located in|from)\s+([A-Za-z\s,]+?)(?:\.|,|$)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  }
  
  return {
    name: searchName,
    title: personTitle,
    company,
    location,
    linkedinUrl,
    confidence: Math.min(confidence, 100),
  };
}

function parseCompanyFromSearchResult(result: any, searchName: string): {
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  employees?: string;
  confidence: number;
} | null {
  const title = result.title || '';
  const snippet = result.snippet || result.description || '';
  const url = result.url || '';
  
  // Skip irrelevant results
  const skipPatterns = ['wikipedia.org', 'news.', 'article', '/wiki/'];
  if (skipPatterns.some(p => url.toLowerCase().includes(p) && !url.includes('crunchbase') && !url.includes('linkedin'))) {
    return null;
  }
  
  let confidence = 40;
  let website: string | undefined;
  let industry: string | undefined;
  let location: string | undefined;
  let employees: string | undefined;
  
  // Official website detection
  const isOfficialSite = !['linkedin.com', 'crunchbase.com', 'bloomberg.com', 'reuters.com', 'facebook.com'].some(d => url.includes(d));
  if (isOfficialSite && (title.toLowerCase().includes(searchName.toLowerCase()) || url.toLowerCase().includes(searchName.toLowerCase().replace(/\s+/g, '')))) {
    website = url;
    confidence += 30;
  }
  
  // LinkedIn company page
  if (url.includes('linkedin.com/company/')) {
    confidence += 25;
  }
  
  // Crunchbase profile
  if (url.includes('crunchbase.com')) {
    confidence += 20;
  }
  
  // Extract industry from snippet
  const industryPatterns = [
    /(?:in the|operates in|focused on)\s+([A-Za-z\s&]+?)\s+(?:industry|sector|space|market)/i,
    /([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+company/i,
  ];
  
  for (const pattern of industryPatterns) {
    const match = snippet.match(pattern);
    if (match) {
      industry = match[1].trim();
      confidence += 5;
      break;
    }
  }
  
  // Extract location
  const locationMatch = snippet.match(/(?:headquartered in|based in|located in)\s+([A-Za-z\s,]+?)(?:\.|,|$)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  }
  
  // Extract employee count
  const employeeMatch = snippet.match(/(\d+[\d,]*)\s*(?:\+\s*)?employees?/i);
  if (employeeMatch) {
    employees = employeeMatch[1].replace(/,/g, '');
  }
  
  return {
    name: searchName,
    website,
    industry,
    location,
    employees,
    confidence: Math.min(confidence, 100),
  };
}

function deduplicateCandidates(candidates: DisambiguationCandidate[]): DisambiguationCandidate[] {
  const result: DisambiguationCandidate[] = [];
  const seenKeys = new Set<string>();
  
  for (const candidate of candidates) {
    // Create dedup key based on distinguishing features
    const key = candidate.linkedinUrl 
      ? candidate.linkedinUrl.toLowerCase()
      : candidate.website
        ? candidate.website.toLowerCase()
        : `${candidate.name}:${candidate.company || candidate.industry || ''}:${candidate.title || ''}`.toLowerCase();
    
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    result.push(candidate);
  }
  
  return result.slice(0, 8); // Return max 8 candidates
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request = await req.json() as EnrichmentRequest;
    
    // Handle disambiguation request
    if (request.type === 'disambiguate') {
      console.log('[lead-enrichment] Processing disambiguation request');
      const candidates = await findDisambiguationCandidates(request as DisambiguateRequest);
      return new Response(
        JSON.stringify({ success: true, candidates, count: candidates.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle test requests
    if (request.type === 'test_person') {
      console.log('[lead-enrichment] Processing test person request');
      const testData = await generateTestPersonData();
      return new Response(
        JSON.stringify({ success: true, data: testData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (request.type === 'test_company') {
      console.log('[lead-enrichment] Processing test company request');
      const testData = await generateTestCompanyData();
      return new Response(
        JSON.stringify({ success: true, data: testData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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

      // 1) Run wide research engine
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
        
        // FALLBACK: Use AI research if wide-research fails
        const fallbackData = await wideResearchCompany(companyReq.companyName, {
          industry: companyReq.industry,
          country: companyReq.country,
          website: companyReq.website,
        });
        
        if (fallbackData) {
          const tailoredReport = await generateTailoredReport(fallbackData, 'company', []);
          
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                ...fallbackData,
                type: 'company',
                keyFacts: fallbackData.leadership?.map(l => `${l.name} - ${l.title}`) || [],
                socialMedia: { linkedin: socialProfiles.linkedin, twitter: socialProfiles.twitter },
                sources: [{ title: 'AI Research', url: 'Generated via AI research fallback' }],
                tailoredReport,
                findings: formatEnrichmentForFindings(fallbackData, 'company'),
                fallbackUsed: true,
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
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

      // 2) Determine official website
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

      // 3) Web crawl for deep site exploration
      let siteLinks: string[] = [];
      let homepageLinks: string[] = [];

      if (websiteUrl) {
        const crawlResult = await webCrawl(websiteUrl, companyReq.companyName, { 
          maxPages: 15, 
          maxDepth: 2 
        });
        
        if (crawlResult.totalPages > 0) {
          console.log(`[lead-enrichment] Web crawl found ${crawlResult.totalPages} pages`);
          additionalContent += crawlResult.combinedContent;
          
          for (const page of crawlResult.pages.slice(0, 10)) {
            if (page.wordCount > 100) {
              evidenceSources.unshift({ url: page.url, title: page.title, content: page.markdown });
            }
          }
        }

        const home = await scrapeUrl(websiteUrl, { onlyMainContent: false });
        additionalContent += home.markdown ? `\n\n--- Official Website (Homepage) ---\n${home.markdown}` : '';
        homepageLinks = home.links || [];

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

      // 4) Extract social profiles
      const socialFromWebsite = extractSocialProfiles([], [...homepageLinks, ...siteLinks]);
      socialProfiles.website = websiteUrl;
      socialProfiles.linkedin = socialProfiles.linkedin || socialFromWebsite.linkedin;
      socialProfiles.twitter = socialProfiles.twitter || socialFromWebsite.twitter;
      socialProfiles.others = [...new Set([...(socialProfiles.others || []), ...(socialFromWebsite.others || [])])];

      // 5) Generate company report
      const result = await generateCompanyReport(companyReq, evidenceSources, websiteUrl, socialProfiles);

      console.log('[lead-enrichment] Company enrichment complete, success:', result.success);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Person enrichment
      const personReq = request as PersonEnrichmentRequest;

      if (personReq.linkedinUrl) {
        socialProfiles.linkedin = personReq.linkedinUrl;
        const linkedinResult = await scrapeUrl(personReq.linkedinUrl);
        additionalContent = linkedinResult.markdown;
      } else if (socialProfiles.linkedin) {
        const linkedinResult = await scrapeUrl(socialProfiles.linkedin);
        additionalContent = linkedinResult.markdown;
      }

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
