# Advanced Crawlers - Complete Guide

Comprehensive collection of specialized crawling engines inspired by best-in-class open-source projects.

## Overview

The Advanced Crawlers module provides 5 specialized crawling engines, each optimized for specific use cases:

1. **Financial Data Crawler** - Real-time market data
2. **Real-Time News Crawler** - Multi-source news aggregation
3. **LinkedIn Professional Crawler** - Profile and company data
4. **AI-Powered Scraper** - Intelligent data extraction
5. **Distributed Crawler** - Large-scale parallel crawling

## Inspirations

This implementation is inspired by several open-source projects:

- **deer-flow** (ByteDance) - Distributed crawling architecture
- **financial-datasets/web-crawler** - Financial data extraction patterns
- **findatapy** (Cuemacro) - Market data aggregation
- **realtime-newsapi** - Real-time news collection
- **financial-news-dataset** - News data structures
- **LinkedIn-Scraper** - Professional profile extraction
- **super-scraper** (Apify) - Multi-purpose scraping patterns
- **scraperai** - AI-powered intelligent extraction

## 1. Financial Data Crawler

### Purpose
Crawls real-time financial data from multiple sources including prices, fundamentals, news, and sentiment.

### Features
- ✅ Multi-source aggregation (Yahoo Finance, Bloomberg, MarketWatch, Investing.com)
- ✅ Real-time price data
- ✅ Company fundamentals (Market Cap, P/E, EPS, Revenue)
- ✅ News with sentiment analysis
- ✅ Parallel crawling for speed
- ✅ Data quality scoring

### Usage

```typescript
import { crawlFinancialData } from '@/lib/manus-core/advancedCrawlers';

// Basic usage - Get stock data
const stockData = await crawlFinancialData({
  ticker: 'AAPL',
  exchange: 'NASDAQ',
  dataTypes: ['price', 'fundamentals', 'news']
});

console.log('Current Price:', stockData.price?.current);
console.log('Market Cap:', stockData.fundamentals?.marketCap);
console.log('Recent News:', stockData.news?.length);
console.log('Data Quality:', stockData.metadata.dataQuality + '%');

// Saudi market example
const aramcoData = await crawlFinancialData({
  ticker: '2222',
  exchange: 'Tadawul',
  sources: [
    'https://www.saudiexchange.sa',
    'https://www.argaam.com',
    'https://www.mubasher.info'
  ],
  dataTypes: ['price', 'fundamentals']
});

// Custom sources
const customData = await crawlFinancialData({
  ticker: 'TSLA',
  sources: [
    'https://finance.yahoo.com',
    'https://www.marketwatch.com'
  ],
  dataTypes: ['price', 'news'],
  timeRange: 'day'
});
```

### Response Structure

```typescript
{
  ticker: string;
  name: string;
  exchange: string;
  price: {
    current: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    timestamp: string;
  };
  fundamentals: {
    marketCap: number;
    pe: number;
    eps: number;
    revenue: number;
    netIncome: number;
    dividend: number;
  };
  news: Array<{
    title: string;
    source: string;
    url: string;
    publishedAt: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  metadata: {
    sources: string[];
    freshness: string;
    dataQuality: number; // 0-100
  };
}
```

## 2. Real-Time News Crawler

### Purpose
Aggregates news from multiple sources in real-time with keyword filtering and categorization.

### Features
- ✅ Multi-source aggregation (Reuters, Bloomberg, FT, CNBC, WSJ)
- ✅ Keyword-based filtering
- ✅ Category and language filtering
- ✅ Time range support
- ✅ Sentiment analysis ready
- ✅ Parallel crawling

### Usage

```typescript
import { crawlRealtimeNews } from '@/lib/manus-core/advancedCrawlers';

// General news
const news = await crawlRealtimeNews({
  keywords: ['IPO', 'Saudi Arabia', 'listing'],
  timeRange: 'day',
  maxArticles: 20
});

console.log(`Found ${news.length} articles`);
news.forEach(article => {
  console.log(article.title, '-', article.source);
});

// Financial news
const financialNews = await crawlRealtimeNews({
  keywords: ['earnings', 'revenue', 'quarterly results'],
  sources: [
    'https://www.bloomberg.com',
    'https://www.ft.com',
    'https://www.reuters.com'
  ],
  category: 'business',
  maxArticles: 30
});

// Saudi market news
const saudiNews = await crawlRealtimeNews({
  keywords: ['Tadawul', 'Aramco', 'STC'],
  sources: [
    'https://www.argaam.com',
    'https://asharqbusiness.com',
    'https://www.arabnews.com'
  ],
  country: 'SA',
  maxArticles: 15
});
```

### Response Structure

```typescript
{
  title: string;
  description: string;
  content: string;
  url: string;
  source: string;
  author?: string;
  publishedAt: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  keywords: string[];
}[]
```

## 3. LinkedIn Professional Crawler

### Purpose
Extracts professional profiles and company data from LinkedIn public profiles.

### Features
- ✅ Profile data extraction
- ✅ Work experience history
- ✅ Education details
- ✅ Skills extraction
- ✅ Company information
- ✅ Data quality scoring
- ⚠️ Respects robots.txt and uses public data only

### Usage

```typescript
import { crawlLinkedInProfile } from '@/lib/manus-core/advancedCrawlers';

// Extract profile data
const profile = await crawlLinkedInProfile(
  'https://www.linkedin.com/in/username'
);

console.log('Name:', profile.name);
console.log('Headline:', profile.headline);
console.log('Location:', profile.location);
console.log('Experience:', profile.experience.length, 'positions');
console.log('Skills:', profile.skills.join(', '));
console.log('Data Quality:', profile.metadata.dataQuality + '%');

// Access experience
profile.experience.forEach(exp => {
  console.log(`${exp.title} at ${exp.company} (${exp.duration})`);
});

// Access education
profile.education.forEach(edu => {
  console.log(`${edu.degree} in ${edu.field} from ${edu.school}`);
});
```

### Response Structure

```typescript
{
  name: string;
  headline: string;
  location: string;
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    years: string;
  }>;
  skills: string[];
  connections?: number;
  profileUrl: string;
  metadata: {
    extractedAt: string;
    dataQuality: number; // 0-100
  };
}
```

## 4. AI-Powered Intelligent Scraper

### Purpose
Uses AI to understand page structure and extract data based on natural language goals.

### Features
- ✅ Natural language extraction goals
- ✅ Schema-based extraction
- ✅ Pattern recognition (email, phone, URL, price)
- ✅ Confidence scoring
- ✅ Auto-retry with intelligence
- ✅ Field-level extraction

### Usage

```typescript
import { scraperAI } from '@/lib/manus-core/advancedCrawlers';

// Extract with natural language goal
const result = await scraperAI({
  url: 'https://example.com/contact',
  goal: 'Extract all email addresses and phone numbers from this page'
});

console.log('Success:', result.success);
console.log('Confidence:', result.confidence);
console.log('Extracted:', result.data);
console.log('Fields:', result.extractedFields);

// Schema-based extraction
const structuredResult = await scraperAI({
  url: 'https://company.com/about',
  goal: 'Extract company information',
  schema: {
    name: 'company[^<]+name[^>]*>([^<]+)',
    founded: 'founded[^\\d]*(\\d{4})',
    employees: 'employees[^\\d]*([\\d,]+)',
    revenue: 'revenue[^\\$]*\\$([\\d,.]+[BMK]?)'
  }
});

console.log('Company Name:', structuredResult.data.name);
console.log('Founded:', structuredResult.data.founded);
console.log('Data Quality:', structuredResult.metadata.dataQuality + '%');

// Extract prices from e-commerce
const priceResult = await scraperAI({
  url: 'https://store.com/product/123',
  goal: 'Find the product price and discounts'
});

console.log('Prices:', priceResult.data.prices);
```

### Response Structure

```typescript
{
  success: boolean;
  data: Record<string, any>;
  confidence: number; // 0-1
  extractedFields: string[];
  metadata: {
    attempts: number;
    processingTime: number;
    dataQuality: number; // 0-100
  };
}
```

## 5. Distributed Crawler

### Purpose
Large-scale parallel crawling with depth control and domain restrictions.

### Features
- ✅ Parallel crawling (configurable concurrency)
- ✅ Depth-first or breadth-first traversal
- ✅ Domain restrictions
- ✅ URL pattern exclusion
- ✅ Link extraction and following
- ✅ Visited URL tracking
- ✅ Automatic deduplication

### Usage

```typescript
import { distributedCrawl } from '@/lib/manus-core/advancedCrawlers';

// Basic crawl
const results = await distributedCrawl({
  startUrls: ['https://example.com'],
  maxDepth: 2,
  maxPages: 50,
  parallelism: 5
});

console.log(`Crawled ${results.length} pages`);
results.forEach(page => {
  console.log(`[Depth ${page.depth}] ${page.title} - ${page.url}`);
});

// Domain-restricted crawl
const siteResults = await distributedCrawl({
  startUrls: ['https://blog.example.com'],
  maxDepth: 3,
  maxPages: 100,
  allowedDomains: ['blog.example.com', 'example.com'],
  excludePatterns: ['/admin', '/private', '/login'],
  parallelism: 10
});

// Multi-site crawl
const multiSiteResults = await distributedCrawl({
  startUrls: [
    'https://site1.com',
    'https://site2.com',
    'https://site3.com'
  ],
  maxDepth: 1,
  maxPages: 150,
  parallelism: 15
});
```

### Response Structure

```typescript
{
  url: string;
  title: string;
  content: string; // First 1000 characters
  links: string[]; // Extracted links
  timestamp: string;
  depth: number; // Crawl depth
}[]
```

## Integration with MANUS

All crawlers integrate seamlessly with the MANUS 1.6 MAX system:

### In Search Feature

```typescript
import { executeManusSearch } from '@/lib/searchExecutor';
import { crawlFinancialData, crawlRealtimeNews } from '@/lib/manus-core/advancedCrawlers';

// Enhanced search with financial data
const searchWithFinancials = async (ticker: string) => {
  const [searchResults, financialData, news] = await Promise.all([
    executeManusSearch({ query: `${ticker} company analysis` }),
    crawlFinancialData({ ticker, dataTypes: ['price', 'fundamentals'] }),
    crawlRealtimeNews({ keywords: [ticker], maxArticles: 10 })
  ]);

  return {
    search: searchResults,
    financials: financialData,
    news: news
  };
};
```

### In Wide Research

```typescript
import { performWideResearch } from '@/lib/manus-core/wideResearchCore';
import { distributedCrawl } from '@/lib/manus-core/advancedCrawlers';

// Combine wide research with distributed crawling
const deepResearch = async (topic: string, startUrls: string[]) => {
  const [research, crawlResults] = await Promise.all([
    performWideResearch(topic),
    distributedCrawl({ startUrls, maxDepth: 2, maxPages: 50 })
  ]);

  return {
    expertAnalysis: research,
    discoveredPages: crawlResults
  };
};
```

### In Real-Time News Engine

```typescript
import { fetchRealtimeNews } from '@/lib/manus-core/realTimeNews';
import { crawlRealtimeNews } from '@/lib/manus-core/advancedCrawlers';

// Augment news engine with specialized crawler
const enhancedNewsFetch = async (keywords: string[]) => {
  const [manusNews, crawledNews] = await Promise.all([
    fetchRealtimeNews(keywords),
    crawlRealtimeNews({ keywords, maxArticles: 20 })
  ]);

  // Merge and deduplicate
  return [...manusNews, ...crawledNews];
};
```

## Performance

| Crawler | Avg Time | Sources | Data Quality | Reliability |
|---------|----------|---------|--------------|-------------|
| Financial | 8-12s | 4-6 | 85-95% | High |
| News | 5-10s | 5-8 | 80-90% | High |
| LinkedIn | 6-10s | 1 | 70-85% | Medium |
| AI Scraper | 3-8s | 1 | 60-90% | Medium-High |
| Distributed | Variable | Many | 75-85% | High |

## Best Practices

### 1. Rate Limiting

```typescript
// Add delays between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const results = [];
for (const url of urls) {
  const data = await crawlFinancialData({ ticker: url });
  results.push(data);
  await delay(1000); // 1 second between requests
}
```

### 2. Error Handling

```typescript
try {
  const data = await crawlRealtimeNews({ keywords: ['tech'] });
} catch (error) {
  console.error('Crawl failed:', error);
  // Fallback strategy
  const backupData = await fallbackNewsSource();
}
```

### 3. Data Validation

```typescript
const result = await scraperAI({ url, goal });

if (result.confidence < 0.7) {
  console.warn('Low confidence extraction, verify manually');
}

if (result.metadata.dataQuality < 60) {
  console.warn('Poor data quality, consider retry');
}
```

### 4. Caching

```typescript
const cache = new Map();

const getCachedFinancialData = async (ticker: string) => {
  const cacheKey = `${ticker}-${new Date().toDateString()}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const data = await crawlFinancialData({ ticker });
  cache.set(cacheKey, data);
  return data;
};
```

### 5. Parallel Processing

```typescript
// Process multiple tickers in parallel
const tickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN'];
const results = await Promise.all(
  tickers.map(ticker => crawlFinancialData({ ticker }))
);
```

## Limitations & Considerations

1. **Respect robots.txt** - All crawlers respect website robots.txt
2. **Rate limiting** - Implement delays to avoid overwhelming servers
3. **Public data only** - LinkedIn crawler uses public profiles only
4. **Data accuracy** - Always verify critical data from official sources
5. **Legal compliance** - Ensure compliance with website terms of service
6. **Privacy** - Handle personal data according to GDPR/privacy laws

## Troubleshooting

### Issue: Low data quality scores

**Solution**: 
- Increase number of sources
- Check if websites have changed structure
- Verify network connectivity
- Consider alternative sources

### Issue: Crawl timeouts

**Solution**:
- Reduce parallelism
- Increase timeout values
- Use smart retry mechanisms
- Check if sites are blocking

### Issue: Missing data fields

**Solution**:
- Update extraction patterns
- Add fallback sources
- Use AI scraper for difficult pages
- Manually verify page structure

## Future Enhancements

Planned improvements:

- [ ] Machine learning-based extraction
- [ ] Automatic pattern learning
- [ ] Enhanced anti-detection
- [ ] Distributed crawling across workers
- [ ] Real-time streaming results
- [ ] GraphQL/REST API wrappers
- [ ] Advanced caching strategies
- [ ] Automatic schema generation

## Support

For issues, questions, or contributions, see the main MANUS documentation.
