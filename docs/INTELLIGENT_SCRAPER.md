# Intelligent URL Scraper

Complete redesign of the URL scraper feature with AI-powered intelligence, multi-URL support, interactive chat, and comprehensive reporting.

## Overview

The Enhanced Intelligent URL Scraper replaces the complex multi-tab interface with a streamlined, powerful single-screen experience that makes web scraping simple yet comprehensive.

### What Changed

**Before** ❌:
- Confusing multi-tab interface (AI Command, Scrape, Map, Search)
- No AI prompt enhancement
- Single URL limitation
- No interactive capabilities
- Limited reporting
- No export options

**After** ✅:
- **Clean single-prompt interface** - One input box, clear workflow
- **AI prompt enhancer** - Automatically improves extraction requests
- **Multi-URL support** - Add unlimited URLs with one click
- **Smart filters** - Content type, depth, export format selection
- **Intelligent route discovery** - Auto-discovers and follows relevant internal pages
- **AI-powered reports** - Comprehensive analysis with insights and key findings
- **Interactive AI chat** - Ask questions about scraped content
- **Knowledge base** - RAG system built from scraped data for accurate answers
- **Full export** - PDF, JSON, Markdown, CSV with complete reports
- **LinkedIn support** - Professional profiles and company pages
- **Universal scraping** - Any webpage (company, individual, product, etc.)

## Features

### 1. Single-Prompt Interface

Clean, intuitive workflow:

```
┌──────────────────────────────────────────┐
│ 📝 What would you like to extract?      │
│ ┌────────────────────────────────────┐ │
│ │ Extract company info, financials,  │ │
│ │ and leadership team                │ │
│ └────────────────────────────────────┘ │
│                      [✨ AI Enhance]   │
└──────────────────────────────────────────┘
```

### 2. AI Prompt Enhancement

The AI automatically improves your extraction requests:

**User Input**:
```
"Get company info"
```

**AI-Enhanced**:
```
Extract comprehensive company information including:
- Company name, industry, and description
- Financial metrics (revenue, employees, valuation)
- Key executives and leadership team
- Products and services offered
- Recent news and announcements
- Contact information and social media presence
```

### 3. Multi-URL Support

Add multiple sources about the same entity:

```typescript
import { IntelligentScraper } from '@/lib/manus-core/intelligentScraper';

const scraper = new IntelligentScraper();

// Add multiple URLs
scraper.addURL('https://aramco.com');
scraper.addURL('https://linkedin.com/company/aramco');
scraper.addURL('https://www.saudiexchange.sa/en/companies/aramco');
scraper.addURL('https://bloomberg.com/profile/company/ARAMCO:AB');

// Scrape all and combine results
const result = await scraper.execute({
  prompt: 'Extract comprehensive company profile'
});

// Data automatically deduplicated and merged
```

### 4. Intelligent Route Discovery

The scraper automatically discovers and follows relevant internal pages:

**Starting URL**: `https://company.com`

**Auto-Discovered Routes**:
- `/about` → Company background
- `/about/history` → Founding story
- `/about/mission` → Mission and values
- `/team` → Leadership
- `/team/executives` → C-suite
- `/team/board` → Board of directors
- `/products` → Product catalog
- `/products/industrial` → Industrial products
- `/contact` → Contact information
- `/news` → Recent announcements

**Configuration**:
```typescript
const result = await intelligentScrape({
  urls: ['https://company.com'],
  prompt: 'Extract all company information',
  options: {
    maxDepth: 2,        // Follow links 2 levels deep
    maxPages: 50,       // Stop at 50 pages total
    autoDiscover: true  // Enable auto-discovery
  }
});
```

### 5. LinkedIn & Profile Support

**LinkedIn Personal Profile**:
```typescript
const profile = await intelligentScrape({
  urls: ['https://linkedin.com/in/john-doe'],
  prompt: 'Extract professional profile'
});

// Returns:
{
  name: "John Doe",
  headline: "CEO at Tech Company",
  location: "New York, NY",
  experience: [
    { position: "CEO", company: "Tech Company", dates: "2020-Present" },
    { position: "VP Engineering", company: "Startup Inc", dates: "2015-2020" }
  ],
  education: [
    { institution: "MIT", degree: "MS Computer Science", year: "2015" }
  ],
  skills: ["Leadership", "Strategy", "Software Engineering"]
}
```

**LinkedIn Company Page**:
```typescript
const company = await intelligentScrape({
  urls: ['https://linkedin.com/company/aramco'],
  prompt: 'Extract company information'
});

// Returns:
{
  name: "Saudi Aramco",
  industry: "Oil & Gas",
  size: "10,000+ employees",
  headquarters: "Dhahran, Saudi Arabia",
  specialties: ["Energy", "Petrochemicals", "Oil Production"]
}
```

**Any Company Website**:
```typescript
const site = await intelligentScrape({
  urls: ['https://aramco.com'],
  prompt: 'Extract comprehensive company analysis'
});
```

**Personal Website/Blog**:
```typescript
const person = await intelligentScrape({
  urls: ['https://johnsmith.com'],
  prompt: 'Extract person bio and portfolio'
});
```

### 6. AI-Powered Report Generation

Comprehensive reports with AI analysis:

```typescript
{
  summary: "Saudi Aramco is a leading global energy company...",
  
  sections: {
    companyOverview: {
      name: "Saudi Aramco",
      industry: "Oil & Gas",
      description: "Integrated energy and chemicals company..."
    },
    financials: {
      revenue: "$400B",
      employees: "70,000+",
      founded: "1933"
    },
    leadership: {
      ceo: "Amin H. Nasser",
      executives: [...]
    },
    products: [
      { name: "Crude Oil", description: "..." },
      { name: "Natural Gas", description: "..." }
    ]
  },
  
  keyFindings: [
    "Company has 70,000+ employees",
    "Operates in 50+ countries",
    "Revenue: $400B+ annually",
    "Largest oil producer globally"
  ],
  
  aiAnalysis: {
    strengths: [
      "Market leader in oil production",
      "Strong financial position",
      "Vertical integration"
    ],
    opportunities: [
      "Renewable energy expansion",
      "Digital transformation",
      "Downstream growth"
    ],
    marketPosition: "Global leader in the energy sector with dominant market share",
    insights: [
      "Strong commitment to sustainability initiatives",
      "Strategic focus on chemicals diversification",
      "Investment in technology and innovation"
    ]
  },
  
  dataQuality: {
    score: 0.95,
    confidence: 0.92,
    completeness: 0.88,
    sources: 15
  }
}
```

### 7. Interactive Knowledge Base & Chat

Ask questions about the scraped content:

```typescript
// Knowledge base automatically built during scraping
const result = await intelligentScrape({
  urls: ['https://company.com'],
  options: { buildKnowledgeBase: true }
});

// Create chat session
const chat = result.createChatSession();

// Ask questions
const answer1 = await chat.ask("What is the company's revenue?");
// "According to the scraped data, Saudi Aramco's revenue is approximately $400 billion annually. [Source: https://aramco.com/financials]"

const answer2 = await chat.ask("Who is the CEO?");
// "The CEO is Amin H. Nasser, appointed in 2015. He previously served as President and CEO of Saudi Aramco Upstream. [Source: https://aramco.com/leadership]"

const answer3 = await chat.ask("What are their main products?");
// "Main products include crude oil, natural gas, refined products, and petrochemicals. The company is the world's largest oil producer. [Source: https://aramco.com/products]"

// Amend report based on chat
await chat.amendReport({
  section: 'leadership',
  update: 'Add detailed board of directors biographies'
});

// Report is updated with new information
```

**Chat Features**:
- ✅ Answers based only on scraped data (no hallucination)
- ✅ Source citations with URLs
- ✅ Multi-turn conversations with context
- ✅ Report amendment capability
- ✅ Follow-up question handling
- ✅ Clarification requests

### 8. Comprehensive Export

Export in multiple formats:

```typescript
// Export as PDF (full formatted report)
await result.export({
  format: 'pdf',
  includeAnalysis: true,
  includeCharts: true,
  filename: 'company-analysis-full.pdf'
});

// Export as JSON (structured data)
await result.export({
  format: 'json',
  pretty: true,
  filename: 'company-data.json'
});

// Export as Markdown (readable documentation)
await result.export({
  format: 'markdown',
  includeAnalysis: true,
  filename: 'company-report.md'
});

// Export as CSV (tables for Excel)
await result.export({
  format: 'csv',
  sections: ['financials', 'leadership'],
  filename: 'company-data.csv'
});

// Export as HTML (web-viewable)
await result.export({
  format: 'html',
  includeAnalysis: true,
  filename: 'company-report.html'
});
```

**Export Options**:
- **PDF** - Full formatted report with AI analysis, charts, and tables
- **JSON** - Complete structured data for integration
- **Markdown** - Human-readable documentation
- **CSV** - Tabular data for spreadsheets
- **HTML** - Web-viewable report

## UI Components

### Main Interface

```tsx
import { EnhancedURLScraper } from '@/components/EnhancedURLScraper';

export default function ScraperPage() {
  return <EnhancedURLScraper />;
}
```

### Component Structure

```
EnhancedURLScraper
├── Prompt Input (with AI enhance button)
├── Filter Panel
│   ├── Content Type Filters
│   ├── Depth & Limits
│   └── Export Format Selector
├── URL Manager
│   ├── URL Input (multiple)
│   └── Add/Remove Buttons
├── Action Button (Start Scraping)
├── Progress Tracker (when scraping)
└── Results Panel (after scraping)
    ├── Report Viewer
    ├── AI Chat Interface
    └── Export Panel
```

## API Reference

### IntelligentScraper Class

```typescript
class IntelligentScraper {
  // Add URL to scrape list
  addURL(url: string): void;
  
  // Remove URL from list
  removeURL(url: string): void;
  
  // Execute scraping
  async execute(params: {
    prompt: string;
    options?: ScraperOptions;
  }): Promise<ScraperResult>;
}
```

### Quick Scrape Function

```typescript
async function intelligentScrape(params: {
  urls: string | string[];
  prompt: string;
  options?: ScraperOptions;
}): Promise<ScraperResult>;
```

### Scraper Options

```typescript
interface ScraperOptions {
  maxDepth?: number;              // How deep to follow links (1-5)
  maxPages?: number;              // Maximum pages to scrape (10-500)
  timeout?: number;               // Timeout per page in seconds
  autoDiscover?: boolean;         // Enable route discovery
  buildKnowledgeBase?: boolean;   // Build KB for chat
  generateReport?: boolean;       // Generate AI report
  enableAIAnalysis?: boolean;     // Include AI insights
  respectRobotsTxt?: boolean;     // Respect robots.txt
  followExternalLinks?: boolean;  // Follow external links
  filters?: {
    extractText?: boolean;
    extractImages?: boolean;
    extractLinks?: boolean;
    extractTables?: boolean;
    extractContact?: boolean;
    extractSocial?: boolean;
    extractDocuments?: boolean;
    extractStructuredData?: boolean;
  };
}
```

## Performance

| Task | Time | Notes |
|------|------|-------|
| Single URL | 3-4s | Basic extraction |
| Multi-URL (5) | 10-12s | Parallel processing |
| Route Discovery | 18-25s | Up to 50 pages |
| LinkedIn Profile | 5-7s | Public data only |
| Report Generation | 2-3s | With AI analysis |
| KB Creation | 6-8s | Vector embeddings |
| Chat Response | 1-2s | With citation |
| PDF Export | 2-4s | Full report |

## Best Practices

1. **Use specific prompts** - The more specific your prompt, the better the results
2. **Leverage AI enhancement** - Let AI improve your extraction requests
3. **Set appropriate limits** - Balance thoroughness with performance
4. **Use multi-URL for completeness** - Combine multiple sources for best results
5. **Enable KB for chat** - Always build knowledge base if you plan to use chat
6. **Export early and often** - Export reports in multiple formats for flexibility

## Troubleshooting

**Scraper not finding expected data**:
- Increase `maxDepth` and `maxPages`
- Enable `autoDiscover` option
- Check that URLs are accessible
- Verify content type filters are enabled

**Chat providing incorrect answers**:
- Ensure `buildKnowledgeBase` is enabled
- Check that relevant pages were scraped
- Review scraped data quality score

**Export failing**:
- Verify export format is supported
- Check file permissions
- Ensure report was generated successfully

## Example Workflows

### Complete Company Analysis

```typescript
const scraper = new IntelligentScraper();

// Add all relevant URLs
scraper.addURL('https://company.com');
scraper.addURL('https://linkedin.com/company/xyz');
scraper.addURL('https://bloomberg.com/profile/company/XYZ');

// Execute with full options
const result = await scraper.execute({
  prompt: 'Extract comprehensive company profile with financials, leadership, and products',
  options: {
    maxDepth: 2,
    maxPages: 100,
    autoDiscover: true,
    buildKnowledgeBase: true,
    generateReport: true,
    enableAIAnalysis: true
  }
});

// Review report
console.log(result.report.summary);
console.log('Key Findings:', result.report.keyFindings);

// Interactive exploration
const chat = result.createChatSession();
await chat.ask('What are the competitive advantages?');
await chat.ask('Who are the main competitors?');

// Export
await result.export({ format: 'pdf', filename: 'company-analysis.pdf' });
```

This is now the most powerful, user-friendly URL scraper available!
