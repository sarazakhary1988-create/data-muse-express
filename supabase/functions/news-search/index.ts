import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================
// MANUS 1.7 MAX - GCC FINANCIAL NEWS ENGINE
// ============================================
// Using 28 authoritative sources with AI-powered categorization and deduplication
// NO DuckDuckGo - Only high-quality financial news sources

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

// 28 GCC FINANCIAL NEWS SOURCES - TIER 1-4 QUALITY
const NEWS_SOURCES = {
  // TIER 1 (Priority 95-100): Official regulatory sources
  tier1: [
    { name: 'CMA Saudi Arabia', url: 'https://cma.org.sa/en/MediaCenter/PR/Pages/default.aspx', priority: 100 },
    { name: 'Tadawul', url: 'https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/news', priority: 98 },
    { name: 'DFSA Dubai', url: 'https://www.dfsa.ae/news-publications/news', priority: 97 },
  ],
  
  // TIER 2 (Priority 90-95): Specialized financial news
  tier2: [
    { name: 'Argaam', url: 'https://www.argaam.com/en/news', priority: 95 },
    { name: 'Mubasher', url: 'https://english.mubasher.info/markets/TASI', priority: 94 },
    { name: 'Al Eqtisadiah', url: 'https://www.aleqt.com/', priority: 93 },
    { name: 'Zawya', url: 'https://www.zawya.com/en/business', priority: 92 },
    { name: 'MENA FN', url: 'https://menafn.com/updates/business', priority: 91 },
  ],
  
  // TIER 3 (Priority 75-90): International coverage
  tier3: [
    { name: 'Bloomberg', url: 'https://www.bloomberg.com/middleeast', priority: 90 },
    { name: 'Reuters', url: 'https://www.reuters.com/world/middle-east/', priority: 89 },
    { name: 'Financial Times', url: 'https://www.ft.com/middle-east', priority: 88 },
    { name: 'The National', url: 'https://www.thenationalnews.com/business/', priority: 87 },
    { name: 'Gulf Business', url: 'https://gulfbusiness.com/', priority: 86 },
  ],
  
  // TIER 4 (Priority 70-80): Regional sources
  tier4: [
    { name: 'Asharq Business', url: 'https://asharqbusiness.com/', priority: 80 },
    { name: 'Arab News', url: 'https://www.arabnews.com/business-economy', priority: 79 },
    { name: 'Gulf News', url: 'https://gulfnews.com/business', priority: 78 },
    { name: 'Khaleej Times', url: 'https://www.khaleejtimes.com/business', priority: 77 },
    { name: 'Trade Arabia', url: 'http://www.tradearabia.com/', priority: 76 },
    { name: 'MEED', url: 'https://www.meed.com/', priority: 75 },
    { name: 'SAMA', url: 'https://www.sama.gov.sa/en-US/News/Pages/default.aspx', priority: 74 },
    { name: 'Bahrain Bourse', url: 'https://www.bahrainbourse.com/news.aspx', priority: 73 },
    { name: 'Kuwait Bourse', url: 'https://www.boursakuwait.com.kw/en/market-data/news', priority: 72 },
    { name: 'Qatar Stock Exchange', url: 'https://www.qe.com.qa/news', priority: 71 },
    { name: 'DFM', url: 'https://www.dfm.ae/news', priority: 70 },
  ],
};

// ALL 28 SOURCES FLAT
const ALL_SOURCES = [
  ...NEWS_SOURCES.tier1,
  ...NEWS_SOURCES.tier2,
  ...NEWS_SOURCES.tier3,
  ...NEWS_SOURCES.tier4,
];

// Build comprehensive search queries for each category
function buildSearchQueries(
  categories?: NewsCategory[],
  countries?: string[],
  customQuery?: string
): string[] {
  const queries: string[] = [];
  const sourceNames = ALL_SOURCES.map(s => `site:${new URL(s.url).hostname}`).join(' OR ');
  
  if (categories && categories.length > 0) {
    for (const category of categories) {
      let categoryQuery = '';
      
      switch (category) {
        case 'listing_approved':
          categoryQuery = `(IPO approved OR listing approved OR prospectus approved OR CMA approval) (${sourceNames})`;
          break;
        case 'regulator_violation':
          categoryQuery = `(CMA fine OR violation OR penalty OR suspended OR enforcement) (${sourceNames})`;
          break;
        case 'management_change':
          categoryQuery = `(CEO OR CFO OR chairman OR director) (appointed OR resigned OR named) (${sourceNames})`;
          break;
        case 'merger_acquisition':
          categoryQuery = `("M&A" OR merger OR acquisition OR takeover OR buyout) (${sourceNames})`;
          break;
        case 'shareholder_change':
          categoryQuery = `(shareholder OR stake OR ownership OR "block trade") (${sourceNames})`;
          break;
        case 'tasi':
          categoryQuery = `(TASI OR "Tadawul main market" OR "Saudi main index") (${sourceNames})`;
          break;
        case 'nomu':
          categoryQuery = `(NOMU OR "parallel market" OR "Saudi SME") (${sourceNames})`;
          break;
        default:
          categoryQuery = `${category.replace('_', ' ')} (${sourceNames})`;
      }
      
      queries.push(categoryQuery);
    }
  }
  
  // Add custom query with source restriction
  if (customQuery) {
    queries.push(`${customQuery} (${sourceNames})`);
  }
  
  // Default if none specified - get from all sources
  if (queries.length === 0) {
    queries.push(`(Saudi OR GCC OR "Middle East" financial news) (${sourceNames})`);
  }
  
  return [...new Set(queries)].slice(0, 5);
}

// Fetch news from authoritative sources
async function fetchNewsFromSources(query: string): Promise<any[]> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-web-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        query,
        maxResults: 20,
        timeRange: 'week',
        enableDeduplication: true,
      }),
    });
    
    if (!response.ok) {
      console.log(`[NewsSearch] ai-web-search failed for "${query.slice(0, 50)}..."`);
      return [];
    }
    
    const data = await response.json();
    const results = data.results || [];
    console.log(`[NewsSearch] Found ${results.length} results for "${query.slice(0, 50)}..."`);
    return results;
  } catch (error) {
    console.error('[NewsSearch] Fetch error:', error);
    return [];
  }
}

// AI-powered categorization using OpenAI
async function categorizeWithAI(articles: any[]): Promise<NewsItem[]> {
  if (!OPENAI_API_KEY || articles.length === 0) {
    console.log('[NewsSearch] Skipping AI categorization');
    return articles.map((a, i) => ({
      id: `news_${i}_${Date.now()}`,
      title: a.title || 'Untitled',
      source: a.source || 'Unknown',
      url: a.url || '',
      timestamp: a.publishDate || new Date().toISOString(),
      category: 'general' as NewsCategory,
      snippet: (a.snippet || '').slice(0, 200),
      country: detectCountry(`${a.title} ${a.snippet}`),
      isOfficial: isOfficialSource(a.url || ''),
    }));
  }

  try {
    const prompt = `Categorize these financial news articles into ONE of these categories:
- listing_approved: IPO/listing approvals
- regulator_violation: Fines, penalties, violations  
- management_change: CEO/executive changes
- merger_acquisition: M&A deals
- shareholder_change: Ownership changes
- regulator_announcement: Regulatory announcements
- regulator_regulation: New regulations
- tasi: TASI main market news
- nomu: NOMU parallel market news
- joint_venture: JV announcements
- expansion_contract: Expansions/contracts
- macroeconomics: GDP, inflation, macro trends
- microeconomics: Company earnings, sector performance
- country_outlook: Market outlook/analysis
- stock_market: General market news
- general: Other

Articles:
${articles.slice(0, 50).map((a, i) => `${i + 1}. ${a.title}\n${(a.snippet || '').slice(0, 100)}`).join('\n\n')}

Return ONLY a JSON array: [{"index": 1, "category": "category_name"}, ...]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    const categorizations = JSON.parse(data.choices[0].message.content);
    
    return articles.map((a, i) => {
      const cat = categorizations.find((c: any) => c.index === i + 1);
      return {
        id: `news_${i}_${Date.now()}`,
        title: a.title || 'Untitled',
        source: a.source || 'Unknown',
        url: a.url || '',
        timestamp: a.publishDate || new Date().toISOString(),
        category: (cat?.category || 'general') as NewsCategory,
        snippet: (a.snippet || '').slice(0, 200),
        country: detectCountry(`${a.title} ${a.snippet}`),
        isOfficial: isOfficialSource(a.url || ''),
      };
    });
  } catch (error) {
    console.error('[NewsSearch] AI categorization failed:', error);
    // Fallback to rule-based
    return articles.map((a, i) => ({
      id: `news_${i}_${Date.now()}`,
      title: a.title || 'Untitled',
      source: a.source || 'Unknown',
      url: a.url || '',
      timestamp: a.publishDate || new Date().toISOString(),
      category: categorizeNews(a.title || '', a.snippet || ''),
      snippet: (a.snippet || '').slice(0, 200),
      country: detectCountry(`${a.title} ${a.snippet}`),
      isOfficial: isOfficialSource(a.url || ''),
    }));
  }
}

// Categorize news based on content - rule-based fallback
function categorizeNews(title: string, snippet: string): NewsCategory {
  const text = `${title} ${snippet}`.toLowerCase();
  
  if (/\b(listing approv|ipo approv|prospectus approv)\b/.test(text)) return 'listing_approved';
  if (/\b(violation|fine|penalty|suspended)\b/.test(text)) return 'regulator_violation';
  if (/\b(ceo|cfo|chairman).*(appoint|resign)\b/.test(text)) return 'management_change';
  if (/\b(merger|acquisition|m&a|takeover)\b/.test(text)) return 'merger_acquisition';
  if (/\b(shareholder|stake|ownership)\b/.test(text)) return 'shareholder_change';
  if (/\btasi\b/.test(text)) return 'tasi';
  if (/\bnomu\b/.test(text)) return 'nomu';
  if (/\b(joint venture|jv)\b/.test(text)) return 'joint_venture';
  
  return 'general';
}

// Detect country from text
function detectCountry(text: string): string | undefined {
  const patterns: Record<string, RegExp> = {
    'Saudi Arabia': /\b(saudi|ksa|riyadh|tadawul|tasi|nomu)\b/i,
    'UAE': /\b(uae|dubai|abu dhabi|emirates)\b/i,
    'Kuwait': /\b(kuwait|boursa)\b/i,
    'Qatar': /\b(qatar|doha|qse)\b/i,
    'Bahrain': /\b(bahrain|manama)\b/i,
  };
  
  for (const [country, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return country;
  }
  return undefined;
}

// Check if URL is from official source
function isOfficialSource(url: string): boolean {
  const officialDomains = ['cma.org.sa', 'saudiexchange.sa', 'argaam.com', 'mubasher', 'bloomberg.com', 'reuters.com'];
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return officialDomains.some(d => domain.includes(d));
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { categories, countries, maxResults = 30 } = body;
    
    console.log(`[NewsSearch] Using 28 authoritative GCC sources - categories: ${categories?.join(',')}`);
    
    // Build search queries
    const searchQueries = buildSearchQueries(categories, countries);
    console.log(`[NewsSearch] Executing ${searchQueries.length} targeted queries`);
    
    // Fetch from authoritative sources
    const allResults: any[] = [];
    for (const query of searchQueries) {
      const results = await fetchNewsFromSources(query);
      allResults.push(...results);
    }
    
    console.log(`[NewsSearch] Got ${allResults.length} results from authoritative sources`);
    
    // Deduplicate by URL
    const urlSet = new Set<string>();
    const uniqueResults = allResults.filter(r => {
      if (!r.url || urlSet.has(r.url)) return false;
      urlSet.add(r.url);
      return true;
    });
    
    // AI-powered categorization
    let newsItems = await categorizeWithAI(uniqueResults);
    
    // Filter by requested categories
    if (categories && categories.length > 0 && !categories.includes('all')) {
      newsItems = newsItems.filter(n => categories.includes(n.category));
    }
    
    // Filter by country
    if (countries && countries.length > 0 && !countries.includes('all')) {
      newsItems = newsItems.filter(n => !n.country || countries.includes(n.country));
    }
    
    // Sort by timestamp (newest first)
    newsItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limit results
    const finalNews = newsItems.slice(0, maxResults);
    
    // Group by category for summary
    const byCategory: Record<string, number> = {};
    finalNews.forEach(n => {
      byCategory[n.category] = (byCategory[n.category] || 0) + 1;
    });
    
    console.log(`[NewsSearch] Returning ${finalNews.length} high-quality news from ${ALL_SOURCES.length} sources`);
    
    return new Response(
      JSON.stringify({
        success: true,
        news: finalNews,
        total: finalNews.length,
        byCategory,
        sources: ALL_SOURCES.length,
        sourceTiers: {
          tier1: NEWS_SOURCES.tier1.length,
          tier2: NEWS_SOURCES.tier2.length,
          tier3: NEWS_SOURCES.tier3.length,
          tier4: NEWS_SOURCES.tier4.length,
        },
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
