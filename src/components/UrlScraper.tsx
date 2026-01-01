import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Loader2, Download, Copy, ExternalLink, FileText, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useResearchEngine } from '@/hooks/useResearchEngine';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface UrlScraperProps {
  onBack?: () => void;
}

export const UrlScraper = ({ onBack }: UrlScraperProps) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('content');
  
  const { deepScrape, mapWebsite } = useResearchEngine();

  const handleScrape = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    setResult(null);

    try {
      const scrapeResult = await deepScrape(url);
      if (scrapeResult) {
        setResult(scrapeResult);
      }
    } catch (error) {
      console.error('Scrape error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMap = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);

    try {
      const mapResult = await mapWebsite(url);
      if (mapResult && mapResult.links) {
        setResult({ ...result, links: mapResult.links });
        setActiveTab('links');
      }
    } catch (error) {
      console.error('Map error:', error);
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markdown = result?.data?.markdown || '';
  const links = result?.links || result?.data?.links || [];
  const metadata = result?.data?.metadata || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card variant="glass" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">URL Scraper</h2>
            <p className="text-sm text-muted-foreground">Extract content from any website</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to scrape (e.g., https://example.com)"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          />
          <Button
            onClick={handleScrape}
            disabled={!url.trim() || isLoading}
            variant="hero"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Scrape
              </>
            )}
          </Button>
          <Button
            onClick={handleMap}
            disabled={!url.trim() || isLoading}
            variant="outline"
          >
            <List className="w-4 h-4 mr-2" />
            Map
          </Button>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Metadata */}
            {metadata.title && (
              <div className="mb-4 p-4 rounded-lg bg-secondary/50">
                <h3 className="font-semibold text-lg mb-1">{metadata.title}</h3>
                {metadata.description && (
                  <p className="text-sm text-muted-foreground">{metadata.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{metadata.sourceURL}</span>
                  {metadata.statusCode && <span>Status: {metadata.statusCode}</span>}
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  <TabsTrigger value="links">
                    Links {links.length > 0 && `(${links.length})`}
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(markdown)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadContent(markdown, 'scraped-content.md')}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              <TabsContent value="content" className="mt-0">
                <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdown || 'No content extracted'}
                    </ReactMarkdown>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="markdown" className="mt-0">
                <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background">
                  <pre className="p-4 text-xs whitespace-pre-wrap font-mono">
                    {markdown || 'No content extracted'}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="links" className="mt-0">
                <div className="max-h-[500px] overflow-y-auto rounded-lg border border-border bg-background p-4">
                  {links.length > 0 ? (
                    <ul className="space-y-2">
                      {links.map((link: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground w-6">{index + 1}.</span>
                          <a 
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex-1 truncate"
                          >
                            {link}
                          </a>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => window.open(link, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No links found. Click "Map" to discover all URLs on the website.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};
