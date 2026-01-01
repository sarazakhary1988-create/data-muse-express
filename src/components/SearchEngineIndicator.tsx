import { motion } from 'framer-motion';
import { Globe, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useResearchStore } from '@/store/researchStore';

// Engine colors and icons
const ENGINE_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  duckduckgo: { color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/30', label: 'DuckDuckGo' },
  google: { color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30', label: 'Google' },
  bing: { color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 border-cyan-500/30', label: 'Bing' },
  internal: { color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30', label: 'Sitemap' },
  unknown: { color: 'text-muted-foreground', bgColor: 'bg-muted/50 border-border', label: 'Other' },
};

export const SearchEngineIndicator = () => {
  const { agentState, isSearching } = useResearchStore();
  const { searchEngines } = agentState;

  if (!searchEngines && !isSearching) return null;

  const engines = searchEngines?.engines || [];
  const resultCounts = searchEngines?.resultCounts || {};
  const timing = searchEngines?.timing;
  const searchMethod = searchEngines?.searchMethod || 'embedded_web_search';

  // Calculate total results
  const totalResults = Object.values(resultCounts).reduce((sum, count) => sum + count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 flex-wrap"
    >
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
    </motion.div>
  );
};
