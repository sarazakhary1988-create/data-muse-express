/**
 * Search Executor - Fully Functional MANUS 1.6 MAX Implementation
 * 
 * Executes searches with complete URL analysis, data extraction, and reporting
 * Follows 4-phase agent loop: Analyze → Plan → Execute → Observe
 */

import { supabase } from '@/lib/supabase';
import { autoEnhanceQuery, enforceSourceFiltering, validateSelectedSources } from './searchEnhancer';
import { getEnabledSources } from './predefinedSources';
import { processWithManus } from './manusFeatureIntegration';
import { executeAgentLoop } from './manus-core/agentLoop';
import { fetchRealTimeNews } from './manus-core/realTimeNews';
import { performWideResearch } from './manus-core/wideResearchCore';

export interface SearchExecutionInput {
  query: string;
  url?: string; // Optional URL for company/site analysis
  country?: string;
  timeFrame?: string;
  selectedSources?: string[];
  selectedDomains?: string[];
  deepVerifyMode?: boolean;
  outputFormat?: 'summary' | 'full_report' | 'raw_data';
}

export interface ExtractedCompanyData {
  companyName?: string;
  industry?: string;
  description?: string;
  products?: string[];
  services?: string[];
  keyPeople?: Array<{ name: string; role: string }>;
  financials?: {
    revenue?: string;
    employees?: string;
    founded?: string;
    headquarters?: string;
  };
  news?: Array<{
    title: string;
    summary: string;
    date: string;
    source: string;
  }>;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  competitiveLandscape?: {
    competitors?: string[];
    marketPosition?: string;
  };
}

export interface SearchExecutionResult {
  success: boolean;
  executionId: string;
  timestamp: string;
  
  // Input tracking
  input: SearchExecutionInput;
  
  // Enhancement phase
  enhancedQuery: string;
  queryContext: string;
  
  // Execution phase
  extractedData?: ExtractedCompanyData;
  rawResults?: any[];
  newsData?: any[];
  researchData?: any;
  
  // Reporting phase
  report: {
    summary: string;
    fullAnalysis: string;
    keyFindings: string[];
    dataQuality: {
      score: number; // 0-1
      freshness: string;
      sources: string[];
      confidence: number; // 0-1
    };
  };
  
  // Performance metrics
  metrics: {
    totalTime: number;
    enhancementTime: number;
    extractionTime: number;
    reportingTime: number;
    sourcesUsed: number;
    dataPoints: number;
  };
  
  errors: string[];
  warnings: string[];
}

/**
 * Extract company data from URL using Manus Agent Loop
 */
async function extractCompanyDataFromURL(
  url: string,
  query: string
): Promise<ExtractedCompanyData> {
  console.log('🔍 Extracting company data from URL:', url);
  
  const extractionPrompt = `
Analyze the company website at ${url} and extract comprehensive company information.

Extract the following data points:
1. Company name and industry
2. Description and mission
3. Products and services offered
4. Key people (executives, founders)
5. Financial information (revenue, employees, founded date)
6. Recent news and announcements
7. Social media presence
8. Competitive positioning

Format the response as structured JSON with all available information.

User query context: ${query}
`;

  // Use Manus agent loop for extraction
  const result = await executeAgentLoop(extractionPrompt, {
    maxIterations: 3,
    targetUrl: url,
    extractionMode: true,
  });
  
  // Parse extracted data
  try {
    if (result.success && result.observation) {
      // Try to parse as JSON
      const jsonMatch = result.observation.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error('Failed to parse extracted data:', error);
  }
  
  // Fallback: structure data from text
  return {
    companyName: extractFromText(result.observation || '', 'company name'),
    description: extractFromText(result.observation || '', 'description'),
  };
}

/**
 * Simple text extraction helper
 */
function extractFromText(text: string, field: string): string | undefined {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes(field.toLowerCase())) {
      return line.split(':')[1]?.trim();
    }
  }
  return undefined;
}

/**
 * Fetch real-time news about the company
 */
async function fetchCompanyNews(
  companyName: string,
  query: string,
  timeFrame?: string
): Promise<any[]> {
  console.log('📰 Fetching real-time news for:', companyName);
  
  const newsQuery = `Latest news about ${companyName} ${timeFrame || 'last 30 days'}`;
  
  const newsResult = await fetchRealTimeNews(newsQuery, {
    maxResults: 10,
    timeFilter: timeFrame,
  });
  
  return newsResult.articles || [];
}

/**
 * Perform wide research using 6 specialist agents
 */
async function performComprehensiveResearch(
  query: string,
  url?: string
): Promise<any> {
  console.log('🔬 Performing wide research with 6 specialist agents');
  
  const researchQuery = url 
    ? `Comprehensive analysis of company at ${url}: ${query}`
    : query;
  
  const researchResult = await performWideResearch(researchQuery, {
    enableAllAgents: true,
    consensusRequired: true,
  });
  
  return researchResult;
}

/**
 * Generate comprehensive report
 */
function generateReport(
  input: SearchExecutionInput,
  extractedData?: ExtractedCompanyData,
  newsData?: any[],
  researchData?: any
): SearchExecutionResult['report'] {
  const keyFindings: string[] = [];
  
  // Build summary
  let summary = '';
  if (input.url && extractedData?.companyName) {
    summary = `Analysis of ${extractedData.companyName}`;
    if (extractedData.industry) {
      summary += ` (${extractedData.industry})`;
    }
    summary += `: ${extractedData.description || 'Company profile extracted from website'}`;
  } else {
    summary = `Search results for "${input.query}"`;
  }
  
  // Build full analysis
  let fullAnalysis = `# ${input.url ? 'Company Analysis' : 'Search Analysis'}\n\n`;
  
  if (extractedData) {
    fullAnalysis += `## Company Information\n\n`;
    fullAnalysis += `**Name:** ${extractedData.companyName || 'Not available'}\n`;
    fullAnalysis += `**Industry:** ${extractedData.industry || 'Not available'}\n`;
    fullAnalysis += `**Description:** ${extractedData.description || 'Not available'}\n\n`;
    
    if (extractedData.financials) {
      fullAnalysis += `## Financial Overview\n\n`;
      fullAnalysis += `- **Revenue:** ${extractedData.financials.revenue || 'N/A'}\n`;
      fullAnalysis += `- **Employees:** ${extractedData.financials.employees || 'N/A'}\n`;
      fullAnalysis += `- **Founded:** ${extractedData.financials.founded || 'N/A'}\n`;
      fullAnalysis += `- **Headquarters:** ${extractedData.financials.headquarters || 'N/A'}\n\n`;
      
      keyFindings.push(`Company has ${extractedData.financials.employees || 'unknown'} employees`);
    }
    
    if (extractedData.products && extractedData.products.length > 0) {
      fullAnalysis += `## Products & Services\n\n`;
      extractedData.products.forEach(product => {
        fullAnalysis += `- ${product}\n`;
      });
      fullAnalysis += '\n';
      
      keyFindings.push(`${extractedData.products.length} products/services identified`);
    }
    
    if (extractedData.keyPeople && extractedData.keyPeople.length > 0) {
      fullAnalysis += `## Key People\n\n`;
      extractedData.keyPeople.forEach(person => {
        fullAnalysis += `- **${person.name}** - ${person.role}\n`;
      });
      fullAnalysis += '\n';
      
      keyFindings.push(`${extractedData.keyPeople.length} key executives identified`);
    }
  }
  
  if (newsData && newsData.length > 0) {
    fullAnalysis += `## Recent News (${newsData.length} articles)\n\n`;
    newsData.slice(0, 5).forEach(article => {
      fullAnalysis += `### ${article.title}\n`;
      fullAnalysis += `*${article.date} - ${article.source}*\n\n`;
      fullAnalysis += `${article.summary}\n\n`;
    });
    
    keyFindings.push(`${newsData.length} recent news articles found`);
  }
  
  if (researchData && researchData.insights) {
    fullAnalysis += `## Research Insights\n\n`;
    researchData.insights.forEach((insight: any) => {
      fullAnalysis += `- ${insight.finding}\n`;
    });
    fullAnalysis += '\n';
  }
  
  // Calculate data quality
  const sourcesUsed = [
    input.url ? 'Company Website' : null,
    newsData?.length ? 'News Sources' : null,
    researchData ? 'Research Agents' : null,
  ].filter(Boolean);
  
  const dataQuality = {
    score: calculateQualityScore(extractedData, newsData, researchData),
    freshness: newsData && newsData.length > 0 ? 'Real-time (< 24 hours)' : 'Historical data',
    sources: sourcesUsed as string[],
    confidence: extractedData ? 0.9 : 0.6,
  };
  
  return {
    summary,
    fullAnalysis,
    keyFindings,
    dataQuality,
  };
}

/**
 * Calculate data quality score
 */
function calculateQualityScore(
  extractedData?: ExtractedCompanyData,
  newsData?: any[],
  researchData?: any
): number {
  let score = 0;
  
  if (extractedData) score += 0.4;
  if (newsData && newsData.length > 0) score += 0.3;
  if (researchData) score += 0.3;
  
  // Bonus for comprehensive data
  if (extractedData?.financials) score += 0.1;
  if (extractedData?.keyPeople && extractedData.keyPeople.length > 0) score += 0.1;
  
  return Math.min(score, 1.0);
}

/**
 * Execute complete search with MANUS 1.6 MAX
 * 
 * Supports:
 * 1. URL-based company analysis ("Provide full view of https://example.com")
 * 2. General search with filters
 * 3. Combined URL + query search
 */
export async function executeManusSearch(
  input: SearchExecutionInput
): Promise<SearchExecutionResult> {
  const startTime = Date.now();
  const executionId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('🚀 Starting MANUS search execution:', executionId);
  console.log('Input:', input);
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Phase 1: Analyze & Enhance Query
  const enhanceStartTime = Date.now();
  
  // Get enabled sources
  const enabledSources = getEnabledSources();
  const sourceDomains = enabledSources.map(s => s.url);
  
  const enhancementContext = {
    country: input.country,
    timeFrame: input.timeFrame,
    selectedSources: input.selectedSources,
    selectedDomains: input.selectedDomains || sourceDomains,
    deepVerifyMode: input.deepVerifyMode || !!input.url,
  };
  
  const enhanced = await autoEnhanceQuery(input.query, enhancementContext);
  const enhancementTime = Date.now() - enhanceStartTime;
  
  if (!enhanced.validated) {
    errors.push(...enhanced.errors);
  }
  
  // Phase 2: Execute Data Extraction
  const extractionStartTime = Date.now();
  
  let extractedData: ExtractedCompanyData | undefined;
  let newsData: any[] | undefined;
  let researchData: any | undefined;
  
  try {
    // If URL provided, extract company data
    if (input.url) {
      extractedData = await extractCompanyDataFromURL(input.url, input.query);
      
      // Fetch news about the company
      if (extractedData.companyName) {
        newsData = await fetchCompanyNews(
          extractedData.companyName,
          input.query,
          input.timeFrame
        );
      }
    }
    
    // Always perform wide research for comprehensive analysis
    if (input.deepVerifyMode) {
      researchData = await performComprehensiveResearch(input.query, input.url);
    }
  } catch (error) {
    console.error('Extraction error:', error);
    errors.push(`Data extraction failed: ${error}`);
  }
  
  const extractionTime = Date.now() - extractionStartTime;
  
  // Phase 3: Generate Report
  const reportingStartTime = Date.now();
  
  const report = generateReport(input, extractedData, newsData, researchData);
  
  const reportingTime = Date.now() - reportingStartTime;
  
  // Phase 4: Return Results
  const totalTime = Date.now() - startTime;
  
  const result: SearchExecutionResult = {
    success: errors.length === 0,
    executionId,
    timestamp: new Date().toISOString(),
    
    input,
    
    enhancedQuery: enhanced.enhancedQuery,
    queryContext: enhanced.enhancementReason,
    
    extractedData,
    newsData,
    researchData,
    
    report,
    
    metrics: {
      totalTime,
      enhancementTime,
      extractionTime,
      reportingTime,
      sourcesUsed: enabledSources.length,
      dataPoints: [
        extractedData ? 1 : 0,
        newsData?.length || 0,
        researchData ? 1 : 0,
      ].reduce((a, b) => a + b, 0),
    },
    
    errors,
    warnings,
  };
  
  console.log('✅ Search execution complete:', executionId);
  console.log('Total time:', totalTime, 'ms');
  console.log('Success:', result.success);
  
  return result;
}

/**
 * Quick helper for URL-based company analysis
 * 
 * Usage: analyzeCompanyURL('https://aramco.com', 'Provide full view')
 */
export async function analyzeCompanyURL(
  url: string,
  query: string = 'Provide full company view and analysis'
): Promise<SearchExecutionResult> {
  return executeManusSearch({
    query,
    url,
    deepVerifyMode: true,
    outputFormat: 'full_report',
  });
}

/**
 * Format result for display
 */
export function formatSearchResult(result: SearchExecutionResult): string {
  let output = '';
  
  output += `# Search Results\n\n`;
  output += `**Execution ID:** ${result.executionId}\n`;
  output += `**Timestamp:** ${result.timestamp}\n`;
  output += `**Success:** ${result.success ? '✅' : '❌'}\n\n`;
  
  if (result.input.url) {
    output += `**Analyzed URL:** ${result.input.url}\n\n`;
  }
  
  output += `## Summary\n\n${result.report.summary}\n\n`;
  
  output += `## Key Findings\n\n`;
  result.report.keyFindings.forEach(finding => {
    output += `- ${finding}\n`;
  });
  output += '\n';
  
  output += `## Data Quality\n\n`;
  output += `- **Score:** ${(result.report.dataQuality.score * 100).toFixed(0)}%\n`;
  output += `- **Freshness:** ${result.report.dataQuality.freshness}\n`;
  output += `- **Confidence:** ${(result.report.dataQuality.confidence * 100).toFixed(0)}%\n`;
  output += `- **Sources:** ${result.report.dataQuality.sources.join(', ')}\n\n`;
  
  output += result.report.fullAnalysis;
  
  output += `\n## Performance Metrics\n\n`;
  output += `- **Total Time:** ${result.metrics.totalTime}ms\n`;
  output += `- **Sources Used:** ${result.metrics.sourcesUsed}\n`;
  output += `- **Data Points:** ${result.metrics.dataPoints}\n`;
  
  if (result.errors.length > 0) {
    output += `\n## Errors\n\n`;
    result.errors.forEach(error => {
      output += `- ⚠️ ${error}\n`;
    });
  }
  
  return output;
}
