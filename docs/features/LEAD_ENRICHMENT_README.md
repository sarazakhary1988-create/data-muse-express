# Lead Enrichment Feature - Complete Implementation Guide

> **Status**: Production-Ready | **Version**: 2.0 | **Last Updated**: 2025

## Overview

The Lead Enrichment feature provides comprehensive person and company profiling by aggregating data from multiple sources, including LinkedIn, web search, custom URLs, and third-party APIs (Explorium). It generates AI-enhanced reports with 11 specialized sections.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEAD ENRICHMENT SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │───▶│  Edge Func   │───▶│  AI Gateway  │      │
│  │  Component   │    │ lead-enrich  │    │   (Gemini)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Disambiguate │    │ Web Search   │    │ Report Gen   │      │
│  │  Candidates  │    │ + Scraping   │    │  (11 Sect)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── components/
│   ├── leads/
│   │   └── LeadEnrichment.tsx         # Main UI component
│   ├── EnhancedLeadEnrichment.tsx     # Extended version with Explorium
├── lib/
│   └── manus-core/
│       ├── leadEnrichment.ts          # Core enrichment engine
│       └── advancedEnrichment.ts      # LinkedIn & advanced crawling

supabase/functions/
├── lead-enrichment/
│   └── index.ts                       # Main edge function (2600+ lines)
├── explorium-enrich/
│   └── index.ts                       # Explorium API integration
```

---

## Implementation Steps

### Step 1: Edge Function Setup

Create `supabase/functions/lead-enrichment/index.ts`:

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request Types
interface PersonEnrichmentRequest {
  type: 'person';
  firstName?: string;
  lastName?: string;
  company?: string;
  country?: string;
  linkedinUrl?: string;
  email?: string;
  reportType: 'full' | 'executive' | 'sales' | 'hr';
  sourceUrls?: string[];  // Custom URLs to scrape
  exploriumData?: any;    // Pre-enriched data from Explorium
}

interface CompanyEnrichmentRequest {
  type: 'company';
  companyName: string;
  industry?: string;
  country?: string;
  website?: string;
  reportType: 'full' | 'executive' | 'sales' | 'hr';
  sourceUrls?: string[];
  exploriumData?: any;
}

interface DisambiguateRequest {
  type: 'disambiguate';
  searchType: 'person' | 'company';
  firstName?: string;
  lastName?: string;
  company?: string;
  companyName?: string;
}

// Report Structure (11 Sections)
interface TailoredReportData {
  profileSummary: string;           // Section 1
  companyPositioning: string;       // Section 2
  estimatedRevenue?: string;        // Section 3 (Company)
  estimatedAnnualIncome?: string;   // Section 3 (Person)
  yearsOfExperience?: string;       // Section 4
  education?: Array<{               // Section 5
    degree: string;
    institution: string;
    year: string;
    field?: string;
  }>;
  skills?: string[];                // Section 6
  experience?: Array<{              // Section 7
    title: string;
    company: string;
    duration: string;
    description?: string;
  }>;
  keyInsights: string[];            // Section 8 (AI-generated)
  strengths: string[];              // Section 9 (AI-generated)
  recommendations: string[];        // Section 10 (AI-generated)
  sources: Array<{                  // Section 11
    title: string;
    url: string;
    confidence?: number;
  }>;
  enrichmentTimestamp: string;
  reportType: 'person' | 'company';
  confidenceScore: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request = await req.json();
    
    // Route based on request type
    switch (request.type) {
      case 'disambiguate':
        return handleDisambiguation(request);
      case 'person':
        return handlePersonEnrichment(request);
      case 'company':
        return handleCompanyEnrichment(request);
      case 'chat_edit':
        return handleChatEdit(request);
      default:
        throw new Error('Invalid request type');
    }
  } catch (error) {
    console.error('[Lead Enrichment] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Step 2: Disambiguation Handler

When multiple candidates match, allow user selection:

```typescript
async function handleDisambiguation(request: DisambiguateRequest) {
  const { searchType, firstName, lastName, company, companyName } = request;
  
  // Build search query
  const searchQuery = searchType === 'person'
    ? `${firstName} ${lastName} ${company || ''} LinkedIn profile`
    : `${companyName} company official website`;
  
  // Search for candidates
  const searchResults = await searchWeb(searchQuery, { limit: 10 });
  
  // Parse and score candidates
  const candidates = searchResults.map((result, index) => ({
    id: `candidate-${index}`,
    name: extractNameFromResult(result),
    title: result.snippet?.match(/(?:CEO|CTO|CFO|VP|Director|Manager|Founder)/i)?.[0],
    company: extractCompanyFromResult(result),
    location: result.snippet?.match(/(?:in|at|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1],
    linkedinUrl: result.url.includes('linkedin.com') ? result.url : undefined,
    website: !result.url.includes('linkedin.com') ? result.url : undefined,
    confidence: 1 - (index * 0.1),
    sources: [result.source || result.url],
  }));
  
  return new Response(JSON.stringify({
    success: true,
    candidates,
    totalFound: candidates.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function searchWeb(query: string, options: { limit?: number } = {}) {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/web-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      query,
      maxResults: options.limit || 10,
      scrapeContent: true,
    }),
  });
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.results || data.data || [];
}
```

### Step 3: Person Enrichment Handler

```typescript
async function handlePersonEnrichment(request: PersonEnrichmentRequest) {
  const { firstName, lastName, company, linkedinUrl, sourceUrls = [] } = request;
  const fullName = `${firstName} ${lastName}`.trim();
  
  console.log(`[Lead Enrichment] Processing person: ${fullName}`);
  
  // Step 1: Gather data from multiple sources
  const dataSources: any[] = [];
  
  // 1a. LinkedIn profile (if provided)
  if (linkedinUrl) {
    const linkedinData = await scrapeLinkedIn(linkedinUrl);
    if (linkedinData) dataSources.push({ source: 'LinkedIn', data: linkedinData });
  }
  
  // 1b. Web search for additional info
  const webResults = await searchWeb(`${fullName} ${company || ''} professional profile`);
  for (const result of webResults.slice(0, 5)) {
    dataSources.push({ source: result.url, data: result.content });
  }
  
  // 1c. Custom source URLs
  for (const url of sourceUrls) {
    const scraped = await scrapeUrl(url);
    if (scraped) dataSources.push({ source: url, data: scraped });
  }
  
  // 1d. Explorium data (if provided)
  if (request.exploriumData) {
    dataSources.push({ source: 'Explorium', data: request.exploriumData });
  }
  
  // Step 2: Synthesize into structured report
  const report = await synthesizePersonReport(fullName, dataSources, request.reportType);
  
  // Step 3: Generate AI insights
  const enhancedReport = await generateAIInsights(report, 'person');
  
  return new Response(JSON.stringify({
    success: true,
    report: enhancedReport,
    sources: dataSources.map(s => s.source),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function scrapeLinkedIn(url: string) {
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/research-scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        url,
        options: { formats: ['markdown'], waitFor: 3000 },
      }),
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.content || data.data?.markdown;
  } catch (error) {
    console.error('[LinkedIn Scrape] Error:', error);
    return null;
  }
}
```

### Step 4: Report Synthesis with AI

```typescript
async function synthesizePersonReport(
  name: string,
  dataSources: any[],
  reportType: string
): Promise<TailoredReportData> {
  const aggregatedContent = dataSources
    .map(s => `[Source: ${s.source}]\n${typeof s.data === 'string' ? s.data : JSON.stringify(s.data)}`)
    .join('\n\n---\n\n');
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `You are a professional research analyst creating a ${reportType} report on ${name}.
Extract structured information from the provided sources and return a JSON object with these fields:
- profileSummary: 2-3 paragraph professional summary
- yearsOfExperience: Estimated years based on career history
- education: Array of {degree, institution, year, field}
- skills: Array of key skills identified
- experience: Array of {title, company, duration, description}
- keyInsights: 3-4 AI-generated insights about this person
- strengths: 3-4 identified professional strengths
- recommendations: 1 paragraph on engagement approach
- confidenceScore: 0-1 based on data quality

ONLY use information found in the sources. Do NOT invent data.`
        },
        {
          role: 'user',
          content: `Extract structured profile for ${name}:\n\n${aggregatedContent}`
        }
      ],
      response_format: { type: 'json_object' },
    }),
  });
  
  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);
  
  return {
    ...parsed,
    enrichmentTimestamp: new Date().toISOString(),
    reportType: 'person',
    sources: dataSources.map(s => ({
      title: s.source,
      url: s.source.startsWith('http') ? s.source : undefined,
    })),
  };
}
```

### Step 5: Frontend Component

Create `src/components/leads/LeadEnrichment.tsx`:

```tsx
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, User, Building, Download, MessageSquare } from 'lucide-react';

interface DisambiguationCandidate {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  linkedinUrl?: string;
  confidence: number;
}

export function LeadEnrichment() {
  const [searchType, setSearchType] = useState<'person' | 'company'>('person');
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [candidates, setCandidates] = useState<DisambiguationCandidate[]>([]);
  const [report, setReport] = useState<any>(null);
  
  // Person search fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  
  // Company search fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  
  // Custom source URLs
  const [sourceUrls, setSourceUrls] = useState<string[]>(['']);

  const handleSearch = async () => {
    setIsSearching(true);
    setCandidates([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('lead-enrichment', {
        body: {
          type: 'disambiguate',
          searchType,
          ...(searchType === 'person' 
            ? { firstName, lastName, company }
            : { companyName, industry }
          ),
        },
      });
      
      if (error) throw error;
      setCandidates(data.candidates || []);
      
      if (data.candidates?.length === 0) {
        toast.info('No candidates found. Try adjusting your search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleEnrich = async (candidate: DisambiguationCandidate) => {
    setIsEnriching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('lead-enrichment', {
        body: {
          type: searchType,
          ...(searchType === 'person' 
            ? { 
                firstName, 
                lastName, 
                company: candidate.company,
                linkedinUrl: candidate.linkedinUrl,
              }
            : { 
                companyName: candidate.name,
                website: candidate.website,
              }
          ),
          reportType: 'full',
          sourceUrls: sourceUrls.filter(u => u.trim()),
        },
      });
      
      if (error) throw error;
      setReport(data.report);
      toast.success('Report generated successfully!');
    } catch (error) {
      console.error('Enrichment error:', error);
      toast.error('Failed to generate report.');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Enrichment</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="person">
                <User className="w-4 h-4 mr-2" />
                Person
              </TabsTrigger>
              <TabsTrigger value="company">
                <Building className="w-4 h-4 mr-2" />
                Company
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="person" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <Input
                placeholder="Company (optional)"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </TabsContent>
            
            <TabsContent value="company" className="space-y-4">
              <Input
                placeholder="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <Input
                placeholder="Industry (optional)"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </TabsContent>
          </Tabs>
          
          {/* Custom Source URLs */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Custom Source URLs (optional)</label>
            {sourceUrls.map((url, i) => (
              <Input
                key={i}
                placeholder="https://example.com/profile"
                value={url}
                onChange={(e) => {
                  const updated = [...sourceUrls];
                  updated[i] = e.target.value;
                  setSourceUrls(updated);
                }}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSourceUrls([...sourceUrls, ''])}
            >
              + Add URL
            </Button>
          </div>
          
          <Button 
            className="mt-4 w-full"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Search
          </Button>
        </CardContent>
      </Card>
      
      {/* Disambiguation Results */}
      {candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select the correct match</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => handleEnrich(candidate)}
              >
                <div>
                  <p className="font-medium">{candidate.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {candidate.title} {candidate.company && `at ${candidate.company}`}
                  </p>
                  {candidate.location && (
                    <p className="text-xs text-muted-foreground">{candidate.location}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {Math.round(candidate.confidence * 100)}% match
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Loading State */}
      {isEnriching && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Generating comprehensive report...</p>
          </CardContent>
        </Card>
      )}
      
      {/* Report Display */}
      {report && (
        <ReportDisplay report={report} />
      )}
    </div>
  );
}

function ReportDisplay({ report }: { report: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Enrichment Report</CardTitle>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section 1: Profile Summary */}
        <section>
          <h3 className="text-lg font-semibold mb-2">Profile Summary</h3>
          <p className="text-muted-foreground">{report.profileSummary}</p>
        </section>
        
        {/* Section 7: Experience */}
        {report.experience?.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-2">Work Experience</h3>
            {report.experience.map((exp: any, i: number) => (
              <div key={i} className="mb-3 pl-4 border-l-2 border-primary">
                <p className="font-medium">{exp.title}</p>
                <p className="text-sm text-muted-foreground">
                  {exp.company} • {exp.duration}
                </p>
                {exp.description && (
                  <p className="text-sm mt-1">{exp.description}</p>
                )}
              </div>
            ))}
          </section>
        )}
        
        {/* Section 8: Key Insights */}
        {report.keyInsights?.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-2">Key Insights</h3>
            <ul className="list-disc list-inside space-y-1">
              {report.keyInsights.map((insight: string, i: number) => (
                <li key={i} className="text-muted-foreground">{insight}</li>
              ))}
            </ul>
          </section>
        )}
        
        {/* Section 11: Sources */}
        <section>
          <h3 className="text-lg font-semibold mb-2">Sources</h3>
          <div className="flex flex-wrap gap-2">
            {report.sources?.map((source: any, i: number) => (
              <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                {source.title || source.url}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Confidence Score: {Math.round((report.confidenceScore || 0) * 100)}%
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
```

---

## Configuration

### Supabase Config

Add to `supabase/config.toml`:

```toml
[functions.lead-enrichment]
verify_jwt = false
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `LOVABLE_API_KEY` | Auto-provisioned by Lovable Cloud |
| `FIRECRAWL_API_KEY` | Optional: For enhanced web scraping |
| `EXPLORIUM_API_KEY` | Optional: For Explorium integration |

---

## Export Formats

The system supports 7 export formats:

1. **PDF** - Formatted document with styling
2. **Word (DOCX)** - Editable business document
3. **Excel (XLSX)** - Multi-sheet spreadsheet
4. **PowerPoint (PPTX)** - Presentation-ready slides
5. **JSON** - Complete structured data
6. **Markdown** - Human-readable documentation
7. **CSV** - Tabular format for analysis

---

## API Reference

### Disambiguate Candidates

```http
POST /functions/v1/lead-enrichment
Content-Type: application/json

{
  "type": "disambiguate",
  "searchType": "person",
  "firstName": "John",
  "lastName": "Smith",
  "company": "Acme Corp"
}
```

### Enrich Person

```http
POST /functions/v1/lead-enrichment
Content-Type: application/json

{
  "type": "person",
  "firstName": "John",
  "lastName": "Smith",
  "company": "Acme Corp",
  "linkedinUrl": "https://linkedin.com/in/johnsmith",
  "reportType": "full",
  "sourceUrls": ["https://company.com/team/john"]
}
```

### Enrich Company

```http
POST /functions/v1/lead-enrichment
Content-Type: application/json

{
  "type": "company",
  "companyName": "Acme Corporation",
  "industry": "Technology",
  "website": "https://acme.com",
  "reportType": "executive"
}
```

---

## Testing

```bash
# Test person enrichment
curl -X POST "${SUPABASE_URL}/functions/v1/lead-enrichment" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "person",
    "firstName": "Elon",
    "lastName": "Musk",
    "reportType": "full"
  }'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No candidates found | Try broader search terms or check spelling |
| Low confidence scores | Add more source URLs or LinkedIn profile |
| Missing sections | Some data may not be publicly available |
| Rate limiting | Add delays between requests |

---

## Related Documentation

- [Search Engine README](./SEARCH_ENGINE_README.md)
- [URL Scraper README](./URL_SCRAPER_README.md)
- [AI Chat README](./AI_CHAT_README.md)
