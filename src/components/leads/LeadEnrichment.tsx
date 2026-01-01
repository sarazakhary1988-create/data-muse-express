import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Building2, Mail, Phone, Linkedin, Globe,
  FileText, Briefcase, UserCheck, Loader2, Download, ExternalLink,
  MapPin, Calendar, Award, TrendingUp, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useResearchEngine } from '@/hooks/useResearchEngine';
import { useResearchStore } from '@/store/researchStore';

type ReportType = 'full' | 'executive' | 'sales' | 'hr';

interface LeadSearchForm {
  firstName: string;
  lastName: string;
  company: string;
  country: string;
  linkedinUrl: string;
  email: string;
  phone: string;
}

interface CompanySearchForm {
  companyName: string;
  industry: string;
  country: string;
  website: string;
}

interface EnrichedResult {
  type: 'person' | 'company';
  name: string;
  title?: string;
  company?: string;
  industry?: string;
  location: string;
  linkedin?: string;
  email?: string;
  phone?: string;
  website?: string;
  employees?: string;
  revenue?: string;
  summary: string;
  insights: string[];
  sources: { title: string; url: string }[];
  enrichedAt: Date;
}

const reportTypes: { id: ReportType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'full', label: 'Full Profile', icon: Users, description: 'Complete prospect analysis' },
  { id: 'executive', label: 'Executive Summary', icon: FileText, description: 'Key insights at a glance' },
  { id: 'sales', label: 'Sales Intelligence', icon: Briefcase, description: 'Sales-focused insights' },
  { id: 'hr', label: 'HR Assessment', icon: UserCheck, description: 'HR & hiring perspective' },
];

const countries = [
  'All Countries', 'United States', 'United Kingdom', 'Germany', 'France', 'Canada',
  'Australia', 'Japan', 'Singapore', 'UAE', 'Saudi Arabia', 'India', 'Brazil',
  'Netherlands', 'Switzerland', 'Sweden', 'Spain', 'Italy', 'South Korea', 'China'
];

export const LeadEnrichment = () => {
  const [searchType, setSearchType] = useState<'person' | 'company'>('person');
  const [selectedReport, setSelectedReport] = useState<ReportType>('full');
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [results, setResults] = useState<EnrichedResult[]>([]);
  
  const [personForm, setPersonForm] = useState<LeadSearchForm>({
    firstName: '',
    lastName: '',
    company: '',
    country: 'All Countries',
    linkedinUrl: '',
    email: '',
    phone: '',
  });

  const [companyForm, setCompanyForm] = useState<CompanySearchForm>({
    companyName: '',
    industry: '',
    country: 'All Countries',
    website: '',
  });

  const { startResearch } = useResearchEngine();
  const { currentTask } = useResearchStore();

  const extractInsightsFromResults = useCallback((researchResults: any[]): { insights: string[]; sources: { title: string; url: string }[] } => {
    const insights: string[] = [];
    const sources: { title: string; url: string }[] = [];

    if (!researchResults || researchResults.length === 0) {
      return { insights: [], sources: [] };
    }

    researchResults.slice(0, 5).forEach(result => {
      if (result.summary) {
        // Extract key sentences as insights
        const sentences = result.summary.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
        insights.push(...sentences.slice(0, 2).map((s: string) => s.trim()));
      }
      
      sources.push({
        title: result.title || result.metadata?.domain || 'Source',
        url: result.url
      });
    });

    return {
      insights: [...new Set(insights)].slice(0, 5),
      sources: sources.slice(0, 5)
    };
  }, []);

  const handlePersonSearch = async () => {
    if (!personForm.firstName && !personForm.lastName && !personForm.linkedinUrl && !personForm.email) {
      toast({ title: "Missing Information", description: "Please provide at least a name or direct lookup info", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setSearchProgress(0);
    setResults([]);

    try {
      const fullName = `${personForm.firstName} ${personForm.lastName}`.trim();
      const reportContext = reportTypes.find(r => r.id === selectedReport);
      
      // Build comprehensive search query based on report type
      let searchQuery = '';
      
      if (personForm.linkedinUrl) {
        searchQuery = `LinkedIn profile analysis: ${personForm.linkedinUrl}. `;
      } else {
        searchQuery = `Professional profile of ${fullName}`;
        if (personForm.company) searchQuery += ` at ${personForm.company}`;
        if (personForm.country !== 'All Countries') searchQuery += ` in ${personForm.country}`;
        searchQuery += '. ';
      }

      // Add report-specific focus
      switch (selectedReport) {
        case 'full':
          searchQuery += 'Include complete professional background, career history, achievements, skills, education, publications, and contact information.';
          break;
        case 'executive':
          searchQuery += 'Focus on key achievements, current role, strategic initiatives, and industry influence.';
          break;
        case 'sales':
          searchQuery += 'Include decision-making authority, budget responsibility, pain points, and buying signals.';
          break;
        case 'hr':
          searchQuery += 'Focus on career progression, skills assessment, cultural fit indicators, and professional development.';
          break;
      }

      setSearchProgress(20);
      
      const result = await startResearch(searchQuery);
      
      setSearchProgress(80);

      // Extract enriched data from research results
      const { insights, sources } = result?.results 
        ? extractInsightsFromResults(result.results)
        : { insights: [], sources: [] };

      const enrichedResult: EnrichedResult = {
        type: 'person',
        name: fullName || 'Unknown',
        title: result?.results?.[0]?.metadata?.author || 'Professional',
        company: personForm.company || 'Unknown Company',
        location: personForm.country !== 'All Countries' ? personForm.country : 'Global',
        linkedin: personForm.linkedinUrl || undefined,
        email: personForm.email || undefined,
        phone: personForm.phone || undefined,
        summary: result?.results?.[0]?.summary || `Professional profile for ${fullName}. Research completed with ${result?.results?.length || 0} sources analyzed.`,
        insights,
        sources,
        enrichedAt: new Date(),
      };

      setResults([enrichedResult]);
      setSearchProgress(100);
      
      toast({ 
        title: "Lead Enrichment Complete", 
        description: `Found ${sources.length} sources with ${insights.length} key insights` 
      });

    } catch (error) {
      console.error('Lead enrichment failed:', error);
      toast({ 
        title: "Search Failed", 
        description: error instanceof Error ? error.message : "Could not complete the search", 
        variant: "destructive" 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCompanySearch = async () => {
    if (!companyForm.companyName && !companyForm.website) {
      toast({ title: "Missing Information", description: "Please provide a company name or website", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setSearchProgress(0);
    setResults([]);

    try {
      const reportContext = reportTypes.find(r => r.id === selectedReport);
      
      // Build comprehensive company search query
      let searchQuery = `Company analysis: ${companyForm.companyName || companyForm.website}`;
      if (companyForm.industry) searchQuery += ` in ${companyForm.industry} industry`;
      if (companyForm.country !== 'All Countries') searchQuery += ` based in ${companyForm.country}`;
      searchQuery += '. ';

      // Add report-specific focus
      switch (selectedReport) {
        case 'full':
          searchQuery += 'Include company overview, products/services, key executives, financials, market position, competitors, recent news, and contact information.';
          break;
        case 'executive':
          searchQuery += 'Focus on company strategy, market position, key initiatives, and growth trajectory.';
          break;
        case 'sales':
          searchQuery += 'Include decision makers, budget information, pain points, current solutions, and buying cycle stage.';
          break;
        case 'hr':
          searchQuery += 'Focus on company culture, hiring trends, employee reviews, and organizational structure.';
          break;
      }

      setSearchProgress(20);
      
      const result = await startResearch(searchQuery);
      
      setSearchProgress(80);

      // Extract enriched data from research results
      const { insights, sources } = result?.results 
        ? extractInsightsFromResults(result.results)
        : { insights: [], sources: [] };

      const enrichedResult: EnrichedResult = {
        type: 'company',
        name: companyForm.companyName || companyForm.website,
        industry: companyForm.industry || 'Technology',
        location: companyForm.country !== 'All Countries' ? companyForm.country : 'Global',
        website: companyForm.website || undefined,
        employees: 'Research pending',
        revenue: 'Research pending',
        summary: result?.results?.[0]?.summary || `Company profile for ${companyForm.companyName}. Research completed with ${result?.results?.length || 0} sources analyzed.`,
        insights,
        sources,
        enrichedAt: new Date(),
      };

      setResults([enrichedResult]);
      setSearchProgress(100);
      
      toast({ 
        title: "Company Enrichment Complete", 
        description: `Found ${sources.length} sources with ${insights.length} key insights` 
      });

    } catch (error) {
      console.error('Company enrichment failed:', error);
      toast({ 
        title: "Search Failed", 
        description: error instanceof Error ? error.message : "Could not complete the search", 
        variant: "destructive" 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const clearPersonForm = () => {
    setPersonForm({
      firstName: '',
      lastName: '',
      company: '',
      country: 'All Countries',
      linkedinUrl: '',
      email: '',
      phone: '',
    });
    setResults([]);
  };

  const clearCompanyForm = () => {
    setCompanyForm({
      companyName: '',
      industry: '',
      country: 'All Countries',
      website: '',
    });
    setResults([]);
  };

  const exportResult = (result: EnrichedResult) => {
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.name.replace(/\s+/g, '_')}_enriched.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Lead data exported successfully" });
  };

  // Sync progress with research engine
  if (isSearching && currentTask && searchProgress < 80) {
    const engineProgress = Math.min(currentTask.progress * 0.8, 75);
    if (engineProgress > searchProgress) {
      setSearchProgress(engineProgress);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Lead Enrichment</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Search for prospects and companies to get LinkedIn profiles, contact details, and generate tailored intelligence reports powered by AI research.
          </p>
        </div>

        {/* Report Type Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {reportTypes.map((type) => (
            <Button
              key={type.id}
              variant={selectedReport === type.id ? "default" : "outline"}
              onClick={() => setSelectedReport(type.id)}
              className="gap-2 h-auto py-2"
            >
              <type.icon className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium text-sm">{type.label}</div>
                <div className="text-[10px] opacity-70">{type.description}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Search Form */}
        <Card variant="glass" className="p-6 mb-8">
          <Tabs value={searchType} onValueChange={(v: any) => setSearchType(v)}>
            <TabsList className="mb-6">
              <TabsTrigger value="person" className="gap-2">
                <Users className="w-4 h-4" />
                Person Search
              </TabsTrigger>
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="w-4 h-4" />
                Company Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="person" className="space-y-6">
              <div>
                <h3 className="font-medium mb-1">Search by Name or Direct Lookup</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Find prospects by name, LinkedIn URL, email, or phone number. The AI will research and enrich the profile.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={personForm.firstName}
                        onChange={(e) => setPersonForm(p => ({ ...p, firstName: e.target.value }))}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={personForm.lastName}
                        onChange={(e) => setPersonForm(p => ({ ...p, lastName: e.target.value }))}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Company (Optional)</Label>
                    <Input
                      value={personForm.company}
                      onChange={(e) => setPersonForm(p => ({ ...p, company: e.target.value }))}
                      placeholder="e.g., Google"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={personForm.country} onValueChange={(v) => setPersonForm(p => ({ ...p, country: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Direct Lookup (Optional)</h4>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4" />
                      LinkedIn Profile URL
                    </Label>
                    <Input
                      value={personForm.linkedinUrl}
                      onChange={(e) => setPersonForm(p => ({ ...p, linkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <Input
                      value={personForm.email}
                      onChange={(e) => setPersonForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      value={personForm.phone}
                      onChange={(e) => setPersonForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                </div>
              </div>

              {isSearching && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Researching profile...</span>
                    <span className="font-medium">{Math.round(searchProgress)}%</span>
                  </div>
                  <Progress value={searchProgress} className="h-2" />
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handlePersonSearch} disabled={isSearching} className="gap-2">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search Prospects
                </Button>
                <Button variant="outline" onClick={clearPersonForm} disabled={isSearching}>Clear Filters</Button>
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-6">
              <div>
                <h3 className="font-medium mb-1">Search by Company</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Find company information, key executives, and business intelligence powered by AI research.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyForm.companyName}
                    onChange={(e) => setCompanyForm(p => ({ ...p, companyName: e.target.value }))}
                    placeholder="e.g., Microsoft"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm(p => ({ ...p, industry: e.target.value }))}
                    placeholder="e.g., Technology"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={companyForm.country} onValueChange={(v) => setCompanyForm(p => ({ ...p, country: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </Label>
                  <Input
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm(p => ({ ...p, website: e.target.value }))}
                    placeholder="https://company.com"
                  />
                </div>
              </div>

              {isSearching && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Researching company...</span>
                    <span className="font-medium">{Math.round(searchProgress)}%</span>
                  </div>
                  <Progress value={searchProgress} className="h-2" />
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleCompanySearch} disabled={isSearching} className="gap-2">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search Company
                </Button>
                <Button variant="outline" onClick={clearCompanyForm} disabled={isSearching}>Clear Filters</Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Enriched Results
              </h3>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <Card key={index} variant="glass" className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-semibold flex items-center gap-2">
                          {result.name}
                          {result.type === 'person' ? (
                            <Badge variant="secondary">Person</Badge>
                          ) : (
                            <Badge variant="secondary">Company</Badge>
                          )}
                        </h4>
                        {result.type === 'person' && (
                          <p className="text-muted-foreground">
                            {result.title} {result.company && `at ${result.company}`}
                          </p>
                        )}
                        {result.type === 'company' && (
                          <p className="text-muted-foreground">
                            {result.industry} • {result.location}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => exportResult(result)} className="gap-2">
                        <Download className="w-4 h-4" />
                        Export
                      </Button>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                      {result.location && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" /> {result.location}
                        </span>
                      )}
                      {result.linkedin && (
                        <a href={result.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <Linkedin className="w-4 h-4" /> LinkedIn
                        </a>
                      )}
                      {result.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" /> {result.email}
                        </span>
                      )}
                      {result.website && (
                        <a href={result.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <Globe className="w-4 h-4" /> Website
                        </a>
                      )}
                    </div>

                    {result.type === 'company' && (
                      <div className="flex items-center gap-4 mb-4">
                        <Badge variant="outline">Employees: {result.employees}</Badge>
                        <Badge variant="outline">Revenue: {result.revenue}</Badge>
                      </div>
                    )}

                    {/* Summary */}
                    <p className="text-sm mb-4">{result.summary}</p>

                    {/* Key Insights */}
                    {result.insights.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          Key Insights
                        </h5>
                        <ul className="space-y-1">
                          {result.insights.map((insight, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sources */}
                    {result.sources.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <h5 className="font-medium text-sm mb-2">Sources ({result.sources.length})</h5>
                        <div className="flex flex-wrap gap-2">
                          {result.sources.map((source, i) => (
                            <a
                              key={i}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                            >
                              {source.title}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Enriched {new Date(result.enrichedAt).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {reportTypes.find(r => r.id === selectedReport)?.label} Report
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {results.length === 0 && !isSearching && (
          <Card variant="glass" className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Results Yet</h3>
            <p className="text-sm text-muted-foreground/70 mt-2 max-w-md mx-auto">
              Search for a person or company to enrich their profile with AI-powered research from multiple sources.
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  );
};
