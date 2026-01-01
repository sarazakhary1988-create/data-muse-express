import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Loader2, Download, Copy, ExternalLink, FileText, List, 
  Camera, Palette, Sparkles, Search, Zap, Settings2, ChevronDown,
  Database, Code, Link2, MessageSquare, Send, Calendar, Clock,
  CalendarPlus, Bot, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useResearchEngine } from '@/hooks/useResearchEngine';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface UrlScraperProps {
  onBack?: () => void;
}

type ScrapeFormat = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'branding' | 'summary';
type TimeFrame = 'now' | '1hour' | '6hours' | '12hours' | '24hours' | 'custom';

interface ScrapeOptions {
  formats: ScrapeFormat[];
  onlyMainContent: boolean;
  waitFor: number;
  useFallback: boolean;
}

interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const timeFrameOptions = [
  { value: 'now', label: 'Run Now', icon: Zap },
  { value: '1hour', label: 'In 1 Hour', icon: Clock },
  { value: '6hours', label: 'In 6 Hours', icon: Clock },
  { value: '12hours', label: 'In 12 Hours', icon: Clock },
  { value: '24hours', label: 'In 24 Hours', icon: Clock },
  { value: 'custom', label: 'Custom Schedule', icon: Calendar },
];

const aiCommandExamples = [
  "Scrape and extract all product prices from this e-commerce page",
  "Get the main article text, format as bullet points",
  "Extract all email addresses and phone numbers",
  "Summarize this page and list key statistics",
  "Get all images with their alt text",
  "Extract the navigation menu structure",
];

export const UrlScraper = ({ onBack }: UrlScraperProps) => {
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [activeMode, setActiveMode] = useState<'scrape' | 'search' | 'map' | 'ai'>('ai');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scrapeEngine, setScrapeEngine] = useState<'embedded' | 'firecrawl'>('embedded');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('now');
  const [customScheduleDate, setCustomScheduleDate] = useState('');
  const [showLinkTaskDialog, setShowLinkTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  
  // AI Chat state
  const [aiChatMessages, setAiChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your AI scraping assistant. Tell me what you want to extract from a website, and I'll help you configure the scraping settings and format the output.\n\n**Examples:**\n- \"Scrape this URL and extract all prices\"\n- \"Get the main content as bullet points\"\n- \"Find all contact information on this page\"",
      timestamp: new Date(),
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [options, setOptions] = useState<ScrapeOptions>({
    formats: ['markdown'],
    onlyMainContent: true,
    waitFor: 0,
    useFallback: true,
  });
  
  const { deepScrape, mapWebsite, startResearch } = useResearchEngine();

  const formatOptions: { id: ScrapeFormat; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'markdown', label: 'Markdown', icon: FileText, description: 'Clean LLM-ready text' },
    { id: 'html', label: 'HTML', icon: Code, description: 'Processed HTML' },
    { id: 'links', label: 'Links', icon: Link2, description: 'All URLs on page' },
    { id: 'screenshot', label: 'Screenshot', icon: Camera, description: 'Page image capture' },
    { id: 'branding', label: 'Branding', icon: Palette, description: 'Colors, fonts, logos' },
    { id: 'summary', label: 'AI Summary', icon: Sparkles, description: 'AI-generated summary' },
  ];

  const toggleFormat = (format: ScrapeFormat) => {
    setOptions(prev => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter(f => f !== format)
        : [...prev.formats, format]
    }));
  };

  const handleAiChat = async () => {
    if (!aiInput.trim()) return;

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput,
      timestamp: new Date(),
    };

    setAiChatMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setIsAiProcessing(true);

    try {
      // Parse the user's command to extract URL and instructions
      const urlMatch = aiInput.match(/https?:\/\/[^\s]+/);
      const extractedUrl = urlMatch ? urlMatch[0] : url;
      
      if (extractedUrl) {
        setUrl(extractedUrl);
      }

      // Determine what formats to use based on the command
      const command = aiInput.toLowerCase();
      const newFormats: ScrapeFormat[] = ['markdown'];
      
      if (command.includes('screenshot') || command.includes('image')) {
        newFormats.push('screenshot');
      }
      if (command.includes('link') || command.includes('url')) {
        newFormats.push('links');
      }
      if (command.includes('summar') || command.includes('key point')) {
        newFormats.push('summary');
      }
      if (command.includes('brand') || command.includes('color') || command.includes('logo')) {
        newFormats.push('branding');
      }

      setOptions(prev => ({ ...prev, formats: [...new Set(newFormats)] }));

      // If we have a URL, perform the scrape
      if (extractedUrl) {
        const scrapeResult = await deepScrape(extractedUrl);
        
        if (scrapeResult) {
          setResult(scrapeResult);
          
          // Generate AI response based on the command
          let responseContent = `I've scraped **${extractedUrl}** for you.\n\n`;
          
          if (command.includes('price') || command.includes('cost')) {
            responseContent += "**Extracted Prices:** I've looked for pricing information. Check the Content tab for extracted text containing prices.\n\n";
          }
          if (command.includes('email') || command.includes('contact')) {
            responseContent += "**Contact Information:** Scanned for emails and phone numbers. Review the extracted content.\n\n";
          }
          if (command.includes('bullet') || command.includes('point') || command.includes('list')) {
            responseContent += "**Formatted Content:** The content has been extracted. You can copy it from the Markdown tab.\n\n";
          }
          
          responseContent += `**Results:**\n- Content extracted successfully\n- Format: ${options.formats.join(', ')}\n\nYou can view the results in the tabs below.`;

          const assistantMessage: AIChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
          };
          setAiChatMessages(prev => [...prev, assistantMessage]);
        }
      } else {
        const assistantMessage: AIChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I need a URL to scrape. Please provide a URL in your message (e.g., 'Scrape https://example.com and get all prices') or enter it in the URL field above.",
          timestamp: new Date(),
        };
        setAiChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      const errorMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again or check if the URL is accessible.`,
        timestamp: new Date(),
      };
      setAiChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiProcessing(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleScrape = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    setResult(null);

    try {
      if (selectedTimeFrame !== 'now') {
        // Schedule for later - show dialog to create task
        setShowLinkTaskDialog(true);
        setIsLoading(false);
        return;
      }

      if (scrapeEngine === 'firecrawl') {
        const { data, error } = await supabase.functions.invoke('research-scrape', {
          body: { 
            url, 
            options: {
              formats: options.formats,
              onlyMainContent: options.onlyMainContent,
              waitFor: options.waitFor || undefined,
            }
          },
        });

        if (error) throw error;
        setResult(data);
        toast({ title: "Scraped with Firecrawl", description: "Content extracted successfully" });
      } else {
        const scrapeResult = await deepScrape(url);
        if (scrapeResult) {
          setResult(scrapeResult);
          toast({ title: "Scraped with Embedded Engine", description: "Content extracted successfully" });
        }
      }
    } catch (error: any) {
      console.error('Scrape error:', error);
      toast({ 
        title: "Scrape Failed", 
        description: error.message || "Failed to scrape URL",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('web-search', {
        body: { 
          query: searchQuery,
          maxResults: 10,
          searchEngine: 'all',
          scrapeContent: true,
        },
      });

      if (error) throw error;
      setResult({ searchResults: data?.results || [] });
      setActiveTab('search');
      toast({ title: "Search Complete", description: `Found ${data?.results?.length || 0} results` });
    } catch (error: any) {
      console.error('Search error:', error);
      toast({ 
        title: "Search Failed", 
        description: error.message || "Failed to search",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMap = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);

    try {
      if (scrapeEngine === 'firecrawl') {
        const { data, error } = await supabase.functions.invoke('research-map', {
          body: { url, options: { limit: 100 } },
        });

        if (error) throw error;
        setResult({ links: data?.links || [] });
      } else {
        const mapResult = await mapWebsite(url);
        if (mapResult && mapResult.links) {
          setResult({ links: mapResult.links });
        }
      }
      setActiveTab('links');
      toast({ title: "Map Complete", description: "Site URLs discovered" });
    } catch (error: any) {
      console.error('Map error:', error);
      toast({ 
        title: "Map Failed", 
        description: error.message || "Failed to map website",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkToTask = async () => {
    if (!taskTitle.trim()) {
      toast({ title: "Title Required", description: "Please enter a task title", variant: "destructive" });
      return;
    }

    try {
      // Calculate scheduled time based on timeframe
      let scheduledTime = new Date();
      switch (selectedTimeFrame) {
        case '1hour': scheduledTime.setHours(scheduledTime.getHours() + 1); break;
        case '6hours': scheduledTime.setHours(scheduledTime.getHours() + 6); break;
        case '12hours': scheduledTime.setHours(scheduledTime.getHours() + 12); break;
        case '24hours': scheduledTime.setHours(scheduledTime.getHours() + 24); break;
        case 'custom': scheduledTime = new Date(customScheduleDate); break;
      }

      const { error } = await supabase.from('scheduled_research_tasks').insert({
        title: taskTitle,
        description: taskDescription || `Scrape URL: ${url}`,
        schedule_type: 'once',
        next_run_at: scheduledTime.toISOString(),
        execution_mode: 'scrape',
        custom_websites: [url],
        is_active: true,
        delivery_method: 'in_app',
        report_format: 'markdown',
        research_depth: 'standard',
      });

      if (error) throw error;

      toast({ title: "Task Created!", description: `Scraping scheduled for ${scheduledTime.toLocaleString()}` });
      setShowLinkTaskDialog(false);
      setTaskTitle('');
      setTaskDescription('');
    } catch (error: any) {
      console.error('Create task error:', error);
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard" });
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const markdown = result?.data?.markdown || result?.markdown || '';
  const links = result?.links || result?.data?.links || [];
  const metadata = result?.data?.metadata || result?.metadata || {};
  const screenshot = result?.data?.screenshot || result?.screenshot || '';
  const branding = result?.data?.branding || result?.branding || null;
  const summary = result?.data?.summary || result?.summary || '';
  const searchResults = result?.searchResults || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mx-auto px-4 py-8"
    >
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI Web Scraper</h2>
              <p className="text-sm text-muted-foreground">Command AI to extract and format web content</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={scrapeEngine} onValueChange={(v: 'embedded' | 'firecrawl') => setScrapeEngine(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="embedded">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Embedded Engine
                  </div>
                </SelectItem>
                <SelectItem value="firecrawl">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Firecrawl API
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* URL Input with timeframe */}
        <div className="flex gap-2 mb-4">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to scrape (e.g., https://example.com)"
            className="flex-1"
          />
          <Select value={selectedTimeFrame} onValueChange={(v: TimeFrame) => setSelectedTimeFrame(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeFrameOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="w-3 h-3" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowLinkTaskDialog(true)}
            title="Link to Scheduled Task"
          >
            <CalendarPlus className="w-4 h-4" />
          </Button>
        </div>

        {/* Mode Tabs */}
        <Tabs value={activeMode} onValueChange={(v: any) => setActiveMode(v)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="w-4 h-4" />
              AI Command
            </TabsTrigger>
            <TabsTrigger value="scrape" className="gap-2">
              <FileText className="w-4 h-4" />
              Scrape URL
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              Web Search
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <List className="w-4 h-4" />
              Map Site
            </TabsTrigger>
          </TabsList>

          {/* AI Command Chat */}
          <TabsContent value="ai" className="mt-4 space-y-4">
            <Card className="bg-muted/30 border-0">
              {/* Chat messages */}
              <div className="h-[300px] overflow-y-auto p-4 space-y-4">
                {aiChatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border'
                      }`}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                      <span className="text-[10px] opacity-50 mt-1 block">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {isAiProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-background border border-border rounded-lg p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick commands */}
              <div className="px-4 py-2 border-t border-border">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {aiCommandExamples.slice(0, 3).map((example, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs whitespace-nowrap shrink-0"
                      onClick={() => setAiInput(example)}
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      {example.slice(0, 30)}...
                    </Button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Tell me what to scrape and how to format it..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiChat();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAiChat}
                    disabled={!aiInput.trim() || isAiProcessing}
                    className="h-auto"
                  >
                    {isAiProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="scrape" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleScrape} disabled={!url.trim() || isLoading} variant="hero" className="flex-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-2" />Scrape Now</>}
              </Button>
            </div>

            {/* Advanced Options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formatOptions.map((format) => (
                    <label
                      key={format.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        options.formats.includes(format.id) 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={options.formats.includes(format.id)}
                        onCheckedChange={() => toggleFormat(format.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <format.icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{format.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={options.onlyMainContent}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, onlyMainContent: checked }))}
                    />
                    <Label>Main content only</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Wait time (ms):</Label>
                    <Input
                      type="number"
                      value={options.waitFor}
                      onChange={(e) => setOptions(prev => ({ ...prev, waitFor: parseInt(e.target.value) || 0 }))}
                      className="w-24"
                      min={0}
                      max={10000}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter search query..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={!searchQuery.trim() || isLoading} variant="hero">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Search</>}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="map" className="mt-4">
            <div className="flex gap-2">
              <Button onClick={handleMap} disabled={!url.trim() || isLoading} variant="hero" className="flex-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><List className="w-4 h-4 mr-2" />Map Site</>}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {metadata.title && (
                <div className="mb-4 p-4 rounded-lg bg-secondary/50">
                  <h3 className="font-semibold text-lg mb-1">{metadata.title}</h3>
                  {metadata.description && (
                    <p className="text-sm text-muted-foreground">{metadata.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{metadata.sourceURL}</span>
                    {metadata.statusCode && <Badge variant="outline">Status: {metadata.statusCode}</Badge>}
                  </div>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="markdown">Raw</TabsTrigger>
                    {summary && <TabsTrigger value="summary">Summary</TabsTrigger>}
                    {screenshot && <TabsTrigger value="screenshot">Screenshot</TabsTrigger>}
                    {branding && <TabsTrigger value="branding">Branding</TabsTrigger>}
                    <TabsTrigger value="links">Links {links.length > 0 && `(${links.length})`}</TabsTrigger>
                    {searchResults.length > 0 && <TabsTrigger value="search">Search ({searchResults.length})</TabsTrigger>}
                  </TabsList>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(markdown)}>
                      <Copy className="w-3 h-3 mr-1" />Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadContent(markdown, 'scraped-content.md')}>
                      <Download className="w-3 h-3 mr-1" />Download
                    </Button>
                  </div>
                </div>

                <TabsContent value="content" className="mt-0">
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown || 'No content extracted'}</ReactMarkdown>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="markdown" className="mt-0">
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background">
                    <pre className="p-4 text-xs whitespace-pre-wrap font-mono">{markdown || 'No content extracted'}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="mt-0">
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="screenshot" className="mt-0">
                  <div className="rounded-lg border border-border bg-background p-4">
                    {screenshot ? (
                      <img src={screenshot} alt="Page screenshot" className="max-w-full rounded" />
                    ) : (
                      <p className="text-muted-foreground">No screenshot available</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="mt-0">
                  <div className="rounded-lg border border-border bg-background p-4">
                    {branding ? (
                      <pre className="text-xs">{JSON.stringify(branding, null, 2)}</pre>
                    ) : (
                      <p className="text-muted-foreground">No branding data available</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="links" className="mt-0">
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background p-4">
                    {links.length > 0 ? (
                      <ul className="space-y-1">
                        {links.map((link: string, i: number) => (
                          <li key={i}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {link}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No links extracted</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="search" className="mt-0">
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background p-4 space-y-4">
                    {searchResults.map((result: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {result.title}
                        </a>
                        <p className="text-sm text-muted-foreground mt-1">{result.snippet}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Link to Task Dialog */}
      <Dialog open={showLinkTaskDialog} onOpenChange={setShowLinkTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-primary" />
              Schedule Scraping Task
            </DialogTitle>
            <DialogDescription>
              Create a scheduled task to scrape this URL at the specified time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g., Daily price monitoring"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="What should this scraping task accomplish?"
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>URL to Scrape</Label>
              <Input value={url} disabled className="bg-muted" />
            </div>
            {selectedTimeFrame === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Date/Time</Label>
                <Input
                  type="datetime-local"
                  value={customScheduleDate}
                  onChange={(e) => setCustomScheduleDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkToTask} className="gap-2">
              <CalendarPlus className="w-4 h-4" />
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
