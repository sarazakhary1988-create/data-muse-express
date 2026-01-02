import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, ChevronDown, ChevronUp, ExternalLink, CheckCircle, XCircle, Clock, Star, Filter, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useResearchStore } from '@/store/researchStore';
import { cn } from '@/lib/utils';

// Engine colors and icons
const ENGINE_CONFIG: Record<string, { color: string; bgColor: string; label: string; textColor: string }> = {
  duckduckgo: { color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/30', label: 'DuckDuckGo', textColor: 'text-orange-400' },
  google: { color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30', label: 'Google', textColor: 'text-blue-400' },
  bing: { color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 border-cyan-500/30', label: 'Bing', textColor: 'text-cyan-400' },
  internal: { color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30', label: 'Sitemap', textColor: 'text-purple-400' },
  unknown: { color: 'text-muted-foreground', bgColor: 'bg-muted/50 border-border', label: 'Other', textColor: 'text-muted-foreground' },
};

type StatusFilter = 'all' | 'scraped' | 'pending' | 'failed';
type SortOption = 'relevance' | 'domain' | 'status';

const getRelevanceColor = (score: number) => {
  if (score >= 0.8) return 'text-emerald-500 bg-emerald-500/10';
  if (score >= 0.6) return 'text-amber-500 bg-amber-500/10';
  if (score >= 0.4) return 'text-orange-500 bg-orange-500/10';
  return 'text-red-500 bg-red-500/10';
};

const getStatusIcon = (status: 'pending' | 'scraped' | 'failed') => {
  switch (status) {
    case 'scraped':
      return <CheckCircle className="w-3 h-3 text-emerald-500" />;
    case 'failed':
      return <XCircle className="w-3 h-3 text-red-500" />;
    default:
      return <Clock className="w-3 h-3 text-amber-500 animate-pulse" />;
  }
};

const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

export const SearchEngineIndicator = () => {
  const { agentState, isSearching } = useResearchStore();
  const { searchEngines } = agentState;
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  if (!searchEngines && !isSearching) return null;

  const engines = searchEngines?.engines || [];
  const resultCounts = searchEngines?.resultCounts || {};
  const timing = searchEngines?.timing;
  const searchMethod = searchEngines?.searchMethod || 'embedded_web_search';
  const urlDetails = searchEngines?.urlDetails || [];

  // Calculate total results
  const totalResults = Object.values(resultCounts).reduce((sum, count) => sum + count, 0);

  // Filter and sort URLs
  const filteredAndSortedUrls = useMemo(() => {
    let filtered = [...urlDetails];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'domain':
          return extractDomain(a.url).localeCompare(extractDomain(b.url));
        case 'status':
          const statusOrder = { scraped: 0, pending: 1, failed: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [urlDetails, statusFilter, sortBy]);

  // Group filtered URLs by engine
  const urlsByEngine = useMemo(() => {
    return filteredAndSortedUrls.reduce((acc, url) => {
      const engine = url.engine.toLowerCase();
      if (!acc[engine]) acc[engine] = [];
      acc[engine].push(url);
      return acc;
    }, {} as Record<string, typeof urlDetails>);
  }, [filteredAndSortedUrls]);

  const filterLabel = statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
  const sortLabel = sortBy === 'relevance' ? 'Relevance' : sortBy === 'domain' ? 'Domain' : 'Status';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full"
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Engines:</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {searchMethod === 'embedded_web_search' 
                    ? 'Using embedded web scraping (zero external APIs)' 
                    : searchMethod === 'hybrid_embedded'
                    ? 'Using hybrid search (web + sitemap)'
                    : 'Using internal sitemap discovery'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isSearching && !searchEngines && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1"
            >
              {['duckduckgo', 'google', 'bing'].map((engine) => (
                <Badge 
                  key={engine} 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0 ${ENGINE_CONFIG[engine]?.bgColor || ENGINE_CONFIG.unknown.bgColor} opacity-50`}
                >
                  <Globe className="w-2.5 h-2.5 mr-0.5" />
                  {ENGINE_CONFIG[engine]?.label || engine}
                </Badge>
              ))}
            </motion.div>
          )}

          {searchEngines && engines.length > 0 && (
            <div className="flex items-center gap-1">
              {engines.map((engine) => {
                const config = ENGINE_CONFIG[engine.toLowerCase()] || ENGINE_CONFIG.unknown;
                const count = resultCounts[engine] || resultCounts[engine.toLowerCase()] || 0;
                
                return (
                  <TooltipProvider key={engine}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 ${config.bgColor} ${count > 0 ? 'opacity-100' : 'opacity-40'}`}
                          >
                            <Globe className={`w-2.5 h-2.5 mr-0.5 ${config.color}`} />
                            {config.label}
                            {count > 0 && (
                              <span className={`ml-1 ${config.color} font-medium`}>
                                {count}
                              </span>
                            )}
                          </Badge>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {count > 0 
                            ? `${count} results from ${config.label}` 
                            : `No results from ${config.label}`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          )}

          {/* Summary stats */}
          {searchEngines && totalResults > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-2 border-l border-border pl-2">
              <span>{totalResults} total results</span>
              {timing && <span>• {(timing / 1000).toFixed(1)}s</span>}
            </div>
          )}

          {/* Expand/Collapse button */}
          {urlDetails.length > 0 && (
            <CollapsibleTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded-md hover:bg-muted/50"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Hide URLs
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show {urlDetails.length} URLs
                  </>
                )}
              </motion.button>
            </CollapsibleTrigger>
          )}
        </div>

        {/* Detailed URL breakdown */}
        <CollapsibleContent>
          <AnimatePresence>
            {isExpanded && urlDetails.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 border border-border rounded-lg overflow-hidden bg-card/50"
              >
                {/* Filter and Sort Controls */}
                <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
                  {/* Status Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5">
                        <Filter className="w-3 h-3" />
                        {filterLabel}
                        <ChevronDown className="w-2.5 h-2.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-36">
                      <DropdownMenuLabel className="text-[10px]">Filter by Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setStatusFilter('all')}
                        className={cn("text-xs", statusFilter === 'all' && "bg-accent")}
                      >
                        All URLs
                        <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1">
                          {urlDetails.length}
                        </Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setStatusFilter('scraped')}
                        className={cn("text-xs", statusFilter === 'scraped' && "bg-accent")}
                      >
                        <CheckCircle className="w-3 h-3 mr-1.5 text-emerald-500" />
                        Scraped
                        <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1 bg-emerald-500/10 text-emerald-500">
                          {urlDetails.filter(u => u.status === 'scraped').length}
                        </Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setStatusFilter('pending')}
                        className={cn("text-xs", statusFilter === 'pending' && "bg-accent")}
                      >
                        <Clock className="w-3 h-3 mr-1.5 text-amber-500" />
                        Pending
                        <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1 bg-amber-500/10 text-amber-500">
                          {urlDetails.filter(u => u.status === 'pending').length}
                        </Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setStatusFilter('failed')}
                        className={cn("text-xs", statusFilter === 'failed' && "bg-accent")}
                      >
                        <XCircle className="w-3 h-3 mr-1.5 text-red-500" />
                        Failed
                        <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1 bg-red-500/10 text-red-500">
                          {urlDetails.filter(u => u.status === 'failed').length}
                        </Badge>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sort Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5">
                        <ArrowUpDown className="w-3 h-3" />
                        Sort: {sortLabel}
                        <ChevronDown className="w-2.5 h-2.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-36">
                      <DropdownMenuLabel className="text-[10px]">Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setSortBy('relevance')}
                        className={cn("text-xs", sortBy === 'relevance' && "bg-accent")}
                      >
                        <Star className="w-3 h-3 mr-1.5" />
                        Relevance
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy('domain')}
                        className={cn("text-xs", sortBy === 'domain' && "bg-accent")}
                      >
                        <Globe className="w-3 h-3 mr-1.5" />
                        Domain
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSortBy('status')}
                        className={cn("text-xs", sortBy === 'status' && "bg-accent")}
                      >
                        <CheckCircle className="w-3 h-3 mr-1.5" />
                        Status
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Active filters indicator */}
                  {(statusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => setStatusFilter('all')}
                    >
                      Clear filter
                      <XCircle className="w-3 h-3 ml-1" />
                    </Button>
                  )}

                  <div className="ml-auto text-[10px] text-muted-foreground">
                    Showing {filteredAndSortedUrls.length} of {urlDetails.length}
                  </div>
                </div>

                <ScrollArea className="max-h-[300px]">
                  <div className="p-2 space-y-3">
                    {engines.map((engine) => {
                      const config = ENGINE_CONFIG[engine.toLowerCase()] || ENGINE_CONFIG.unknown;
                      const engineUrls = urlsByEngine[engine.toLowerCase()] || [];
                      
                      if (engineUrls.length === 0) return null;

                      return (
                        <div key={engine} className="space-y-1.5">
                          <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${config.bgColor}`}>
                            <Globe className={`w-3.5 h-3.5 ${config.color}`} />
                            <span className={`text-xs font-medium ${config.textColor}`}>
                              {config.label}
                            </span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {engineUrls.length} URLs
                            </Badge>
                          </div>

                          <div className="space-y-1 pl-2">
                            {engineUrls.map((urlItem, idx) => (
                              <motion.div
                                key={`${urlItem.url}-${idx}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors group"
                              >
                                {/* Status icon */}
                                <div className="mt-0.5 flex-shrink-0">
                                  {getStatusIcon(urlItem.status)}
                                </div>

                                {/* URL info */}
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-foreground truncate max-w-[250px]">
                                      {urlItem.title || 'Untitled'}
                                    </span>
                                    <a
                                      href={urlItem.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
                                    </a>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[350px]">
                                    {urlItem.url}
                                  </div>
                                </div>

                                {/* Relevance score */}
                                <div className={cn(
                                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0",
                                  getRelevanceColor(urlItem.relevanceScore)
                                )}>
                                  <Star className="w-2.5 h-2.5" />
                                  <span>{Math.round(urlItem.relevanceScore * 100)}%</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {filteredAndSortedUrls.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground text-xs">
                        No URLs match the current filter
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Footer summary */}
                <div className="border-t border-border px-3 py-2 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      {urlDetails.filter(u => u.status === 'scraped').length} scraped
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      {urlDetails.filter(u => u.status === 'pending').length} pending
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-500" />
                      {urlDetails.filter(u => u.status === 'failed').length} failed
                    </span>
                  </div>
                  <div>
                    Avg relevance: {urlDetails.length > 0 
                      ? Math.round((urlDetails.reduce((sum, u) => sum + u.relevanceScore, 0) / urlDetails.length) * 100)
                      : 0}%
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};
