import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Search, 
  Check, 
  X, 
  Loader2, 
  Radio,
  Zap,
  ExternalLink,
  Database,
  FileText,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResearchStore } from '@/store/researchStore';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// Source status type for live tracking
export interface LiveSourceStatus {
  id: string;
  name: string;
  url: string;
  domain: string;
  status: 'queued' | 'searching' | 'scraping' | 'success' | 'failed';
  engine?: string; // Which search engine found it
  resultsCount?: number;
  responseTime?: number;
  timestamp: number;
}

interface LiveSourceIndicatorProps {
  className?: string;
}

const statusConfig = {
  queued: { 
    icon: Clock, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/50',
    label: 'Queued',
    pulse: false 
  },
  searching: { 
    icon: Search, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10',
    label: 'Searching',
    pulse: true 
  },
  scraping: { 
    icon: Database, 
    color: 'text-primary', 
    bg: 'bg-primary/10',
    label: 'Scraping',
    pulse: true 
  },
  success: { 
    icon: Check, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10',
    label: 'Complete',
    pulse: false 
  },
  failed: { 
    icon: X, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    label: 'Failed',
    pulse: false 
  },
};

const SourceRow: React.FC<{ source: LiveSourceStatus; index: number }> = ({ source, index }) => {
  const config = statusConfig[source.status];
  const Icon = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        "flex items-center gap-2 py-2 px-3 rounded-lg border transition-all duration-300",
        config.bg,
        source.status === 'searching' || source.status === 'scraping' 
          ? 'border-primary/30 shadow-sm' 
          : 'border-border/30'
      )}
    >
      {/* Status Icon with pulse */}
      <div className="relative flex-shrink-0">
        {config.pulse && (
          <motion.div
            className={cn("absolute inset-0 rounded-full", config.bg)}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <Icon className={cn(
          "w-3.5 h-3.5 relative z-10",
          config.color,
          source.status === 'scraping' && "animate-spin"
        )} />
      </div>

      {/* Source Info */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-xs font-medium truncate max-w-[120px]">
          {source.name || source.domain}
        </span>
        
        {source.engine && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
            {source.engine}
          </span>
        )}
      </div>

      {/* Status & Meta */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {source.responseTime && source.status === 'success' && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5" />
            {source.responseTime}ms
          </span>
        )}
        
        <span className={cn(
          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
          config.bg,
          config.color
        )}>
          {config.label}
        </span>
      </div>
    </motion.div>
  );
};

export const LiveSourceIndicator: React.FC<LiveSourceIndicatorProps> = ({ className }) => {
  const { t, isRTL } = useLanguage();
  const { 
    isSearching, 
    agentState, 
    deepVerifySources,
  } = useResearchStore();
  
  // Convert deepVerifySources to LiveSourceStatus format
  const liveSources: LiveSourceStatus[] = React.useMemo(() => {
    return deepVerifySources.map((s, i) => ({
      id: `${s.name}-${i}`,
      name: s.name,
      url: s.url,
      domain: new URL(s.url).hostname.replace('www.', ''),
      status: s.status === 'pending' ? 'queued' 
            : s.status === 'mapping' ? 'searching'
            : s.status === 'scraping' ? 'scraping'
            : s.status === 'completed' ? 'success'
            : 'failed',
      resultsCount: s.pagesFound,
      timestamp: Date.now(),
    }));
  }, [deepVerifySources]);
  
  // Also include search engine results if available
  const searchEngineSources: LiveSourceStatus[] = React.useMemo(() => {
    if (!agentState.searchEngines?.urlDetails) return [];
    
    return agentState.searchEngines.urlDetails.slice(0, 8).map((detail, i) => ({
      id: `search-${i}`,
      name: detail.title?.slice(0, 40) || detail.url,
      url: detail.url,
      domain: new URL(detail.url).hostname.replace('www.', ''),
      status: detail.status === 'scraped' ? 'success' 
            : detail.status === 'failed' ? 'failed' 
            : 'queued',
      engine: detail.engine,
      timestamp: Date.now(),
    }));
  }, [agentState.searchEngines?.urlDetails]);
  
  // Combine all sources
  const allSources = [...liveSources, ...searchEngineSources];
  
  // Calculate stats
  const stats = React.useMemo(() => {
    const searching = allSources.filter(s => s.status === 'searching').length;
    const scraping = allSources.filter(s => s.status === 'scraping').length;
    const success = allSources.filter(s => s.status === 'success').length;
    const failed = allSources.filter(s => s.status === 'failed').length;
    const total = allSources.length;
    
    return { searching, scraping, success, failed, total, active: searching + scraping };
  }, [allSources]);
  
  // Don't show if not searching and no sources
  if (!isSearching && allSources.length === 0) {
    return null;
  }
  
  const enginesUsed = agentState.searchEngines?.engines || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden",
        isSearching && stats.active > 0 && "border-primary/40 shadow-lg shadow-primary/5",
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className={cn(
              "w-4 h-4",
              isSearching && stats.active > 0 ? "text-primary" : "text-muted-foreground"
            )} />
            {isSearching && stats.active > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/30"
                animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <span className="font-semibold text-sm">
            {isSearching ? (isRTL ? 'بحث مباشر' : 'Live Search') : (isRTL ? 'اكتمل البحث' : 'Search Complete')}
          </span>
          
          {/* Search engines badges */}
          {enginesUsed.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              {enginesUsed.slice(0, 3).map(engine => (
                <span 
                  key={engine}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase tracking-wider"
                >
                  {engine}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          {stats.active > 0 && (
            <motion.div 
              className="flex items-center gap-1 text-primary"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{stats.active} {isRTL ? 'نشط' : 'active'}</span>
            </motion.div>
          )}
          
          {stats.success > 0 && (
            <div className="flex items-center gap-1 text-emerald-500">
              <Check className="w-3 h-3" />
              <span>{stats.success}</span>
            </div>
          )}
          
          {stats.failed > 0 && (
            <div className="flex items-center gap-1 text-destructive">
              <X className="w-3 h-3" />
              <span>{stats.failed}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span>{stats.total} {isRTL ? 'مصادر' : 'sources'}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isSearching && stats.total > 0 && (
        <div className="h-1 bg-muted/50">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-emerald-500"
            initial={{ width: 0 }}
            animate={{ 
              width: `${((stats.success + stats.failed) / Math.max(stats.total, 1)) * 100}%` 
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      {/* Sources List */}
      <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {allSources.length > 0 ? (
            allSources.slice(0, 10).map((source, index) => (
              <SourceRow key={source.id} source={source} index={index} />
            ))
          ) : isSearching ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-4 text-muted-foreground text-sm gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isRTL ? 'جاري البحث عن المصادر...' : 'Discovering sources...'}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
        
        {allSources.length > 10 && (
          <div className="text-center text-xs text-muted-foreground py-1">
            +{allSources.length - 10} {isRTL ? 'مصادر أخرى' : 'more sources'}
          </div>
        )}
      </div>
      
      {/* Footer with timing */}
      {agentState.searchEngines?.timing && (
        <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {isRTL ? 'وقت البحث' : 'Search time'}: {agentState.searchEngines.timing}ms
          </span>
          <span>
            {agentState.searchEngines.searchMethod || 'Multi-engine'}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default LiveSourceIndicator;
