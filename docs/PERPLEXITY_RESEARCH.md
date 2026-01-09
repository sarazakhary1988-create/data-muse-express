# Perplexity Research Engine - Open Source Implementation

**Complete guide for the open-source Perplexity-style research engine with Playwright automation**

## Overview

This is an open-source implementation inspired by Perplexity AI's research capabilities. **NO API required** - uses Playwright for web automation combined with LLM orchestration for powerful, citation-backed research.

### Key Features

- ✅ **No API Required** - Completely open-source, no Perplexity API needed
- ✅ **Playwright Automation** - Advanced web scraping with JavaScript execution
- ✅ **Multi-Source Research** - Aggregates information from multiple sources
- ✅ **Automatic Citations** - Generates inline citations [1], [2], etc.
- ✅ **Fact Verification** - Cross-references claims across sources
- ✅ **Quality Evaluation** - Perplexity Eval-style scoring (0-100%)
- ✅ **Real-Time Data** - Always fetches live, current information
- ✅ **LLM Integration** - Works with all 15+ MANUS models

## Architecture

### Research Pipeline

```
User Query
    ↓
1. Query Understanding (LLM)
    ├─ Decompose into sub-questions
    ├─ Identify key entities
    └─ Refine search terms
    ↓
2. Web Search (Playwright)
    ├─ Search Google/Bing/DuckDuckGo
    ├─ Extract top results
    └─ Filter by relevance
    ↓
3. Content Extraction (Playwright)
    ├─ Navigate to each URL
    ├─ Execute JavaScript
    ├─ Extract article text
    └─ Capture metadata
    ↓
4. Fact Verification
    ├─ Extract key claims
    ├─ Cross-reference sources
    ├─ Assign credibility scores
    └─ Detect contradictions
    ↓
5. Answer Synthesis (LLM)
    ├─ Combine information
    ├─ Generate coherent answer
    ├─ Add inline citations
    └─ Provide reasoning
    ↓
6. Quality Evaluation (Perplexity Eval)
    ├─ Accuracy scoring
    ├─ Completeness assessment
    ├─ Source quality rating
    └─ Overall score (0-100%)
    ↓
Research Result
```

## Installation & Setup

### 1. Install Playwright

```bash
npm install playwright
npx playwright install chromium
```

### 2. Import the Research Engine

```typescript
import {
  perplexityResearch,
  quickResearch,
  formatResearchResult,
  evaluateResearch
} from '@/lib/manus-core';
```

## Usage

### Basic Research

```typescript
// Simple question research
const result = await quickResearch(
  "What are the latest developments in quantum computing?"
);

console.log(result); // Formatted research report
```

### Advanced Research

```typescript
import { perplexityResearch } from '@/lib/manus-core';

const result = await perplexityResearch({
  question: "What is Saudi Aramco's revenue for 2024?",
  context: "Focus on official financial reports",
  filters: {
    timeRange: 'year',
    sources: ['saudiexchange.sa', 'bloomberg.com', 'reuters.com'],
    language: 'en',
    region: 'SA'
  }
}, {
  maxSources: 10,
  usePlaywright: true,
  enableEvaluation: true
});

console.log('Answer:', result.answer);
console.log('Confidence:', result.confidence);
console.log('Quality Score:', result.evaluationScore);
console.log('Sources:', result.sources.length);
```

### Research with Custom Filters

```typescript
// Research specific company
const companyResearch = await perplexityResearch({
  question: "STC quarterly earnings",
  filters: {
    timeRange: 'month',
    sources: [
      'stc.com.sa',
      'saudiexchange.sa',
      'argaam.com',
      'mubasher.info'
    ]
  }
});

// Employee/Executive search
const peopleResearch = await perplexityResearch({
  question: "Who is the CEO of Saudi Telecom Company?",
  context: "Find current executive information"
});

// Financial data research
const financialResearch = await perplexityResearch({
  question: "Aramco stock price and market cap",
  filters: {
    timeRange: 'day', // Today's data only
    sources: ['tadawul.sa', 'finance.yahoo.com', 'bloomberg.com']
  }
});
```

## Research Result Structure

```typescript
interface ResearchResult {
  // Main answer with inline citations
  answer: string;
  
  // Concise summary (1-2 sentences)
  summary: string;
  
  // All sources used
  sources: ResearchSource[];
  
  // Suggested follow-up questions
  relatedQuestions: string[];
  
  // Confidence in the answer (0-1)
  confidence: number;
  
  // Quality evaluation score (0-1)
  evaluationScore: number;
  
  // Step-by-step reasoning
  reasoning: string[];
  
  // Citation details
  citations: Citation[];
  
  // Performance metrics
  metadata: {
    queryTime: number;        // Milliseconds
    sourcesChecked: number;   // Total sources examined
    factsVerified: number;    // Facts cross-referenced
    llmCalls: number;         // LLM API calls made
  };
}
```

## Playwright Integration

### Search with Playwright

The engine uses Playwright to:
- **Search engines**: Google, Bing, DuckDuckGo automation
- **Dynamic content**: Executes JavaScript for SPA/dynamic sites
- **Anti-detection**: Rotates user agents, handles CAPTCHAs
- **Network monitoring**: Intercepts API calls
- **Screenshots**: Captures page state for verification

### Example: Custom Scraping Rules

```typescript
import {
  playwrightScrapeWithRules,
  NEWS_ARTICLE_RULES,
  COMPANY_PAGE_RULES
} from '@/lib/manus-core';

// Scrape news article
const article = await playwrightScrapeWithRules(
  'https://www.bloomberg.com/article',
  NEWS_ARTICLE_RULES
);

// Scrape company page
const company = await playwrightScrapeWithRules(
  'https://www.saudiexchange.sa/en/companies/aramco',
  COMPANY_PAGE_RULES
);
```

### Batch Scraping

```typescript
import { playwrightBatchScrape } from '@/lib/manus-core';

const urls = [
  'https://www.argaam.com/article1',
  'https://www.mubasher.info/article2',
  'https://www.bloomberg.com/article3'
];

const results = await playwrightBatchScrape(urls, {
  browser: 'chromium',
  headless: true,
  timeout: 30000
});
```

## Perplexity Eval - Quality Scoring

The research quality is evaluated on multiple dimensions:

### Evaluation Metrics

| Metric | Weight | Description |
|--------|--------|-------------|
| **Accuracy** | 30% | Factual correctness based on source credibility |
| **Completeness** | 20% | How comprehensive the answer is |
| **Relevance** | 25% | How relevant to the original query |
| **Source Quality** | 15% | Reputation and diversity of sources |
| **Coherence** | 10% | How well-structured the answer is |

### Quality Score Interpretation

- **90-100%** - Excellent: Highly accurate, comprehensive, well-cited
- **80-89%** - Very Good: Accurate with minor gaps
- **70-79%** - Good: Generally accurate, needs more sources
- **60-69%** - Fair: Some inaccuracies or incomplete information
- **Below 60%** - Poor: Significant issues, needs more research

### Example: Evaluate Research Quality

```typescript
import { evaluateResearch } from '@/lib/manus-core';

const score = await evaluateResearch(
  query,
  answer,
  sources,
  citations
);

console.log(`Research Quality: ${(score * 100).toFixed(1)}%`);

// Detailed metrics
if (score >= 0.9) {
  console.log('✅ Excellent research quality');
} else if (score >= 0.7) {
  console.log('⚠️  Good but could be improved');
} else {
  console.log('❌ Low quality - needs more sources');
}
```

## Advanced Features

### 1. Multi-Language Support

```typescript
const result = await perplexityResearch({
  question: "ما هي أحدث التطورات في الذكاء الاصطناعي؟", // Arabic
  filters: {
    language: 'ar',
    region: 'SA',
    sources: ['aleqt.com', 'argaam.com']
  }
});
```

### 2. Time-Filtered Research

```typescript
// Last 24 hours only
const latest = await perplexityResearch({
  question: "Tadawul all share index today",
  filters: {
    timeRange: 'day'
  }
});

// Last week
const weekly = await perplexityResearch({
  question: "IPOs announced this week",
  filters: {
    timeRange: 'week'
  }
});
```

### 3. Domain-Specific Research

```typescript
// Financial research
const financialResult = await perplexityResearch({
  question: "Saudi Arabia's non-oil GDP growth",
  filters: {
    sources: [
      'sama.gov.sa',           // Central bank
      'gastat.gov.sa',         // Statistics authority
      'imf.org',               // IMF data
      'worldbank.org'          // World Bank
    ]
  }
});

// Company research
const companyResult = await perplexityResearch({
  question: "STC 5G network coverage in Saudi Arabia",
  filters: {
    sources: [
      'stc.com.sa',            // Official company site
      'saudiexchange.sa',      // Stock exchange
      'argaam.com',            // Market data
      'citc.gov.sa'            // Telecom regulator
    ]
  }
});
```

## Integration with MANUS Features

### 1. With Search Engine

```typescript
import { executeEnhancedSearch } from '@/lib/searchEnhancer';
import { perplexityResearch } from '@/lib/manus-core';

// Enhanced search uses Perplexity for deep research
const searchResult = await executeEnhancedSearch({
  query: 'Saudi Arabian Oil Company financial performance',
  usePerplexity: true,  // Enable Perplexity research
  deepVerifyMode: true
});
```

### 2. With Wide Research

```typescript
import { WideResearchOrchestrator } from '@/lib/manus-core';
import { perplexityResearch } from '@/lib/manus-core';

// Use Perplexity as one of the research tools
const orchestrator = new WideResearchOrchestrator();
orchestrator.addResearchMethod('perplexity', async (query) => {
  return await perplexityResearch({ question: query });
});
```

### 3. With Real-Time News

```typescript
import { getRealtimeNews } from '@/lib/manus-core';
import { perplexityResearch } from '@/lib/manus-core';

// Combine real-time news with deep research
const news = await getRealtimeNews('quantum computing');
const research = await perplexityResearch({
  question: 'What are the latest quantum computing breakthroughs?',
  context: `Recent news: ${news.map(a => a.title).join(', ')}`
});
```

## Performance Optimization

### 1. Parallel Source Scraping

The engine automatically scrapes multiple sources in parallel for speed:

```typescript
// Scrapes 10 sources simultaneously
const result = await perplexityResearch({
  question: "Latest AI developments",
  }, {
  maxSources: 10  // All scraped in parallel
});
```

### 2. Smart Caching

```typescript
// TODO: Implement caching layer
// Cache results for frequently asked questions
// Refresh cache based on time sensitivity
```

### 3. Timeout Configuration

```typescript
const result = await perplexityResearch({
  question: "Complex research query"
}, {
  timeout: 60000  // 60 second timeout
});
```

## Troubleshooting

### Common Issues

#### 1. Playwright Not Installed

**Error**: `Cannot find module 'playwright'`

**Solution**:
```bash
npm install playwright
npx playwright install chromium
```

#### 2. Timeout Errors

**Error**: `Navigation timeout exceeded`

**Solution**: Increase timeout or use headless mode
```typescript
const result = await perplexityResearch(query, {
  timeout: 60000,  // Increase to 60s
});
```

#### 3. No Sources Found

**Error**: `No sources found for query`

**Solution**: Broaden your search or check source availability
```typescript
const result = await perplexityResearch({
  question: "Broader search query",
  filters: {
    sources: [] // Remove source restrictions
  }
});
```

## Comparison: This vs Perplexity API

| Feature | This (Open Source) | Perplexity API |
|---------|-------------------|----------------|
| **Cost** | Free (only LLM costs) | Paid API ($5/1k requests) |
| **Customization** | Full control | Limited |
| **Sources** | Any website | Perplexity's index |
| **Playwright** | ✅ Built-in | ❌ Not available |
| **Evaluation** | ✅ Perplexity Eval | ❌ Not exposed |
| **Real-time** | ✅ 100% live data | ✅ Live data |
| **Citations** | ✅ Automatic | ✅ Automatic |
| **Privacy** | ✅ Self-hosted | ❌ Cloud-based |

## Best Practices

### 1. Specific Questions Get Better Results

```typescript
// ❌ Too vague
await perplexityResearch({ question: "Tell me about oil" });

// ✅ Specific and targeted
await perplexityResearch({
  question: "What was Saudi Aramco's net profit in Q3 2024?",
  filters: { timeRange: 'month', sources: ['aramco.com', 'saudiexchange.sa'] }
});
```

### 2. Use Source Filtering for Accuracy

```typescript
// Research financial data from official sources only
await perplexityResearch({
  question: "STC quarterly revenue",
  filters: {
    sources: [
      'stc.com.sa',           // Official investor relations
      'saudiexchange.sa',     // Official exchange data
      'sama.gov.sa'           // Regulatory data
    ]
  }
});
```

### 3. Enable Evaluation for Important Research

```typescript
const result = await perplexityResearch(query, {
  enableEvaluation: true  // Get quality score
});

if (result.evaluationScore < 0.7) {
  console.warn('Low quality research - consider refining query');
}
```

## Future Enhancements

- [ ] Caching layer for faster repeated queries
- [ ] Multi-model consensus (combine results from multiple LLMs)
- [ ] Visual content analysis (screenshots, charts)
- [ ] Real-time monitoring (track topics over time)
- [ ] Export to PDF/Markdown with citations
- [ ] API server wrapper for easy deployment

## Related Documentation

- [MANUS 1.6 MAX Architecture](../ARCHITECTURE.md)
- [Search Improvements](./SEARCH_IMPROVEMENTS.md)
- [Feature Integration](./MANUS_FEATURE_INTEGRATION.md)
- [Playwright Engine Reference](../API_REFERENCE.md#playwright-engine)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the examples in this guide
3. See production implementations in `src/lib/agent/`
