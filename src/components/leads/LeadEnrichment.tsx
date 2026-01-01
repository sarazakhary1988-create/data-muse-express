import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Building2, Mail, Phone, Linkedin, Globe,
  FileText, Briefcase, UserCheck, Loader2, Download, ExternalLink,
  MapPin, Calendar, Award, TrendingUp, AlertCircle, GraduationCap,
  DollarSign, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  // Person fields
  title?: string;
  company?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  education?: string[];
  experience?: Array<{ title: string; company: string; duration: string }>;
  skills?: string[];
  // Company fields
  industry?: string;
  location?: string;
  website?: string;
  employees?: string;
  founded?: string;
  // Shared fields
  overview: string;
  financials?: {
    revenue?: string;
    funding?: string;
    valuation?: string;
    investors?: string[];
  };
  leadership?: Array<{
    name: string;
    title: string;
    background?: string;
  }>;
  boardMembers?: Array<{
    name: string;
    title?: string;
    otherRoles?: string;
  }>;
  keyFacts: string[];
  recentNews?: string[];
  sources: Array<{ title: string; url: string }>;
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePersonSearch = async () => {
    if (!personForm.firstName && !personForm.lastName && !personForm.linkedinUrl && !personForm.email) {
      toast({ title: "Missing Information", description: "Please provide at least a name or direct lookup info", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setSearchProgress(10);
    setResults([]);

    try {
      setSearchProgress(30);
      
      const { data, error } = await supabase.functions.invoke('lead-enrichment', {
        body: {
          type: 'person',
          firstName: personForm.firstName,
          lastName: personForm.lastName,
          company: personForm.company,
          country: personForm.country !== 'All Countries' ? personForm.country : undefined,
          linkedinUrl: personForm.linkedinUrl,
          email: personForm.email,
          reportType: selectedReport,
        },
      });

      setSearchProgress(80);

      if (error || !data?.success) {
        toast({ 
          title: "Enrichment Failed", 
          description: error?.message || data?.error || "Could not enrich profile", 
          variant: "destructive" 
        });
        return;
      }

      const enrichedResult: EnrichedResult = {
        ...data.data,
        enrichedAt: new Date(),
      };

      setResults([enrichedResult]);
      setSearchProgress(100);
      
      toast({ 
        title: "Lead Enrichment Complete", 
        description: `Profile enriched with ${data.data.sources?.length || 0} sources` 
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
    setSearchProgress(10);
    setResults([]);

    try {
      setSearchProgress(30);
      
      const { data, error } = await supabase.functions.invoke('lead-enrichment', {
        body: {
          type: 'company',
          companyName: companyForm.companyName || companyForm.website,
          industry: companyForm.industry,
          country: companyForm.country !== 'All Countries' ? companyForm.country : undefined,
          website: companyForm.website,
          reportType: selectedReport,
        },
      });

      setSearchProgress(80);

      if (error || !data?.success) {
        toast({ 
          title: "Enrichment Failed", 
          description: error?.message || data?.error || "Could not enrich company", 
          variant: "destructive" 
        });
        return;
      }

      const enrichedResult: EnrichedResult = {
        ...data.data,
        enrichedAt: new Date(),
      };

      setResults([enrichedResult]);
      setSearchProgress(100);
      
      toast({ 
        title: "Company Enrichment Complete", 
        description: `Profile enriched with ${data.data.sources?.length || 0} sources` 
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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Lead Enrichment</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get comprehensive company profiles with financials, founders, board members, and leadership details powered by AI research.
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
                  Get comprehensive company profile with overview, financials, founders, board members, and leadership.
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
              <div className="space-y-6">
                {results.map((result, index) => (
                  <Card key={index} variant="glass" className="overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-border">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-2xl font-bold flex items-center gap-3">
                            {result.name}
                            <Badge variant="secondary" className="text-xs">
                              {result.type === 'person' ? 'Person' : 'Company'}
                            </Badge>
                          </h4>
                          {result.type === 'person' && (
                            <p className="text-muted-foreground mt-1">
                              {result.title} {result.company && `at ${result.company}`}
                            </p>
                          )}
                          {result.type === 'company' && (
                            <p className="text-muted-foreground mt-1">
                              {result.industry} • {result.location} {result.founded && `• Founded ${result.founded}`}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => exportResult(result)} className="gap-2">
                          <Download className="w-4 h-4" />
                          Export
                        </Button>
                      </div>

                      {/* Quick Info Row */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {result.location && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-4 h-4" /> {result.location}
                          </span>
                        )}
                        {result.linkedinUrl && (
                          <a href={result.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
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
                        {result.employees && (
                          <Badge variant="outline">{result.employees}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Overview */}
                      <div>
                        <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          Overview
                        </h5>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.overview}</p>
                      </div>

                      {/* Financials Section */}
                      {result.financials && (
                        <Collapsible open={expandedSections['financials']} onOpenChange={() => toggleSection('financials')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              Financial Information
                            </h5>
                            {expandedSections['financials'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              {result.financials.revenue && (
                                <div className="p-3 rounded-lg bg-muted/30">
                                  <div className="text-xs text-muted-foreground">Revenue</div>
                                  <div className="font-semibold">{result.financials.revenue}</div>
                                </div>
                              )}
                              {result.financials.funding && (
                                <div className="p-3 rounded-lg bg-muted/30">
                                  <div className="text-xs text-muted-foreground">Total Funding</div>
                                  <div className="font-semibold">{result.financials.funding}</div>
                                </div>
                              )}
                              {result.financials.valuation && (
                                <div className="p-3 rounded-lg bg-muted/30">
                                  <div className="text-xs text-muted-foreground">Valuation</div>
                                  <div className="font-semibold">{result.financials.valuation}</div>
                                </div>
                              )}
                              {result.financials.investors && result.financials.investors.length > 0 && (
                                <div className="p-3 rounded-lg bg-muted/30 md:col-span-2">
                                  <div className="text-xs text-muted-foreground mb-1">Key Investors</div>
                                  <div className="flex flex-wrap gap-2">
                                    {result.financials.investors.map((investor, i) => (
                                      <Badge key={i} variant="secondary">{investor}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Leadership Section */}
                      {result.leadership && result.leadership.length > 0 && (
                        <Collapsible open={expandedSections['leadership']} onOpenChange={() => toggleSection('leadership')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-500" />
                              Leadership & Founders ({result.leadership.length})
                            </h5>
                            {expandedSections['leadership'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <div className="space-y-3">
                              {result.leadership.map((leader, i) => (
                                <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-semibold">{leader.name}</div>
                                      <div className="text-sm text-primary">{leader.title}</div>
                                    </div>
                                  </div>
                                  {leader.background && (
                                    <p className="text-sm text-muted-foreground mt-2">{leader.background}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Board Members Section */}
                      {result.boardMembers && result.boardMembers.length > 0 && (
                        <Collapsible open={expandedSections['board']} onOpenChange={() => toggleSection('board')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-500" />
                              Board of Directors ({result.boardMembers.length})
                            </h5>
                            {expandedSections['board'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <div className="grid md:grid-cols-2 gap-3">
                              {result.boardMembers.map((member, i) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                  <div className="font-semibold">{member.name}</div>
                                  {member.title && <div className="text-sm text-primary">{member.title}</div>}
                                  {member.otherRoles && (
                                    <p className="text-xs text-muted-foreground mt-1">{member.otherRoles}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Person Experience */}
                      {result.type === 'person' && result.experience && result.experience.length > 0 && (
                        <Collapsible open={expandedSections['experience']} onOpenChange={() => toggleSection('experience')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-orange-500" />
                              Experience ({result.experience.length})
                            </h5>
                            {expandedSections['experience'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <div className="space-y-3">
                              {result.experience.map((exp, i) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/30 border-l-2 border-primary">
                                  <div className="font-semibold">{exp.title}</div>
                                  <div className="text-sm text-muted-foreground">{exp.company}</div>
                                  <div className="text-xs text-muted-foreground">{exp.duration}</div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Education */}
                      {result.education && result.education.length > 0 && (
                        <Collapsible open={expandedSections['education']} onOpenChange={() => toggleSection('education')}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <h5 className="font-semibold text-sm flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-teal-500" />
                              Education
                            </h5>
                            {expandedSections['education'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <ul className="space-y-2">
                              {result.education.map((edu, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  {edu}
                                </li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Key Facts */}
                      {result.keyFacts && result.keyFacts.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Key Facts
                          </h5>
                          <ul className="grid md:grid-cols-2 gap-2">
                            {result.keyFacts.map((fact, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded bg-muted/30">
                                <span className="text-primary mt-0.5">✓</span>
                                {fact}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recent News */}
                      {result.recentNews && result.recentNews.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Recent News
                          </h5>
                          <ul className="space-y-2">
                            {result.recentNews.map((news, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-muted-foreground/50">—</span>
                                {news}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sources */}
                      {result.sources && result.sources.length > 0 && (
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
                                {source.title?.slice(0, 40) || 'Source'}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Enriched {new Date(result.enrichedAt).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {reportTypes.find(r => r.id === selectedReport)?.label} Report
                        </Badge>
                      </div>
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
              Search for a company to get comprehensive profiles with financials, founders, board members, and leadership details.
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  );
};
