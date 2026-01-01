import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Building2, Mail, Phone, Linkedin, Globe,
  FileText, Briefcase, UserCheck, Loader2, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useResearchEngine } from '@/hooks/useResearchEngine';

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
  const [results, setResults] = useState<any[]>([]);
  
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

  const handlePersonSearch = async () => {
    if (!personForm.firstName && !personForm.lastName && !personForm.linkedinUrl && !personForm.email) {
      toast({ title: "Missing Information", description: "Please provide at least a name or direct lookup info", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const searchQuery = personForm.linkedinUrl 
        ? `LinkedIn profile analysis: ${personForm.linkedinUrl}`
        : `${personForm.firstName} ${personForm.lastName}${personForm.company ? ` at ${personForm.company}` : ''}${personForm.country !== 'All Countries' ? ` in ${personForm.country}` : ''} professional background, experience, and contact information`;

      await startResearch(searchQuery);

      // Mock results for demo
      setTimeout(() => {
        setResults([{
          type: 'person',
          name: `${personForm.firstName} ${personForm.lastName}`,
          title: 'Senior Director',
          company: personForm.company || 'Unknown Company',
          location: personForm.country,
          linkedin: personForm.linkedinUrl || 'https://linkedin.com/in/example',
          email: personForm.email || 'contact@example.com',
          summary: 'Experienced professional with expertise in technology and business development.',
        }]);
        setIsSearching(false);
        toast({ title: "Search Complete", description: "Lead information retrieved" });
      }, 2000);
    } catch (error) {
      setIsSearching(false);
      toast({ title: "Search Failed", description: "Could not complete the search", variant: "destructive" });
    }
  };

  const handleCompanySearch = async () => {
    if (!companyForm.companyName && !companyForm.website) {
      toast({ title: "Missing Information", description: "Please provide a company name or website", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const searchQuery = `Company analysis: ${companyForm.companyName || companyForm.website}${companyForm.industry ? ` in ${companyForm.industry} industry` : ''}${companyForm.country !== 'All Countries' ? ` based in ${companyForm.country}` : ''}. Include company overview, key executives, financials, and market position.`;

      await startResearch(searchQuery);

      setTimeout(() => {
        setResults([{
          type: 'company',
          name: companyForm.companyName,
          industry: companyForm.industry || 'Technology',
          location: companyForm.country,
          website: companyForm.website || 'https://example.com',
          employees: '500-1000',
          revenue: '$50M-$100M',
          summary: 'Leading provider of innovative solutions in the technology sector.',
        }]);
        setIsSearching(false);
        toast({ title: "Search Complete", description: "Company information retrieved" });
      }, 2000);
    } catch (error) {
      setIsSearching(false);
      toast({ title: "Search Failed", description: "Could not complete the search", variant: "destructive" });
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
  };

  const clearCompanyForm = () => {
    setCompanyForm({
      companyName: '',
      industry: '',
      country: 'All Countries',
      website: '',
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Lead Enrichment</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Search for prospects and companies to get LinkedIn profiles, contact details, and generate tailored intelligence reports.
          </p>
        </div>

        {/* Report Type Selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {reportTypes.map((type) => (
            <Button
              key={type.id}
              variant={selectedReport === type.id ? "default" : "outline"}
              onClick={() => setSelectedReport(type.id)}
              className="gap-2"
            >
              <type.icon className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium">{type.label}</div>
                <div className="text-xs opacity-70">{type.description}</div>
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
                  Find prospects by name, LinkedIn URL, email, or phone number. Filter by country and company.
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

              <div className="flex gap-3">
                <Button onClick={handlePersonSearch} disabled={isSearching} className="gap-2">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search Prospects
                </Button>
                <Button variant="outline" onClick={clearPersonForm}>Clear Filters</Button>
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-6">
              <div>
                <h3 className="font-medium mb-1">Search by Company</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Find company information, key executives, and business intelligence.
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

              <div className="flex gap-3">
                <Button onClick={handleCompanySearch} disabled={isSearching} className="gap-2">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search Company
                </Button>
                <Button variant="outline" onClick={clearCompanyForm}>Clear Filters</Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="text-lg font-semibold mb-4">Results</h3>
            <div className="space-y-4">
              {results.map((result, index) => (
                <Card key={index} variant="glass" className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xl font-semibold">{result.name}</h4>
                      {result.type === 'person' && (
                        <>
                          <p className="text-muted-foreground">{result.title} at {result.company}</p>
                          <div className="flex items-center gap-4 mt-3">
                            {result.linkedin && (
                              <a href={result.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                                <Linkedin className="w-4 h-4" /> LinkedIn
                              </a>
                            )}
                            {result.email && (
                              <span className="flex items-center gap-1 text-sm">
                                <Mail className="w-4 h-4" /> {result.email}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      {result.type === 'company' && (
                        <>
                          <p className="text-muted-foreground">{result.industry} • {result.location}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <Badge variant="secondary">Employees: {result.employees}</Badge>
                            <Badge variant="secondary">Revenue: {result.revenue}</Badge>
                          </div>
                        </>
                      )}
                      <p className="mt-4 text-sm">{result.summary}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {results.length === 0 && !isSearching && (
          <Card variant="glass" className="p-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Search for Prospects</h3>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Enter a name above to find prospects and generate detailed intelligence reports including company positioning, experience, and more.
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  );
};
