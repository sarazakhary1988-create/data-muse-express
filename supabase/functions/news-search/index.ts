import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================
// MANUS 1.7 MAX - NEWS SEARCH ENGINE
// ============================================
// Category-aware news fetching with server-side filtering
// Pre-categorizes results before returning to client

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// News categories matching client-side types
type NewsCategory = 
  | 'tasi' | 'nomu' | 'listing_approved' | 'stock_market'
  | 'management_change' | 'regulator_announcement' | 'regulator_regulation'
  | 'regulator_violation' | 'shareholder_change' | 'macroeconomics'
  | 'microeconomics' | 'country_outlook' | 'joint_venture'
  | 'merger_acquisition' | 'expansion_contract' | 'general';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  category: NewsCategory;
  snippet: string;
  country?: string;
  isOfficial: boolean;
}

// Category-specific search queries with keywords
const CATEGORY_QUERIES: Record<NewsCategory, string[]> = {
  tasi: [
    'TASI index Saudi main market',
    'Tadawul main market performance',
    'Saudi Exchange blue chip stocks',
  ],
  nomu: [
    'NOMU parallel market Saudi',
    'NOMU listing SME market',
    'Parallel market Saudi Exchange',
  ],
  listing_approved: [
    'CMA IPO approval Saudi',
    'Tadawul listing approved',
    'prospectus approval CMA',
    'new listing Saudi Exchange',
  ],
  stock_market: [
    'Saudi stock market trading',
    'Tadawul trading session',
    'Saudi Exchange market update',
  ],
  management_change: [
    'CEO appointed resigned Saudi',
    'chairman board director Saudi company',
    'executive appointment GCC',
  ],
  regulator_announcement: [
    'CMA announcement Saudi',
    'Capital Market Authority license',
    'CMA circular notice',
  ],
  regulator_regulation: [
    'CMA new regulation',
    'Capital Market Authority rules',
    'Saudi market regulation update',
  ],
  regulator_violation: [
    'CMA violation fine',
    'Capital Market Authority penalty',
    'trading suspension Saudi',
    'insider trading fine',
  ],
  shareholder_change: [
    'shareholder stake acquisition Saudi',
    'ownership change disclosure Tadawul',
    'major shareholder block trade',
  ],
  macroeconomics: [
    'Saudi GDP growth',
    'Saudi Arabia inflation rate',
    'SAMA monetary policy',
    'Saudi economic outlook',
  ],
  microeconomics: [
    'Saudi company earnings',
    'profit margin revenue Saudi',
    'sector performance GCC',
  ],
  country_outlook: [
    'Saudi Arabia market outlook',
    'GCC investment forecast',
    'Saudi economic analysis',
  ],
  joint_venture: [
    'joint venture agreement Saudi',
    'MOU partnership Saudi',
    'strategic alliance GCC',
  ],
  merger_acquisition: [
    'merger acquisition Saudi',
    'M&A deal GCC',
    'takeover buyout Saudi',
  ],
  expansion_contract: [
    'contract awarded Saudi',
    'expansion project Saudi',
    'new facility Saudi Arabia',
  ],
  general: [
    'Saudi business news',
    'GCC financial news',
  ],
};

// Country-specific regulator mapping
const COUNTRY_REGULATORS: Record<string, { name: string; shortName: string }> = {
  'Saudi Arabia': { name: 'Capital Market Authority', shortName: 'CMA' },
  'UAE': { name: 'Securities and Commodities Authority', shortName: 'SCA' },
  'Dubai': { name: 'Dubai Financial Services Authority', shortName: 'DFSA' },
  'Bahrain': { name: 'Central Bank of Bahrain', shortName: 'CBB' },
  'Kuwait': { name: 'Capital Markets Authority', shortName: 'CMA-KW' },
  'Qatar': { name: 'Qatar Financial Markets Authority', shortName: 'QFMA' },
  'Oman': { name: 'Capital Market Authority', shortName: 'CMA-OM' },
  'Egypt': { name: 'Financial Regulatory Authority', shortName: 'FRA' },
};

// Official source domains
const OFFICIAL_DOMAINS = [
  'cma.gov.sa', 'cma.org.sa', 'saudiexchange.sa', 'tadawul.com.sa',
  'sama.gov.sa', 'mof.gov.sa', 'sec.gov', 'reuters.com', 'bloomberg.com',
];

// Categorize news based on content - SERVER-SIDE
function categorizeNews(title: string, snippet: string): NewsCategory {
  const text = `${title} ${snippet}`.toLowerCase();
  
  // TASI/Main Market
  if (/\b(tasi|main market|tadawul main|blue chip)\b/.test(text) && !/\bnomu\b/.test(text)) {
    return 'tasi';
  }
  
  // NOMU/Parallel Market
  if (/\b(nomu|parallel market|sme market)\b/.test(text)) {
    return 'nomu';
  }
  
  // Listing Approved
  if (/\b(listing approv|ipo approv|prospectus approv|cma approv.*listing|approved for listing)\b/.test(text)) {
    return 'listing_approved';
  }
  
  // Management Changes
  if (/\b(ceo|cfo|coo|chairman|director|board member|executive).*(appoint|resign|named|hire|step down|departure)\b/.test(text) ||
      /\b(appoint|resign|named|hire).*(ceo|cfo|coo|chairman|director|board member|executive)\b/.test(text)) {
    return 'management_change';
  }
  
  // Regulator Violations
  if (/\b(violation|fine|penalty|suspended|enforcement|insider trading|manipulation)\b/.test(text) &&
      /\b(cma|regulator|authority|sec|dfsa|cbb|sca)\b/.test(text)) {
    return 'regulator_violation';
  }
  
  // Regulator Regulations
  if (/\b(regulation|rules|framework|compliance|amendment|governance)\b/.test(text) &&
      /\b(cma|regulator|authority|sec|dfsa|cbb|sca|new)\b/.test(text)) {
    return 'regulator_regulation';
  }
  
  // Regulator Announcements
  if (/\b(cma|regulator|authority|sec|dfsa|cbb|sca)\b/.test(text) &&
      /\b(announcement|announce|circular|notice|license|authorization)\b/.test(text)) {
    return 'regulator_announcement';
  }
  
  // Shareholder Changes
  if (/\b(shareholder|stake|ownership|block trade|share disposal|share acquisition|shareholding)\b/.test(text) &&
      /\b(change|acquire|sale|bought|sold|disclosure|increase|decrease)\b/.test(text)) {
    return 'shareholder_change';
  }
  
  // Macroeconomics
  if (/\b(gdp|inflation|interest rate|central bank|monetary policy|fiscal|budget|economic growth|unemployment|trade balance|foreign reserve)\b/.test(text)) {
    return 'macroeconomics';
  }
  
  // Microeconomics
  if (/\b(earnings|profit margin|revenue|cost|market share|pricing|consumer demand|supply chain|operational)\b/.test(text) &&
      !/\b(stock market|index|trading)\b/.test(text)) {
    return 'microeconomics';
  }
  
  // Country Outlook
  if (/\b(outlook|forecast|analysis|report)\b/.test(text) &&
      /\b(market|economic|country|sector|investment|growth)\b/.test(text)) {
    return 'country_outlook';
  }
  
  // Joint Venture
  if (/\b(joint venture|jv|partnership|alliance|mou|collaboration)\b/.test(text) &&
      /\b(sign|agree|form|establish|announce)\b/.test(text)) {
    return 'joint_venture';
  }
  
  // M&A
  if (/\b(merger|acquisition|m&a|buyout|takeover|consolidation)\b/.test(text)) {
    return 'merger_acquisition';
  }
  
  // Expansion/Contracts
  if (/\b(expansion|contract|project|tender|facility|market entry)\b/.test(text) &&
      /\b(award|sign|win|new|plan|open)\b/.test(text)) {
    return 'expansion_contract';
  }
  
  // Stock Market (general)
  if (/\b(stock market|trading|index|equity|market cap|exchange)\b/.test(text)) {
    return 'stock_market';
  }
  
  return 'general';
}

// Detect country from text
function detectCountry(text: string): string | undefined {
  const patterns: Record<string, RegExp> = {
    'Saudi Arabia': /\b(saudi|ksa|riyadh|jeddah|tadawul|aramco|sabic|stc|tasi|nomu)\b/i,
    'UAE': /\b(uae|dubai|abu dhabi|emirates|adx|dfm|emaar)\b/i,
    'Kuwait': /\b(kuwait|boursa)\b/i,
    'Qatar': /\b(qatar|doha|qse)\b/i,
    'Bahrain': /\b(bahrain|manama|bhb)\b/i,
    'Oman': /\b(oman|muscat|msm)\b/i,
    'Egypt': /\b(egypt|cairo|egx)\b/i,
  };
  
  for (const [country, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return country;
    }
  }
  return undefined;
}

// Check if URL is from official source
function isOfficialSource(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return OFFICIAL_DOMAINS.some(d => domain.includes(d));
  } catch {
    return false;
  }
}

// Build search queries based on requested categories
function buildSearchQueries(
  categories?: NewsCategory[],
  countries?: string[],
  customQuery?: string
): string[] {
  const queries: string[] = [];
  
  // If specific categories requested, use category-specific queries
  if (categories && categories.length > 0 && !categories.includes('general')) {
    for (const category of categories) {
      const categoryQueries = CATEGORY_QUERIES[category] || [];
      
      // If countries specified, adapt queries for those countries
      if (countries && countries.length > 0) {
        for (const country of countries) {
          const regulator = COUNTRY_REGULATORS[country];
          for (const q of categoryQueries.slice(0, 2)) {
            // Replace Saudi-specific terms with country-specific
            let adaptedQuery = q;
            if (country !== 'Saudi Arabia' && regulator) {
              adaptedQuery = q.replace(/CMA/g, regulator.shortName)
                             .replace(/Saudi/g, country)
                             .replace(/Tadawul/g, 'exchange');
            }
            queries.push(adaptedQuery);
          }
        }
      } else {
        queries.push(...categoryQueries.slice(0, 3));
      }
    }
  }
  
  // Add custom query if provided
  if (customQuery) {
    queries.push(customQuery);
  }
  
  // Default queries if none specified
  if (queries.length === 0) {
    queries.push('Saudi Arabia financial news today');
    queries.push('GCC stock market news');
    queries.push('CMA announcement Tadawul');
  }
  
  // Deduplicate and limit
  return [...new Set(queries)].slice(0, 10);
}

// Fetch news using wide-research as backend
async function fetchNewsFromWideResearch(query: string): Promise<any[]> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/wide-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        query,
        maxResults: 15,
        newsMode: true,
      }),
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.searchResults || data.results || [];
  } catch (error) {
    console.error('[NewsSearch] Fetch error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      query,
      categories,
      countries,
      sources,
      maxResults = 30,
      dateFrom,
      dateTo,
    } = body;
    
    console.log(`[NewsSearch] Request - categories: ${categories?.join(',')} countries: ${countries?.join(',')}`);
    
    // Build category-specific queries
    const searchQueries = buildSearchQueries(categories, countries, query);
    console.log(`[NewsSearch] Executing ${searchQueries.length} queries`);
    
    // Execute queries in parallel (batch of 3)
    const allResults: any[] = [];
    const batchSize = 3;
    
    for (let i = 0; i < searchQueries.length; i += batchSize) {
      const batch = searchQueries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(q => fetchNewsFromWideResearch(q)));
      batchResults.forEach(results => allResults.push(...results));
    }
    
    console.log(`[NewsSearch] Got ${allResults.length} raw results`);
    
    // Deduplicate by URL
    const urlSet = new Set<string>();
    const uniqueResults = allResults.filter(r => {
      if (!r.url || urlSet.has(r.url)) return false;
      urlSet.add(r.url);
      return true;
    });
    
    // Process and categorize results SERVER-SIDE
    const newsItems: NewsItem[] = uniqueResults
      .filter(r => r.title && r.url)
      .map(r => {
        const snippet = r.snippet || r.content || '';
        const text = `${r.title} ${snippet}`;
        const country = detectCountry(text);
        const category = categorizeNews(r.title, snippet);
        
        return {
          id: `news_${btoa(r.url).slice(0, 20)}`,
          title: r.title,
          source: r.source || new URL(r.url).hostname.replace('www.', ''),
          url: r.url,
          timestamp: r.publishDate || r.fetchedAt || new Date().toISOString(),
          category,
          snippet: snippet.slice(0, 200),
          country,
          isOfficial: isOfficialSource(r.url),
        };
      });
    
    // Filter by requested categories if specified
    let filteredNews = newsItems;
    if (categories && categories.length > 0 && !categories.includes('all')) {
      filteredNews = newsItems.filter(n => categories.includes(n.category));
    }
    
    // Filter by country if specified
    if (countries && countries.length > 0 && !countries.includes('all')) {
      filteredNews = filteredNews.filter(n => !n.country || countries.includes(n.country));
    }
    
    // Sort by timestamp (newest first)
    filteredNews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limit results
    const finalNews = filteredNews.slice(0, maxResults);
    
    // Group by category for summary
    const byCategory: Record<string, number> = {};
    finalNews.forEach(n => {
      byCategory[n.category] = (byCategory[n.category] || 0) + 1;
    });
    
    console.log(`[NewsSearch] Returning ${finalNews.length} categorized news items`);
    
    return new Response(
      JSON.stringify({
        success: true,
        news: finalNews,
        total: finalNews.length,
        byCategory,
        queriesExecuted: searchQueries.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[NewsSearch] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        news: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
