import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Newspaper, 
  Bell, 
  BellOff, 
  ExternalLink, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Building2,
  Globe,
  ChevronRight,
  X,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNewsMonitor, NewsItem } from '@/hooks/useNewsMonitor';
import { cn } from '@/lib/utils';

const categoryIcons: Record<NewsItem['category'], React.ReactNode> = {
  ipo: <Building2 className="w-3 h-3" />,
  market: <TrendingUp className="w-3 h-3" />,
  regulatory: <AlertCircle className="w-3 h-3" />,
  general: <Globe className="w-3 h-3" />,
};

const categoryColors: Record<NewsItem['category'], string> = {
  ipo: 'bg-green-500/20 text-green-400 border-green-500/30',
  market: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  regulatory: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  general: 'bg-muted text-muted-foreground border-border',
};

export function NewsRibbon() {
  const {
    news,
    isMonitoring,
    isLoading,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    fetchLatestNews,
    markAsRead,
  } = useNewsMonitor();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Auto-start monitoring on mount
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  // Auto-scroll animation
  useEffect(() => {
    if (isPaused || isExpanded || news.length === 0) return;

    const interval = setInterval(() => {
      setScrollPosition(prev => {
        const maxScroll = news.length * 320; // Approximate width per item
        return prev >= maxScroll ? 0 : prev + 1;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isPaused, isExpanded, news.length]);

  const newItemsCount = news.filter(n => n.isNew).length;

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleNewsClick = (item: NewsItem) => {
    markAsRead(item.id);
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  if (news.length === 0 && !isLoading) {
    return (
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-center gap-3 py-2 px-4">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isMonitoring ? 'Monitoring for IPO news...' : 'Start monitoring to see latest news'}
          </span>
          {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
          <Button
            variant="ghost"
            size="sm"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className="ml-2"
          >
            {isMonitoring ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* News Ribbon Bar */}
      <div 
        className={cn(
          "fixed top-16 left-0 right-0 z-40 transition-all duration-300",
          "bg-gradient-to-r from-background via-background/95 to-background",
          "border-b border-border/50 backdrop-blur-md",
          isExpanded ? "h-auto" : "h-10"
        )}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex items-center h-10 px-4">
          {/* Live Indicator */}
          <div className="flex items-center gap-2 pr-4 border-r border-border/50 shrink-0">
            <div className="relative">
              <Sparkles className="w-4 h-4 text-primary" />
              {isMonitoring && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs font-medium text-primary hidden sm:inline">LIVE</span>
            {newItemsCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/20 text-primary">
                {newItemsCount} new
              </Badge>
            )}
          </div>

          {/* Scrolling News Ticker */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-hidden mx-4"
          >
            <motion.div
              className="flex items-center gap-6 whitespace-nowrap"
              animate={{ x: -scrollPosition }}
              transition={{ duration: 0, ease: "linear" }}
            >
              {/* Duplicate news for seamless loop */}
              {[...news, ...news].map((item, index) => (
                <button
                  key={`${item.id}-${index}`}
                  onClick={() => handleNewsClick(item)}
                  className={cn(
                    "flex items-center gap-2 py-1 px-3 rounded-full transition-all",
                    "hover:bg-muted/50 cursor-pointer group",
                    item.isNew && "bg-primary/10"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full border",
                    categoryColors[item.category]
                  )}>
                    {categoryIcons[item.category]}
                  </span>
                  <span className={cn(
                    "text-sm max-w-[250px] truncate",
                    item.isNew ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {item.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                    {item.source}
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </motion.div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 pl-4 border-l border-border/50 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={fetchLatestNews}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh now</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? 'Collapse' : 'Expand'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={isMonitoring ? stopMonitoring : startMonitoring}
                >
                  {isMonitoring ? (
                    <BellOff className="w-3.5 h-3.5" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isMonitoring ? 'Stop monitoring' : 'Start monitoring'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Expanded Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/30 overflow-hidden"
            >
              <div className="p-4 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Latest IPO News</h3>
                  {lastCheck && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last checked: {formatTimeAgo(lastCheck)}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  {news.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNewsClick(item)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                        "hover:bg-muted/50 border border-transparent hover:border-border/50",
                        item.isNew && "bg-primary/5 border-primary/20"
                      )}
                    >
                      <span className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg border shrink-0",
                        categoryColors[item.category]
                      )}>
                        {categoryIcons[item.category]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          item.isNew ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{item.source}</span>
                          <span className="text-xs text-muted-foreground/50">•</span>
                          <span className="text-xs text-muted-foreground/50">
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>
                      </div>
                      {item.isNew && (
                        <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30 shrink-0">
                          NEW
                        </Badge>
                      )}
                      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spacer to prevent content overlap */}
      <div className="h-10" />
    </>
  );
}
