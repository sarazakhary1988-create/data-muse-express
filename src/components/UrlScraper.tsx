import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Loader2, Download, Copy, ExternalLink, FileText, List, 
  Camera, Palette, Sparkles, Search, Zap, Settings2, ChevronDown,
  Database, Code, Link2
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
import { toast } from '@/hooks/use-toast';
import { useResearchEngine } from '@/hooks/useResearchEngine';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface UrlScraperProps {
  onBack?: () => void;
}

type ScrapeFormat = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'branding' | 'summary';

interface ScrapeOptions {
  formats: ScrapeFormat[];
  onlyMainContent: boolean;
  waitFor: number;
  useFallback: boolean;
}

export const UrlScraper = ({ onBack }: UrlScraperProps) => {
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [activeMode, setActiveMode] = useState<'scrape' | 'search' | 'map'>('scrape');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scrapeEngine, setScrapeEngine] = useState<'embedded' | 'firecrawl'>('embedded');
  
  const [options, setOptions] = useState<ScrapeOptions>({
    formats: ['markdown'],
    onlyMainContent: true,
    waitFor: 0,
    useFallback: true,
  });
  
  const { deepScrape, mapWebsite } = useResearchEngine();

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

  const handleScrape = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    setResult(null);

    try {
      if (scrapeEngine === 'firecrawl') {
        // Use Firecrawl API
        const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
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
        // Use embedded scraper
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
        const { data, error } = await supabase.functions.invoke('firecrawl-map', {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
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
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Advanced Web Scraper</h2>
              <p className="text-sm text-muted-foreground">Extract, search, and analyze web content</p>
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

        {/* Mode Tabs */}
        <Tabs value={activeMode} onValueChange={(v: any) => setActiveMode(v)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
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

          <TabsContent value="scrape" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to scrape (e.g., https://example.com)"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              />
              <Button onClick={handleScrape} disabled={!url.trim() || isLoading} variant="hero">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-2" />Scrape</>}
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
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL to map..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleMap()}
              />
              <Button onClick={handleMap} disabled={!url.trim() || isLoading} variant="hero">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><List className="w-4 h-4 mr-2" />Map Site</>}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Metadata */}
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
                      <img src={`data:image/png;base64,${screenshot}`} alt="Page screenshot" className="max-w-full rounded-lg" />
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No screenshot available</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="mt-0">
                  <div className="rounded-lg border border-border bg-background p-4">
                    {branding ? (
                      <div className="space-y-4">
                        {branding.colors && (
                          <div>
                            <h4 className="font-medium mb-2">Colors</h4>
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(branding.colors).map(([name, color]) => (
                                <div key={name} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                                  <div className="w-6 h-6 rounded" style={{ backgroundColor: color as string }} />
                                  <span className="text-xs">{name}: {color as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {branding.fonts && (
                          <div>
                            <h4 className="font-medium mb-2">Fonts</h4>
                            <div className="flex gap-2 flex-wrap">
                              {branding.fonts.map((font: any, i: number) => (
                                <Badge key={i} variant="secondary">{font.family}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {branding.logo && (
                          <div>
                            <h4 className="font-medium mb-2">Logo</h4>
                            <img src={branding.logo} alt="Logo" className="max-h-16" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No branding data available</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="links" className="mt-0">
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background p-4">
                    {links.length > 0 ? (
                      <ul className="space-y-2">
                        {links.map((link: string, index: number) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground w-6">{index + 1}.</span>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex-1 truncate">{link}</a>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => window.open(link, '_blank')}>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No links found. Use "Map Site" to discover all URLs.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="search" className="mt-0">
                  <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background p-4">
                    {searchResults.length > 0 ? (
                      <div className="space-y-4">
                        {searchResults.map((item: any, index: number) => (
                          <div key={index} className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                              {item.title || item.url}
                            </a>
                            <p className="text-xs text-muted-foreground mt-1">{item.url}</p>
                            {item.snippet && <p className="text-sm mt-2">{item.snippet}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No search results</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};
