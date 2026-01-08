import React, { useState, useEffect } from 'react';
import { Plus, X, Globe, Link2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface CustomSourceInputProps {
  onSourcesChange: (sources: string[]) => void;
  initialSources?: string[];
  maxSources?: number;
}

interface SourceValidation {
  url: string;
  isValid: boolean;
  domain: string;
  error?: string;
}

// Official Saudi sources that are pre-configured
const OFFICIAL_SOURCES = [
  { 
    name: 'CMA News', 
    url: 'https://cma.org.sa/en/Market/News',
    category: 'Regulatory',
    enabled: true,
  },
  { 
    name: 'CMA Violations', 
    url: 'https://cma.org.sa/en/Awareness/Pages/Violations.aspx',
    category: 'Enforcement',
    enabled: true,
  },
  { 
    name: 'Tadawul Announcements', 
    url: 'https://www.saudiexchange.sa/wps/portal/tadawul/newsroom/news-and-announcements',
    category: 'Market',
    enabled: true,
  },
  { 
    name: 'Tadawul IPO/Sukuk', 
    url: 'https://www.saudiexchange.sa/wps/portal/tadawul/market-participants/issuers/ipo-sukuk',
    category: 'Listings',
    enabled: true,
  },
  { 
    name: 'SAMA News', 
    url: 'https://www.sama.gov.sa/en-us/News/Pages/default.aspx',
    category: 'Banking',
    enabled: true,
  },
  { 
    name: 'SAMA Circulars', 
    url: 'https://www.sama.gov.sa/en-us/Circulars/Pages/default.aspx',
    category: 'Banking',
    enabled: true,
  },
  { 
    name: 'Ministry of Finance', 
    url: 'https://mof.gov.sa/en/News/Pages/default.aspx',
    category: 'Government',
    enabled: true,
  },
];

const STORAGE_KEY = 'manus_custom_sources';

export function CustomSourceInput({ 
  onSourcesChange, 
  initialSources = [], 
  maxSources = 10 
}: CustomSourceInputProps) {
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [validations, setValidations] = useState<Record<string, SourceValidation>>({});
  const [enabledOfficialSources, setEnabledOfficialSources] = useState<string[]>(
    OFFICIAL_SOURCES.map(s => s.url)
  );

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomUrls(parsed.customUrls || []);
        setEnabledOfficialSources(parsed.enabledOfficialSources || OFFICIAL_SOURCES.map(s => s.url));
      } catch (e) {
        console.error('Failed to load saved sources:', e);
      }
    }
  }, []);

  // Save to localStorage and notify parent on changes
  useEffect(() => {
    const allSources = [...enabledOfficialSources, ...customUrls];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      customUrls, 
      enabledOfficialSources 
    }));
    onSourcesChange(allSources);
  }, [customUrls, enabledOfficialSources, onSourcesChange]);

  const validateUrl = (url: string): SourceValidation => {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { url, isValid: false, domain: '', error: 'Must be HTTP or HTTPS' };
      }
      return { 
        url, 
        isValid: true, 
        domain: urlObj.hostname.replace('www.', '') 
      };
    } catch {
      return { url, isValid: false, domain: '', error: 'Invalid URL format' };
    }
  };

  const addCustomUrl = () => {
    if (!newUrl.trim()) return;
    
    const validation = validateUrl(newUrl.trim());
    setValidations(prev => ({ ...prev, [newUrl]: validation }));
    
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid URL');
      return;
    }
    
    if (customUrls.includes(newUrl.trim())) {
      toast.error('URL already added');
      return;
    }
    
    if (customUrls.length >= maxSources) {
      toast.error(`Maximum ${maxSources} custom sources allowed`);
      return;
    }
    
    setCustomUrls(prev => [...prev, newUrl.trim()]);
    setNewUrl('');
    toast.success(`Added ${validation.domain} as custom source`);
  };

  const removeCustomUrl = (url: string) => {
    setCustomUrls(prev => prev.filter(u => u !== url));
    setValidations(prev => {
      const newValidations = { ...prev };
      delete newValidations[url];
      return newValidations;
    });
    toast.info('Source removed');
  };

  const toggleOfficialSource = (url: string) => {
    setEnabledOfficialSources(prev => 
      prev.includes(url) 
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Research Sources
        </CardTitle>
        <CardDescription>
          Configure official and custom sources for real-time web crawling
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Official Sources */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Official Sources (Auto-crawled)
          </h4>
          <ScrollArea className="h-[180px] pr-4">
            <div className="space-y-2">
              {OFFICIAL_SOURCES.map((source) => (
                <div 
                  key={source.url}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                    enabledOfficialSources.includes(source.url)
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/30 border-border/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={enabledOfficialSources.includes(source.url)}
                      onChange={() => toggleOfficialSource(source.url)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{source.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {source.category}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">
                        {getDomainFromUrl(source.url)}
                      </span>
                    </div>
                  </div>
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Custom Sources */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-500" />
            Custom Sources ({customUrls.length}/{maxSources})
          </h4>
          
          {/* Add new URL */}
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/news"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomUrl()}
              className="flex-1 bg-background/50"
            />
            <Button 
              onClick={addCustomUrl}
              size="sm"
              disabled={!newUrl.trim() || customUrls.length >= maxSources}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Custom URLs list */}
          {customUrls.length > 0 && (
            <div className="space-y-1.5">
              {customUrls.map((url) => {
                const validation = validations[url] || validateUrl(url);
                return (
                  <div 
                    key={url}
                    className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/20"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {validation.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                      )}
                      <span className="text-sm truncate">{validation.domain || url}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCustomUrl(url)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {customUrls.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Add custom URLs to crawl additional news sources
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total active sources</span>
            <Badge variant="secondary">
              {enabledOfficialSources.length + customUrls.length} sources
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
