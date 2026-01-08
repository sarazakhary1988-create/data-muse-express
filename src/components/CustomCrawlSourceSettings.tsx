import { useState, useEffect, useCallback } from 'react';
import { 
  Globe, 
  Plus, 
  X, 
  RotateCcw,
  ExternalLink,
  Info,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const CRAWL_SOURCES_KEY = 'orkestra_custom_crawl_sources';

interface CrawlSource {
  url: string;
  name: string;
  addedAt: string;
}

export function useCustomCrawlSources() {
  const [sources, setSources] = useState<CrawlSource[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CRAWL_SOURCES_KEY);
      if (stored) {
        setSources(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load custom crawl sources:', e);
    }
  }, []);

  const persistSources = useCallback((newSources: CrawlSource[]) => {
    try {
      localStorage.setItem(CRAWL_SOURCES_KEY, JSON.stringify(newSources));
    } catch (e) {
      console.error('Failed to persist custom crawl sources:', e);
    }
  }, []);

  const addSource = useCallback((url: string, name?: string) => {
    const normalized = url.trim().toLowerCase();
    if (!normalized) return false;
    
    // Validate URL
    try {
      new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`);
    } catch {
      return false;
    }

    setSources(prev => {
      if (prev.some(s => s.url === normalized)) return prev;
      const newSources = [
        ...prev,
        {
          url: normalized,
          name: name || new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`).hostname,
          addedAt: new Date().toISOString()
        }
      ];
      persistSources(newSources);
      return newSources;
    });
    return true;
  }, [persistSources]);

  const removeSource = useCallback((url: string) => {
    setSources(prev => {
      const newSources = prev.filter(s => s.url !== url);
      persistSources(newSources);
      return newSources;
    });
  }, [persistSources]);

  const resetSources = useCallback(() => {
    setSources([]);
    persistSources([]);
  }, [persistSources]);

  return { sources, addSource, removeSource, resetSources };
}

export function CustomCrawlSourceSettings() {
  const { sources, addSource, removeSource, resetSources } = useCustomCrawlSources();
  const [newUrl, setNewUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleAddSource = async () => {
    if (!newUrl.trim()) return;
    
    setIsValidating(true);
    
    // Simple validation
    try {
      const urlToTest = newUrl.startsWith('http') ? newUrl : `https://${newUrl}`;
      new URL(urlToTest);
      
      const success = addSource(newUrl);
      if (success) {
        toast({
          title: "Source Added",
          description: `${newUrl} will be crawled for news`,
        });
        setNewUrl('');
      } else {
        toast({
          title: "Already Added",
          description: "This source is already in your list",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const commonNewsSources = [
    { url: 'reuters.com', name: 'Reuters' },
    { url: 'bloomberg.com', name: 'Bloomberg' },
    { url: 'ft.com', name: 'Financial Times' },
    { url: 'wsj.com', name: 'WSJ' },
    { url: 'argaam.com', name: 'Argaam' },
    { url: 'zawya.com', name: 'Zawya' },
    { url: 'arabnews.com', name: 'Arab News' },
    { url: 'tradingview.com', name: 'TradingView' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
        <Globe className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Add custom URLs to crawl for news. These sources will be included in your news feed.
        </p>
      </div>

      {/* Add Source Input */}
      <div className="flex gap-2">
        <Input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Enter URL to crawl (e.g., example.com/news)"
          className="flex-1 h-9 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
        />
        <Button
          size="sm"
          onClick={handleAddSource}
          disabled={!newUrl.trim() || isValidating}
          className="h-9 px-3"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Quick Add Common Sources */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick add popular sources:</Label>
        <div className="flex flex-wrap gap-1.5">
          {commonNewsSources.map((source) => {
            const isAdded = sources.some(s => s.url.includes(source.url));
            return (
              <Button
                key={source.url}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isAdded) {
                    const found = sources.find(s => s.url.includes(source.url));
                    if (found) removeSource(found.url);
                  } else {
                    addSource(source.url, source.name);
                  }
                }}
                className={cn(
                  "h-6 px-2 text-xs",
                  isAdded && "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                {source.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Current Sources List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Custom crawl sources ({sources.length})
          </Label>
          {sources.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSources}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove all custom sources</TooltipContent>
            </Tooltip>
          )}
        </div>

        {sources.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No custom sources added yet
          </div>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-lg border border-border/50 bg-muted/30">
            {sources.map((source) => (
              <div
                key={source.url}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-background/50 border border-border/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{source.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{source.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => window.open(source.url.startsWith('http') ? source.url : `https://${source.url}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open in new tab</TooltipContent>
                  </Tooltip>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSource(source.url)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
