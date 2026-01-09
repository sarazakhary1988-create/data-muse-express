# Lead Enrichment System

Complete professional-grade lead enrichment for persons and companies with LinkedIn integration, news fetching, AI chat, and 7 export formats.

## Features

### Person Enrichment
- LinkedIn profile scraping
- Professional experience & education
- Skills & endorsements
- Related news & articles
- Social media URLs (LinkedIn, Twitter, Facebook, Instagram)
- Email extraction
- Related URLs

### Company Enrichment
- Multi-source data (LinkedIn, Bloomberg, Reuters)
- Company profile (industry, size, headquarters, founded)
- Financial metrics (revenue, market cap, ticker)
- Leadership team (CEO, board members, C-suite)
- Products & services
- Recent news & updates
- Social media profiles
- Contact information

### Smart Disambiguation
- Detects multiple matches
- Shows interactive selection popup
- Match scoring (0-100%)
- Preview information for selection

### AI Chatbot
- Powered by knowledge base
- Contextual answers with citations
- Report regeneration
- Interactive refinement

### 7 Export Formats
1. **PDF** - Formatted document with styling, logos, charts
2. **Word (DOCX)** - Editable business document
3. **Excel (XLSX)** - Multi-sheet spreadsheet
4. **PowerPoint (PPTX)** - Presentation-ready slides
5. **JSON** - Complete structured data
6. **Markdown** - Human-readable documentation
7. **CSV** - Tabular format for analysis

### Data Validation
- Checks for empty fields before export
- Provides completeness score
- Warns if critical sections missing
- Still exports available data with warnings

## Usage

### Person Enrichment

```typescript
import { enrichPerson } from '@/lib/manus-core/leadEnrichment';

// Basic enrichment
const result = await enrichPerson({
  firstName: 'Mohammed',
  lastName: 'Ahmed',
  company: 'Bank ABC',
  location: 'Dubai, UAE'
});

// Handle disambiguation
if (result.hasMultipleMatches) {
  console.log('Multiple matches found:');
  result.matches.forEach(match => {
    console.log(`- ${match.name} (${Math.round(match.score * 100)}% match)`);
    console.log(`  ${match.title} at ${match.company}`);
  });
  
  // Select specific match
  const selected = result.matches[0]; // User selects
  const enriched = await enrichPerson({ 
    firstName: 'Mohammed', 
    lastName: 'Ahmed',
    matchId: selected.id 
  });
}

// Access enriched data
console.log('Profile:', result.profile);
console.log('Experience:', result.experience);
console.log('Education:', result.education);
console.log('Skills:', result.skills);
console.log('News:', result.news.length, 'articles');
console.log('Social Media:', result.socialMedia);
console.log('Emails:', result.emails);
```

### Company Enrichment

```typescript
import { enrichCompany } from '@/lib/manus-core/leadEnrichment';

const result = await enrichCompany({
  name: 'Saudi Aramco',
  country: 'Saudi Arabia',
  industry: 'Oil & Gas'
});

console.log('Company:', result.profile);
console.log('Financials:', result.financials);
console.log('Leadership:', result.leadership);
console.log('Products:', result.products);
console.log('News:', result.news);
```

### AI Chatbot

```typescript
// Create chat session
const chat = result.createChatSession();

// Ask questions
const answer1 = await chat.ask("What is Mohammed's educational background?");
console.log(answer1);
// "Mohammed has an MBA from MIT (2015) and a BS in Computer Science from Stanford (2010). [Source: LinkedIn profile]"

const answer2 = await chat.ask("Has he worked at any other companies?");
console.log(answer2);
// "Yes, before Bank ABC, Mohammed worked at Microsoft as Senior Director (2015-2020)..."

// Request report updates
await chat.ask("Add more recent news from 2024");

// Regenerate specific section
await chat.regenerateSection({
  section: 'news',
  instructions: 'Focus only on 2024 articles'
});

// Amend report
await chat.amendReport({
  section: 'experience',
  update: 'Add detailed project descriptions'
});
```

### Export Data

```typescript
// Export as PDF
await result.export({
  format: 'pdf',
  filename: 'lead-profile.pdf',
  template: 'professional',
  includeLogos: true,
  includeCharts: true
});

// Export as Word (editable)
await result.export({
  format: 'docx',
  filename: 'lead-profile.docx',
  template: 'business',
  editable: true
});

// Export as Excel (multi-sheet)
await result.export({
  format: 'xlsx',
  filename: 'lead-data.xlsx'
});
// Sheets: Overview, Experience, Education, News, Contact

// Export as PowerPoint
await result.export({
  format: 'pptx',
  filename: 'lead-presentation.pptx',
  template: 'executive'
});
// Auto-generates slides with profile, experience, news highlights

// Export as JSON
await result.export({
  format: 'json',
  filename: 'lead-data.json',
  pretty: true
});

// Export as Markdown
await result.export({
  format: 'markdown',
  filename: 'lead-profile.md',
  includeTableOfContents: true
});

// Export as CSV
await result.export({
  format: 'csv',
  filename: 'lead-data.csv'
});
```

## Report Structure

### Person Report Sections

1. **Profile Overview**
   - Photo
   - Name, Title, Company
   - Location, Summary
   - Data Quality Score

2. **Professional Experience**
   - Current Position
   - Previous Roles (chronological)
   - Duration & Responsibilities

3. **Education**
   - Degrees
   - Institutions
   - Years, Field of Study

4. **Skills & Expertise**
   - Core Skills
   - Endorsements

5. **News & Media**
   - Recent Articles
   - Mentions
   - Interviews

6. **Social Media Presence**
   - LinkedIn, Twitter, etc.
   - Activity & Engagement

7. **Contact Information**
   - Emails
   - Phone Numbers
   - Related URLs

8. **AI-Generated Insights**
   - Career Trajectory
   - Key Strengths
   - Notable Achievements

### Company Report Sections

1. **Company Overview**
   - Logo
   - Name, Industry
   - Size, HQ, Founded
   - Data Quality Score

2. **Business Profile**
   - Description
   - Products/Services
   - Market Position

3. **Financial Information**
   - Revenue, Market Cap
   - Ticker Symbol
   - Key Metrics

4. **Leadership Team**
   - CEO, Board Members
   - C-Suite Executives
   - Photos & Bios

5. **News & Updates**
   - Recent Announcements
   - Press Releases
   - Media Coverage

6. **Social Media**
   - Corporate Profiles
   - Engagement Stats

7. **Contact Information**
   - Website, Email, Phone
   - Addresses
   - IR Contact

8. **AI-Generated Analysis**
   - Company Strengths
   - Market Opportunities
   - Competitive Position

## Best Practices

### Improving Match Accuracy

```typescript
// Provide more context for better matches
const result = await enrichPerson({
  firstName: 'John',
  lastName: 'Smith',
  company: 'Tech Corp',        // ✅ Include company
  location: 'Dubai, UAE'        // ✅ Include location
});

// vs

const result = await enrichPerson({
  firstName: 'John',
  lastName: 'Smith'             // ❌ Less context = more matches
});
```

### Handling Data Quality

```typescript
const result = await enrichPerson({ ... });

if (result.dataQuality && result.dataQuality.score < 0.5) {
  console.warn(`Warning: Only ${Math.round(result.dataQuality.score * 100)}% data available`);
  console.warn('Missing sections:', result.dataQuality.missingSections);
  
  // Still usable, but may have gaps
  if (result.dataQuality.missingSections.includes('experience')) {
    console.log('No experience data found - try different search parameters');
  }
}
```

### Export Validation

```typescript
// Check data before exporting
if (result.dataQuality && result.dataQuality.completeness < 0.3) {
  const confirm = window.confirm(
    `Only ${Math.round(result.dataQuality.completeness * 100)}% data available. Export anyway?`
  );
  if (!confirm) return;
}

await result.export({ format: 'pdf' });
```

## Performance

| Task | Typical Time | Notes |
|------|--------------|-------|
| Person Search | 2-3s | LinkedIn + basic search |
| Full Enrichment | 8-12s | All data sources |
| News Fetching | 3-5s | Recent articles |
| Email Extraction | 2-4s | Pattern matching + validation |
| Disambiguation | < 1s | Matching algorithm |
| KB Creation | 5-7s | Vector embeddings |
| Chat Response | 1-2s | With citations |
| PDF Export | 3-5s | Formatted with charts |
| DOCX Export | 2-4s | Editable document |
| XLSX Export | 2-3s | Multi-sheet |
| PPTX Export | 4-6s | Presentation slides |

## Troubleshooting

### No Matches Found

```typescript
try {
  const result = await enrichPerson({ ... });
} catch (error) {
  if (error.message === 'No matches found for person') {
    // Try different search parameters
    // - Check spelling
    // - Try without company/location
    // - Use nickname variants
  }
}
```

### Multiple Matches

```typescript
if (result.hasMultipleMatches) {
  // Always show disambiguation UI
  // Let user select correct match
  // Match scoring helps prioritize
  const topMatch = result.matches[0]; // Highest score
}
```

### Incomplete Data

```typescript
if (result.news.length === 0) {
  console.log('No recent news found - person may be private');
}

if (!result.socialMedia?.linkedin) {
  console.log('LinkedIn profile not found - may be private or deleted');
}

if (result.emails.length === 0) {
  console.log('No public email found - try company contact page');
}
```

## Integration with Other Features

### With Search Feature

```typescript
import { executeEnhancedSearch } from '@/lib/searchExecutor';
import { enrichPerson } from '@/lib/leadEnrichment';

// Search for person
const searchResult = await executeEnhancedSearch({
  query: 'Mohammed Ahmed CEO Bank ABC',
  sources: ['linkedin.com']
});

// Enrich found person
const enrichment = await enrichPerson({
  firstName: 'Mohammed',
  lastName: 'Ahmed',
  company: 'Bank ABC'
});
```

### With GCC News

```typescript
import { fetchGCCFinancialNews } from '@/lib/gccFinancialNews';
import { enrichCompany } from '@/lib/leadEnrichment';

// Enrich company
const company = await enrichCompany({ name: 'Saudi Aramco' });

// Get latest news about company
const news = await fetchGCCFinancialNews({
  keywords: ['Saudi Aramco'],
  categories: ['management_change', 'merger_acquisition'],
  timeRange: 'week'
});

// Combine data
company.news = news;
```

## Total Real-Time Tools: 15

Lead Enrichment is the 15th real-time data fetching tool in the MANUS 1.6 MAX system, completing the comprehensive suite of data gathering capabilities.
