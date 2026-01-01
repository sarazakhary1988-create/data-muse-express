import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Check, 
  X, 
  Loader2, 
  Clock, 
  AlertTriangle,
  Zap,
  FileText,
  Search,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResearchStore, DeepVerifySource } from '@/store/researchStore';
import { SourceStatus } from '@/lib/api/research';

interface LiveScrapingPanelProps {
  sources?: SourceStatus[];
  isActive?: boolean;
  className?: string;
}

const statusConfig = {
  pending: { 
    icon: Clock, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/50',
    pulse: false,
    label: 'Waiting'
  },
  scraping: { 
    icon: Loader2, 
    color: 'text-primary', 
    bg: 'bg-primary/10',
    pulse: true,
    label: 'Scraping'
  },
  mapping: { 
    icon: Search, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10',
    pulse: true,
    label: 'Mapping'
  },
  success: { 
    icon: Check, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10',
    pulse: false,
    label: 'Complete'
  },
  completed: { 
    icon: Check, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10',
    pulse: false,
    label: 'Complete'
  },
  failed: { 
    icon: X, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    pulse: false,
    label: 'Failed'
  },
  timeout: { 
    icon: AlertTriangle, 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10',
    pulse: false,
    label: 'Timeout'
  },
  blocked: { 
    icon: X, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    pulse: false,
    label: 'Blocked'
  },
  no_content: { 
    icon: FileText, 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/50',
    pulse: false,
    label: 'No Content'
  },
};

type SourceLike = DeepVerifySource | SourceStatus;

const SourceItem: React.FC<{ 
  source: SourceLike; 
  index: number;
}> = ({ source, index }) => {
  const status = source.status;
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;
  const pagesFound = 'pagesFound' in source ? (source.pagesFound ?? 0) : 0;
  const pagesExtracted = 'pagesExtracted' in source ? (source as SourceStatus).pagesExtracted : undefined;
  const responseTime = 'responseTime' in source ? (source as SourceStatus).responseTime : undefined;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
        config.bg,
        status === 'scraping' || status === 'mapping' 
          ? 'border-primary/30 shadow-sm shadow-primary/10' 
          : 'border-border/50'
      )}
    >
      {/* Status Icon */}
      <div className={cn(
        "relative flex items-center justify-center w-8 h-8 rounded-full",
        config.bg
      )}>
        {config.pulse && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <Icon className={cn(
          "w-4 h-4",
          config.color,
          status === 'scraping' && "animate-spin"
        )} />
      </div>

      {/* Source Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {source.name}
          </span>
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider",
            config.bg,
            config.color
          )}>
            {config.label}
          </span>
        </div>
        
        {'url' in source && source.url && (
          <span className="text-xs text-muted-foreground truncate block">
            {new URL(source.url).hostname}
          </span>
        )}
        {'baseUrl' in source && source.baseUrl && (
          <span className="text-xs text-muted-foreground truncate block">
            {new URL(source.baseUrl).hostname}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {responseTime !== undefined && (
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>{responseTime}ms</span>
          </div>
        )}
        
        {(pagesFound !== undefined && pagesFound > 0) && (
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>
              {pagesExtracted !== undefined 
                ? `${pagesExtracted}/${pagesFound}` 
                : pagesFound}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const LiveScrapingPanel: React.FC<LiveScrapingPanelProps> = ({ 
  sources: externalSources,
  isActive = false,
  className 
}) => {
  const { deepVerifySources, isSearching, agentState } = useResearchStore();
  
  // Use external sources if provided, otherwise use store sources
  const displaySources = externalSources || deepVerifySources;
  const active = isActive || isSearching;
  
  // Calculate stats
  const totalSources = displaySources.length;
  const completedSources = displaySources.filter(
    s => s.status === 'success' || s.status === 'completed'
  ).length;
  const failedSources = displaySources.filter(
    s => s.status === 'failed' || s.status === 'timeout' || s.status === 'blocked'
  ).length;
  const activeSources = displaySources.filter(
    s => s.status === 'scraping' || s.status === 'mapping' || s.status === 'pending'
  ).length;
  
  const totalPagesFound = displaySources.reduce((acc, s) => {
    if ('pagesFound' in s) return acc + (s.pagesFound || 0);
    return acc;
  }, 0);

  if (!active && displaySources.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden",
        active && "border-primary/30 shadow-lg shadow-primary/5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className={cn(
              "w-4 h-4",
              active ? "text-primary" : "text-muted-foreground"
            )} />
            {active && (
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/30"
                animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <span className="font-semibold text-sm">
            {active ? 'Live Scraping' : 'Scraping Complete'}
          </span>
        </div>
        
        {/* Stats Summary */}
        <div className="flex items-center gap-4 text-xs">
          {activeSources > 0 && (
            <motion.div 
              className="flex items-center gap-1 text-primary"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{activeSources} active</span>
            </motion.div>
          )}
          
          {completedSources > 0 && (
            <div className="flex items-center gap-1 text-emerald-500">
              <Check className="w-3 h-3" />
              <span>{completedSources} done</span>
            </div>
          )}
          
          {failedSources > 0 && (
            <div className="flex items-center gap-1 text-destructive">
              <X className="w-3 h-3" />
              <span>{failedSources} failed</span>
            </div>
          )}
          
          {totalPagesFound > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>{totalPagesFound} pages</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {active && totalSources > 0 && (
        <div className="h-1 bg-muted/50">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: 0 }}
            animate={{ 
              width: `${((completedSources + failedSources) / totalSources) * 100}%` 
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* Sources List */}
      <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displaySources.map((source, index) => (
            <SourceItem 
              key={source.name} 
              source={source} 
              index={index} 
            />
          ))}
        </AnimatePresence>
        
        {displaySources.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No sources configured</p>
          </div>
        )}
      </div>

      {/* Agent State Footer */}
      {agentState.state !== 'idle' && (
        <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-muted-foreground capitalize">
              {agentState.state.replace(/_/g, ' ')}
            </span>
          </div>
          
          {agentState.quality.overall > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Quality:</span>
              <span className={cn(
                "font-medium",
                agentState.quality.overall >= 0.8 ? "text-emerald-500" :
                agentState.quality.overall >= 0.5 ? "text-amber-500" : "text-destructive"
              )}>
                {(agentState.quality.overall * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default LiveScrapingPanel;
