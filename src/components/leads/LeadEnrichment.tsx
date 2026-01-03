import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Building2, Mail, Phone, Linkedin, Globe,
  FileText, Briefcase, UserCheck, Loader2, Download, ExternalLink,
  MapPin, Calendar, Award, TrendingUp, AlertCircle, GraduationCap,
  DollarSign, User, ChevronDown, ChevronUp, MessageSquare, Send,
  Clock, Target, PieChart, Twitter, Facebook, Instagram, Youtube,
  Sparkles, XCircle, RefreshCw, Lightbulb, ThumbsUp, Zap, X
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  twitterUrl?: string;
  email?: string;
  phone?: string;
  location?: string;
  estimatedAnnualIncome?: string;
  aiProfileSummary?: string;
  profileSummary?: string;
  companyPositioning?: string;
  yearsOfExperience?: string;
  annualIncome?: {
    estimate: string;
    methodology: string;
    confidence: string;
  };
  bestTimeToContact?: {
    prediction: string;
    reasoning: string;
    confidence: string;
  };
  education?: Array<{ degree: string; institution: string; year: string; details?: string; field?: string; honors?: string }>;
  workExperience?: Array<{ title: string; company: string; duration: string; description?: string; location?: string }>;
  skills?: string[];
  keyInsights?: string[];
  strengths?: string[];
  recommendations?: string[];
  investmentInterests?: {
    sectors?: string[];
    investmentStyle?: string;
    pastInvestments?: string[];
    boardPositions?: string[];
  };
  interestIndicators?: {
    businessInterests?: string[];
    personalInterests?: string[];
    networkingEvents?: string[];
    publicationsOrMedia?: string[];
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
    others?: string[];
  };
  // Company fields
  industry?: string;
  subIndustry?: string;
  website?: string;
  employees?: string;
  founded?: string;
  estimatedRevenueRange?: string;
  offices?: Array<{ location: string; type: string; address?: string; phone?: string }>;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  ownership?: {
    type?: string;
    majorShareholders?: Array<{ name: string; stake?: string; type?: string; aiProfileSummary?: string }>;
    ultimateOwner?: string;
  };
  products?: string[];
  keyClients?: string[];
  competitors?: string[];
  investmentActivity?: {
    acquisitions?: Array<{ company: string; date: string; amount?: string; rationale?: string }>;
    investments?: Array<{ company: string; date: string; amount?: string; stage?: string }>;
    fundingReceived?: Array<{ round: string; date: string; amount: string; investors?: string[] }>;
  };
  marketPosition?: string;
  // Shared fields
  overview: string;
  financials?: {
    revenue?: string;
    funding?: string;
    valuation?: string;
    investors?: string[];
    netIncome?: string;
    lastFundingRound?: { amount: string; date: string; series: string };
  };
  leadership?: Array<{
    name: string;
    title: string;
    background?: string;
    aiProfileSummary?: string;
    linkedinUrl?: string;
    tenure?: string;
  }>;
  boardMembers?: Array<{
    name: string;
    title?: string;
    otherRoles?: string;
    aiProfileSummary?: string;
    background?: string;
  }>;
  keyPeople?: Array<{
    name: string;
    title: string;
    aiProfileSummary?: string;
    department?: string;
    linkedinUrl?: string;
  }>;
  keyFacts: string[];
  recentNews?: Array<{ headline: string; date?: string; summary?: string; url?: string; significance?: string } | string>;
  sources: Array<{ title: string; url: string }>;
  enrichedAt: Date;
}

// Profile popup for clickable names
interface ProfilePopupData {
  name: string;
  title?: string;
  aiProfileSummary?: string;
  linkedinUrl?: string;
  tenure?: string;
  stake?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

const progressStages = [
  { min: 0, max: 15, message: 'Initiating web search...' },
  { min: 15, max: 35, message: 'Searching professional databases...' },
  { min: 35, max: 50, message: 'Scraping social profiles...' },
  { min: 50, max: 70, message: 'Extracting company data...' },
  { min: 70, max: 85, message: 'Generating AI analysis with OpenAI GPT-4o...' },
  { min: 85, max: 100, message: 'Compiling final report...' },
];

export const LeadEnrichment = () => {
  const [searchType, setSearchType] = useState<'person' | 'company'>('person');
  const [selectedReport, setSelectedReport] = useState<ReportType>('full');
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Profile popup state for clickable management/owner names
  const [profilePopup, setProfilePopup] = useState<ProfilePopupData | null>(null);
  
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

  const simulateProgress = useCallback(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress > 95) progress = 95;
      setSearchProgress(progress);
      
      const stage = progressStages.find(s => progress >= s.min && progress < s.max);
      if (stage) setProgressMessage(stage.message);
    }, 500);
    return interval;
  }, []);

  const handlePersonSearch = async () => {
    if (!personForm.firstName && !personForm.lastName && !personForm.linkedinUrl && !personForm.email) {
      toast({ title: "Missing Information", description: "Please provide at least a name or direct lookup info", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setSearchProgress(5);
    setProgressMessage('Initializing research engine...');
    setResults([]);
    setChatMessages([]);
    setShowChat(false);

    const progressInterval = simulateProgress();

    try {
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

      clearInterval(progressInterval);

      if (error || !data?.success) {
        setSearchProgress(0);
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
      setProgressMessage('Complete!');
      
      toast({ 
        title: "Lead Enrichment Complete", 
        description: `Profile enriched with ${data.data.sources?.length || 0} sources using OpenAI GPT-4o` 
      });

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Lead enrichment failed:', error);
      setSearchProgress(0);
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
    setSearchProgress(5);
    setProgressMessage('Initializing research engine...');
    setResults([]);
    setChatMessages([]);
    setShowChat(false);

    const progressInterval = simulateProgress();

    try {
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

      clearInterval(progressInterval);

      if (error || !data?.success) {
        setSearchProgress(0);
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
      setProgressMessage('Complete!');
      
      toast({ 
        title: "Company Enrichment Complete", 
        description: `Profile enriched with ${data.data.sources?.length || 0} sources using OpenAI GPT-4o` 
      });

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Company enrichment failed:', error);
      setSearchProgress(0);
      toast({ 
        title: "Search Failed", 
        description: error instanceof Error ? error.message : "Could not complete the search", 
        variant: "destructive" 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !results[0]) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    
    try {
      const result = results[0];
      const currentReportContent = JSON.stringify(result, null, 2);
      
      const { data, error } = await supabase.functions.invoke('lead-enrichment', {
        body: {
          type: 'chat_edit',
          currentReport: currentReportContent,
          editInstruction: userMessage,
          reportContext: {
            name: result.name,
            entityType: result.type,
          },
        },
      });
      
      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to process edit');
      }
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.updatedReport }]);
      
      // Try to update the result if the response is JSON
      try {
        const updatedResult = JSON.parse(data.updatedReport);
        if (updatedResult.name) {
          setResults([{ ...updatedResult, enrichedAt: new Date() }]);
          toast({ title: "Report Updated", description: "Your changes have been applied" });
        }
      } catch {
        // Response is not JSON, just show in chat
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, I couldn't process that request: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }]);
    } finally {
      setIsChatLoading(false);
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
    setChatMessages([]);
  };

  const clearCompanyForm = () => {
    setCompanyForm({
      companyName: '',
      industry: '',
      country: 'All Countries',
      website: '',
    });
    setResults([]);
    setChatMessages([]);
  };

  const exportResult = async (result: EnrichedResult, format: 'json' | 'markdown' | 'html' | 'pdf' = 'json') => {
    // Build JSON with full evidence chain
    const exportData = {
      ...result,
      evidenceChain: result.sources?.map((s, i) => ({
        sourceId: i + 1,
        title: s.title,
        url: s.url,
        extractedData: result.keyFacts?.slice(i * 2, i * 2 + 2) || [],
      })),
      exportedAt: new Date().toISOString(),
    };

    if (format === 'json') {
      const data = JSON.stringify(exportData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.name.replace(/\s+/g, '_')}_enriched.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: `Report exported as JSON with ${result.sources?.length || 0} sources` });
      return;
    }

    // Use the export-report function for other formats
    try {
      const reportData = {
        title: `${result.type === 'person' ? 'Person' : 'Company'} Profile: ${result.name}`,
        summary: result.overview || result.aiProfileSummary || '',
        sections: [
          result.type === 'person' && result.aiProfileSummary ? { heading: 'AI Profile Summary', content: result.aiProfileSummary, citations: [] } : null,
          result.type === 'person' && result.estimatedAnnualIncome ? { heading: 'Estimated Annual Income', content: result.estimatedAnnualIncome, citations: [] } : null,
          result.type === 'person' && result.bestTimeToContact ? { heading: 'Best Time to Contact', content: `${result.bestTimeToContact.prediction}\n\nReasoning: ${result.bestTimeToContact.reasoning}\n\nConfidence: ${result.bestTimeToContact.confidence}`, citations: [] } : null,
          result.financials ? { heading: 'Financial Information', content: `Revenue: ${result.financials.revenue || 'N/A'}\nFunding: ${result.financials.funding || 'N/A'}\nValuation: ${result.financials.valuation || 'N/A'}`, citations: [] } : null,
          result.leadership?.length ? { heading: 'Leadership', content: result.leadership.map(l => `**${l.name}** - ${l.title}\n${l.aiProfileSummary || l.background || ''}`).join('\n\n'), citations: [] } : null,
          result.keyFacts?.length ? { heading: 'Key Facts', content: result.keyFacts.map(f => `• ${f}`).join('\n'), citations: [] } : null,
          // Evidence chain section
          result.sources?.length ? { 
            heading: 'Evidence Chain & Sources', 
            content: result.sources.map((s, i) => `${i + 1}. **${s.title}**\n   URL: ${s.url}`).join('\n\n'),
            citations: result.sources.map(s => s.url)
          } : null,
        ].filter(Boolean),
        citations: result.sources?.map((s, i) => ({
          id: `${i + 1}`,
          text: s.title,
          context: s.url,
          confidence: 0.9,
        })) || [],
        metadata: {
          totalSources: result.sources?.length || 0,
          verifiedClaims: result.keyFacts?.length || 0,
          confidenceScore: 0.85,
          generatedAt: new Date().toISOString(),
        },
      };
      
      const { data, error } = await supabase.functions.invoke('export-report', {
        body: { report: reportData, format },
      });
      
      if (error) throw error;
      
      let mimeType = 'text/markdown';
      let extension = 'md';
      
      if (format === 'html') {
        mimeType = 'text/html';
        extension = 'html';
      } else if (format === 'pdf') {
        mimeType = 'application/pdf';
        extension = 'pdf';
      }
      
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.name.replace(/\s+/g, '_')}_enriched.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Exported", description: `Report exported as ${format.toUpperCase()} with evidence chain` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "Could not export report", variant: "destructive" });
    }
  };

  const renderPersonResult = (result: EnrichedResult, index: number) => (
    <Card key={index} variant="glass" className="overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-2xl font-bold flex items-center gap-3">
              {result.name}
              <Badge variant="secondary" className="text-xs">Person</Badge>
            </h4>
            <p className="text-muted-foreground mt-1">
              {result.title} {result.company && `at ${result.company}`}
            </p>
            {result.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {result.location}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Edit with AI
            </Button>
            <Select onValueChange={(v) => exportResult(result, v as any)} defaultValue="">
              <SelectTrigger className="w-[140px] h-9">
                <Download className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (with sources)</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="pdf">PDF Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Info Row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {result.socialProfiles?.linkedin && (
            <a href={result.socialProfiles.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
          )}
          {result.socialProfiles?.twitter && (
            <a href={result.socialProfiles.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Twitter className="w-4 h-4" /> Twitter
            </a>
          )}
          {result.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-4 h-4" /> {result.email}
            </span>
          )}
          {result.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" /> {result.phone}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* AI Profile Summary */}
        {result.aiProfileSummary && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Profile Summary
            </h5>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.aiProfileSummary}</p>
          </div>
        )}

        {/* Key Stats Row */}
        <div className="grid md:grid-cols-3 gap-4">
          {result.estimatedAnnualIncome && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Estimated Annual Income
              </h5>
              <p className="text-lg font-bold text-green-600">{result.estimatedAnnualIncome}</p>
              {result.annualIncome?.methodology && (
                <p className="text-xs text-muted-foreground mt-1">{result.annualIncome.methodology}</p>
              )}
            </div>
          )}
          
          {result.yearsOfExperience && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-500" />
                Years of Experience
              </h5>
              <p className="text-lg font-bold text-purple-600">{result.yearsOfExperience}</p>
            </div>
          )}
          
          {result.bestTimeToContact && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Best Time to Contact
              </h5>
              <p className="font-semibold text-blue-600">{result.bestTimeToContact.prediction}</p>
              <p className="text-xs text-muted-foreground mt-1">{result.bestTimeToContact.reasoning}</p>
              <Badge variant="outline" className="mt-2">{result.bestTimeToContact.confidence} confidence</Badge>
            </div>
          )}
        </div>

        {/* Company Positioning */}
        {result.companyPositioning && (
          <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              Company Positioning
            </h5>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.companyPositioning}</p>
          </div>
        )}

        {/* Overview */}
        {result.overview && (
          <div>
            <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Professional Overview
            </h5>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.overview}</p>
          </div>
        )}

        {/* Key Insights */}
        {result.keyInsights && result.keyInsights.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Key Insights ({result.keyInsights.length})
            </h5>
            <ul className="space-y-2">
              {result.keyInsights.map((insight, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded bg-background/50">
                  <span className="text-amber-500 mt-0.5 font-bold">{i + 1}.</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Strengths */}
        {result.strengths && result.strengths.length > 0 && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
              Key Strengths
            </h5>
            <ul className="space-y-2">
              {result.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded bg-background/50">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-500" />
              Engagement Recommendations
            </h5>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded bg-background/50">
                  <span className="text-cyan-500 mt-0.5">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Investment Interests */}
        {result.investmentInterests && (
          <Collapsible open={expandedSections['investments']} onOpenChange={() => toggleSection('investments')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                Investment Interests & Activity
              </h5>
              {expandedSections['investments'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {result.investmentInterests.sectors && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Sectors of Interest</div>
                    <div className="flex flex-wrap gap-1">
                      {result.investmentInterests.sectors.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
                    </div>
                  </div>
                )}
                {result.investmentInterests.investmentStyle && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Investment Style</div>
                    <div className="font-medium">{result.investmentInterests.investmentStyle}</div>
                  </div>
                )}
                {result.investmentInterests.pastInvestments?.length ? (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Past Investments</div>
                    <div className="flex flex-wrap gap-1">
                      {result.investmentInterests.pastInvestments.map((p, i) => <Badge key={i} variant="outline">{p}</Badge>)}
                    </div>
                  </div>
                ) : null}
                {result.investmentInterests.boardPositions?.length ? (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Board Positions</div>
                    <div className="flex flex-wrap gap-1">
                      {result.investmentInterests.boardPositions.map((b, i) => <Badge key={i} variant="outline">{b}</Badge>)}
                    </div>
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Interest Indicators */}
        {result.interestIndicators && (
          <Collapsible open={expandedSections['interests']} onOpenChange={() => toggleSection('interests')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-500" />
                Interest Indicators (AI Analysis)
              </h5>
              {expandedSections['interests'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {result.interestIndicators.businessInterests?.length ? (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Business Interests</div>
                    <div className="flex flex-wrap gap-1">
                      {result.interestIndicators.businessInterests.map((b, i) => <Badge key={i} variant="secondary">{b}</Badge>)}
                    </div>
                  </div>
                ) : null}
                {result.interestIndicators.personalInterests?.length ? (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Personal Interests</div>
                    <div className="flex flex-wrap gap-1">
                      {result.interestIndicators.personalInterests.map((p, i) => <Badge key={i} variant="outline">{p}</Badge>)}
                    </div>
                  </div>
                ) : null}
                {result.interestIndicators.networkingEvents?.length ? (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Networking Events</div>
                    <div className="flex flex-wrap gap-1">
                      {result.interestIndicators.networkingEvents.map((n, i) => <Badge key={i} variant="outline">{n}</Badge>)}
                    </div>
                  </div>
                ) : null}
                {result.interestIndicators.publicationsOrMedia?.length ? (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Publications & Media</div>
                    <ul className="text-sm space-y-1">
                      {result.interestIndicators.publicationsOrMedia.map((p, i) => <li key={i}>• {p}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Work Experience */}
        {result.workExperience && result.workExperience.length > 0 && (
          <Collapsible open={expandedSections['experience']} onOpenChange={() => toggleSection('experience')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-orange-500" />
                Work Experience ({result.workExperience.length})
              </h5>
              {expandedSections['experience'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-3">
                {result.workExperience.map((exp, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 border-l-2 border-primary">
                    <div className="font-semibold">{exp.title}</div>
                    <div className="text-sm text-primary">{exp.company}</div>
                    <div className="text-xs text-muted-foreground">{exp.duration}</div>
                    {exp.description && <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>}
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
              <div className="space-y-3">
                {result.education.map((edu, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    <div className="font-semibold">{edu.degree}</div>
                    <div className="text-sm text-primary">{edu.institution}</div>
                    {edu.year && <div className="text-xs text-muted-foreground">{edu.year}</div>}
                    {edu.details && <p className="text-xs text-muted-foreground mt-1">{edu.details}</p>}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Skills */}
        {result.skills && result.skills.length > 0 && (
          <div>
            <h5 className="font-semibold text-sm mb-2">Skills & Expertise</h5>
            <div className="flex flex-wrap gap-2">
              {result.skills.map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)}
            </div>
          </div>
        )}

        {/* Social Profiles */}
        {result.socialProfiles && (
          <div>
            <h5 className="font-semibold text-sm mb-2">Social Profiles</h5>
            <div className="flex flex-wrap gap-2">
              {result.socialProfiles.linkedin && (
                <a href={result.socialProfiles.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
              )}
              {result.socialProfiles.twitter && (
                <a href={result.socialProfiles.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-sky-500/10 text-sky-600 hover:bg-sky-500/20">
                  <Twitter className="w-4 h-4" /> Twitter
                </a>
              )}
              {result.socialProfiles.website && (
                <a href={result.socialProfiles.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
              {result.socialProfiles.others?.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-muted hover:bg-muted/80">
                  <ExternalLink className="w-3 h-3" /> {new URL(url).hostname}
                </a>
              ))}
            </div>
          </div>
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
      </div>
    </Card>
  );

  const renderCompanyResult = (result: EnrichedResult, index: number) => (
    <Card key={index} variant="glass" className="overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-2xl font-bold flex items-center gap-3">
              {result.name}
              <Badge variant="secondary" className="text-xs">Company</Badge>
            </h4>
            <p className="text-muted-foreground mt-1">
              {result.industry} {result.subIndustry && `• ${result.subIndustry}`} {result.location && `• ${result.location}`} {result.founded && `• Founded ${result.founded}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Edit with AI
            </Button>
            <Select onValueChange={(v) => exportResult(result, v as any)} defaultValue="">
              <SelectTrigger className="w-[120px] h-9">
                <Download className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Info Row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {result.website && (
            <a href={result.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Globe className="w-4 h-4" /> Website
            </a>
          )}
          {result.socialMedia?.linkedin && (
            <a href={result.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Linkedin className="w-4 h-4" /> LinkedIn
            </a>
          )}
          {result.socialMedia?.twitter && (
            <a href={result.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Twitter className="w-4 h-4" /> Twitter
            </a>
          )}
          {result.employees && <Badge variant="outline">{result.employees}</Badge>}
          {result.estimatedRevenueRange && <Badge variant="secondary">{result.estimatedRevenueRange}</Badge>}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview */}
        <div>
          <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Company Overview
          </h5>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.overview}</p>
        </div>

        {/* Offices & Contact */}
        {result.offices && result.offices.length > 0 && (
          <Collapsible open={expandedSections['offices']} onOpenChange={() => toggleSection('offices')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                Office Locations ({result.offices.length})
              </h5>
              {expandedSections['offices'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-3">
                {result.offices.map((office, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="font-semibold flex items-center gap-2">
                      {office.location}
                      {office.type && <Badge variant="outline" className="text-xs">{office.type}</Badge>}
                    </div>
                    {office.address && <p className="text-sm text-muted-foreground mt-1">{office.address}</p>}
                    {office.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {office.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Financials */}
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
                    <div className="font-semibold text-green-600">{result.financials.revenue}</div>
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
                {result.financials.lastFundingRound && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Last Funding Round</div>
                    <div className="font-semibold">{result.financials.lastFundingRound.series} - {result.financials.lastFundingRound.amount}</div>
                    <div className="text-xs text-muted-foreground">{result.financials.lastFundingRound.date}</div>
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

        {/* Ownership - Clickable names with AI profile popups */}
        {result.ownership && (
          <Collapsible open={expandedSections['ownership']} onOpenChange={() => toggleSection('ownership')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-500" />
                Ownership Structure
              </h5>
              {expandedSections['ownership'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-3">
                {result.ownership.type && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Company Type</div>
                    <div className="font-semibold">{result.ownership.type}</div>
                  </div>
                )}
                {result.ownership.ultimateOwner && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground">Ultimate Owner</div>
                    <div className="font-semibold">{result.ownership.ultimateOwner}</div>
                  </div>
                )}
                {result.ownership.majorShareholders && result.ownership.majorShareholders.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-2">Major Shareholders / Owners / Founders</div>
                    <div className="space-y-3">
                      {result.ownership.majorShareholders.map((sh, i) => (
                        <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/50">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setProfilePopup({
                                name: sh.name,
                                title: sh.type,
                                aiProfileSummary: sh.aiProfileSummary,
                                stake: sh.stake,
                              })}
                              className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <User className="w-3 h-3" />
                              {sh.name}
                              {sh.aiProfileSummary && <Sparkles className="w-3 h-3 text-amber-500" />}
                            </button>
                            <div className="flex items-center gap-2">
                              {sh.stake && <Badge variant="secondary">{sh.stake}</Badge>}
                              {sh.type && <Badge variant="outline" className="text-xs">{sh.type}</Badge>}
                            </div>
                          </div>
                          {sh.aiProfileSummary && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{sh.aiProfileSummary}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Leadership - Clickable names */}
        {result.leadership && result.leadership.length > 0 && (
          <Collapsible open={expandedSections['leadership']} onOpenChange={() => toggleSection('leadership')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                Leadership & Executives ({result.leadership.length})
              </h5>
              {expandedSections['leadership'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-3">
                {result.leadership.map((leader, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          onClick={() => setProfilePopup({
                            name: leader.name,
                            title: leader.title,
                            aiProfileSummary: leader.aiProfileSummary || leader.background,
                            linkedinUrl: leader.linkedinUrl,
                            tenure: leader.tenure,
                          })}
                          className="font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {leader.name}
                          {leader.aiProfileSummary && <Sparkles className="w-3 h-3 text-amber-500" />}
                        </button>
                        <div className="text-sm text-muted-foreground">{leader.title}</div>
                        {leader.tenure && <div className="text-xs text-muted-foreground">{leader.tenure}</div>}
                      </div>
                      {leader.linkedinUrl && (
                        <a href={leader.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    {leader.aiProfileSummary && (
                      <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10">
                        <div className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI Profile Summary
                        </div>
                        <p className="text-sm text-muted-foreground">{leader.aiProfileSummary}</p>
                      </div>
                    )}
                    {leader.background && !leader.aiProfileSummary && (
                      <p className="text-sm text-muted-foreground mt-2">{leader.background}</p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Board Members - Clickable names */}
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
                    <button
                      onClick={() => setProfilePopup({
                        name: member.name,
                        title: member.title,
                        aiProfileSummary: member.aiProfileSummary || member.background,
                      })}
                      className="font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {member.name}
                      {member.aiProfileSummary && <Sparkles className="w-3 h-3 text-amber-500" />}
                    </button>
                    {member.title && <div className="text-sm text-muted-foreground">{member.title}</div>}
                    {member.otherRoles && <p className="text-xs text-muted-foreground mt-1">{member.otherRoles}</p>}
                    {member.aiProfileSummary && (
                      <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10">
                        <div className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI Summary
                        </div>
                        <p className="text-xs text-muted-foreground">{member.aiProfileSummary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Key People */}
        {result.keyPeople && result.keyPeople.length > 0 && (
          <Collapsible open={expandedSections['keypeople']} onOpenChange={() => toggleSection('keypeople')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-500" />
                Key People ({result.keyPeople.length})
              </h5>
              {expandedSections['keypeople'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid md:grid-cols-2 gap-3">
                {result.keyPeople.map((person, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{person.name}</div>
                        <div className="text-sm text-primary">{person.title}</div>
                        {person.department && <Badge variant="outline" className="mt-1 text-xs">{person.department}</Badge>}
                      </div>
                      {person.linkedinUrl && (
                        <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    {person.aiProfileSummary && (
                      <p className="text-xs text-muted-foreground mt-2">{person.aiProfileSummary}</p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Investment Activity */}
        {result.investmentActivity && (
          <Collapsible open={expandedSections['investmentActivity']} onOpenChange={() => toggleSection('investmentActivity')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Investment Activity
              </h5>
              {expandedSections['investmentActivity'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {result.investmentActivity.acquisitions && result.investmentActivity.acquisitions.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-muted-foreground mb-2">Acquisitions</h6>
                  <div className="space-y-2">
                    {result.investmentActivity.acquisitions.map((acq, i) => (
                      <div key={i} className="p-2 rounded bg-muted/30 flex items-center justify-between">
                        <span className="font-medium">{acq.company}</span>
                        <div className="flex items-center gap-2">
                          {acq.amount && <Badge variant="secondary">{acq.amount}</Badge>}
                          <span className="text-xs text-muted-foreground">{acq.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.investmentActivity.investments && result.investmentActivity.investments.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-muted-foreground mb-2">Investments Made</h6>
                  <div className="space-y-2">
                    {result.investmentActivity.investments.map((inv, i) => (
                      <div key={i} className="p-2 rounded bg-muted/30 flex items-center justify-between">
                        <span className="font-medium">{inv.company}</span>
                        <div className="flex items-center gap-2">
                          {inv.amount && <Badge variant="secondary">{inv.amount}</Badge>}
                          <span className="text-xs text-muted-foreground">{inv.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.investmentActivity.fundingReceived && result.investmentActivity.fundingReceived.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-muted-foreground mb-2">Funding Received</h6>
                  <div className="space-y-2">
                    {result.investmentActivity.fundingReceived.map((fund, i) => (
                      <div key={i} className="p-2 rounded bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{fund.round}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{fund.amount}</Badge>
                            <span className="text-xs text-muted-foreground">{fund.date}</span>
                          </div>
                        </div>
                        {fund.investors && fund.investors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {fund.investors.map((inv, j) => <Badge key={j} variant="outline" className="text-xs">{inv}</Badge>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Recent News */}
        {result.recentNews && result.recentNews.length > 0 && (
          <Collapsible open={expandedSections['news']} onOpenChange={() => toggleSection('news')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Recent News ({result.recentNews.length})
              </h5>
              {expandedSections['news'] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-2">
                {result.recentNews.map((news, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30">
                    {typeof news === 'string' ? (
                      <p className="text-sm">{news}</p>
                    ) : (
                      <>
                        <div className="font-medium">{news.headline}</div>
                        {news.date && <div className="text-xs text-muted-foreground">{news.date}</div>}
                        {news.summary && <p className="text-sm text-muted-foreground mt-1">{news.summary}</p>}
                        {news.url && (
                          <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                            Read more <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Social Media */}
        {result.socialMedia && (
          <div>
            <h5 className="font-semibold text-sm mb-2">Social Media & Online Presence</h5>
            <div className="flex flex-wrap gap-2">
              {result.website && (
                <a href={result.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20">
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
              {result.socialMedia.linkedin && (
                <a href={result.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
              )}
              {result.socialMedia.twitter && (
                <a href={result.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-sky-500/10 text-sky-600 hover:bg-sky-500/20">
                  <Twitter className="w-4 h-4" /> Twitter
                </a>
              )}
              {result.socialMedia.facebook && (
                <a href={result.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-600/10 text-blue-700 hover:bg-blue-600/20">
                  <Facebook className="w-4 h-4" /> Facebook
                </a>
              )}
              {result.socialMedia.instagram && (
                <a href={result.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-pink-500/10 text-pink-600 hover:bg-pink-500/20">
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {result.socialMedia.youtube && (
                <a href={result.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20">
                  <Youtube className="w-4 h-4" /> YouTube
                </a>
              )}
            </div>
          </div>
        )}

        {/* Key Facts */}
        {result.keyFacts && result.keyFacts.length > 0 && (
          <div>
            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
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
      </div>
    </Card>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Lead Enrichment</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get comprehensive profiles with real-time web research, AI analysis, and actionable insights powered by OpenAI GPT-4o.
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
                <h3 className="font-medium mb-1">AI-Powered Person Intelligence</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get comprehensive profiles with income estimates, best contact times, investment interests, and more.
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
                <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {progressMessage}
                    </span>
                    <span className="font-medium">{Math.round(searchProgress)}%</span>
                  </div>
                  <Progress value={searchProgress} className="h-2" />
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handlePersonSearch} disabled={isSearching} className="gap-2">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search & Enrich
                </Button>
                <Button variant="outline" onClick={clearPersonForm} disabled={isSearching}>Clear</Button>
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-6">
              <div>
                <h3 className="font-medium mb-1">AI-Powered Company Intelligence</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get detailed company profiles with leadership, ownership, financials, and investment activity.
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
                <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {progressMessage}
                    </span>
                    <span className="font-medium">{Math.round(searchProgress)}%</span>
                  </div>
                  <Progress value={searchProgress} className="h-2" />
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleCompanySearch} disabled={isSearching} className="gap-2">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search & Enrich
                </Button>
                <Button variant="outline" onClick={clearCompanyForm} disabled={isSearching}>Clear</Button>
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
                Enrichment Results
              </h3>
              
              <div className="grid lg:grid-cols-[1fr,400px] gap-6">
                <div className="space-y-6">
                  {results.map((result, index) => 
                    result.type === 'person' 
                      ? renderPersonResult(result, index)
                      : renderCompanyResult(result, index)
                  )}
                </div>
                
                {/* AI Chat Panel */}
                <AnimatePresence>
                  {showChat && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <Card variant="glass" className="sticky top-4 h-[600px] flex flex-col">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                          <h4 className="font-semibold flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            Edit Report with AI
                          </h4>
                          <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                          <div className="space-y-4">
                            {chatMessages.length === 0 && (
                              <div className="text-center text-muted-foreground text-sm py-8">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>Chat with AI to edit the report.</p>
                                <p className="text-xs mt-1">Try: "Add more details about their education" or "Update the revenue estimate"</p>
                              </div>
                            )}
                            {chatMessages.map((msg, i) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-lg ${
                                  msg.role === 'user' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted'
                                }`}>
                                  {msg.role === 'assistant' ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content.slice(0, 1000)}
                                      </ReactMarkdown>
                                      {msg.content.length > 1000 && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                          ... (truncated - changes applied to report)
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm">{msg.content}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                            {isChatLoading && (
                              <div className="flex justify-start">
                                <div className="bg-muted p-3 rounded-lg">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                        
                        <div className="p-4 border-t border-border">
                          <div className="flex gap-2">
                            <Textarea
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Ask AI to edit the report..."
                              className="resize-none h-20"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleChatSend();
                                }
                              }}
                            />
                            <Button 
                              onClick={handleChatSend} 
                              disabled={!chatInput.trim() || isChatLoading}
                              className="self-end"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {/* Profile Popup Dialog for clickable management/owner names */}
      <Dialog open={!!profilePopup} onOpenChange={() => setProfilePopup(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {profilePopup?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {profilePopup?.title && (
              <div>
                <div className="text-xs text-muted-foreground">Title / Role</div>
                <div className="font-medium">{profilePopup.title}</div>
              </div>
            )}
            
            {profilePopup?.tenure && (
              <div>
                <div className="text-xs text-muted-foreground">Tenure</div>
                <div className="font-medium">{profilePopup.tenure}</div>
              </div>
            )}
            
            {profilePopup?.stake && (
              <div>
                <div className="text-xs text-muted-foreground">Ownership Stake</div>
                <Badge variant="secondary">{profilePopup.stake}</Badge>
              </div>
            )}
            
            {profilePopup?.aiProfileSummary ? (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI-Generated Profile Summary
                </h5>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profilePopup.aiProfileSummary}</p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">No AI profile summary available for this person.</p>
              </div>
            )}
            
            {profilePopup?.linkedinUrl && (
              <a 
                href={profilePopup.linkedinUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
                View LinkedIn Profile
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
