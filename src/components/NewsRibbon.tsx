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
  RefreshCw,
  Sparkles,
  Calendar,
  X,
  Handshake,
  FileText,
  Rocket,
  UserPlus,
  Landmark,
  MapPin,
  Gavel,
  Target,
  Banknote,
  Home,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useNewsMonitor, NewsItem, NewsCategory as NewsCategoryType } from '@/hooks/useNewsMonitor';
import { useNewsSourceSettings } from '@/hooks/useNewsSourceSettings';
import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

const categoryIcons: Record<NewsCategoryType, React.ReactNode> = {
  ipo: <Building2 className="w-3 h-3" />,
  market: <TrendingUp className="w-3 h-3" />,
  regulatory: <AlertCircle className="w-3 h-3" />,
  expansion: <Rocket className="w-3 h-3" />,
  contract: <FileText className="w-3 h-3" />,
  joint_venture: <Handshake className="w-3 h-3" />,
  acquisition: <Landmark className="w-3 h-3" />,
  appointment: <UserPlus className="w-3 h-3" />,
  cma_violation: <Gavel className="w-3 h-3" />,
  vision_2030: <Target className="w-3 h-3" />,
  banking: <Banknote className="w-3 h-3" />,
  real_estate: <Home className="w-3 h-3" />,
  tech_funding: <Cpu className="w-3 h-3" />,
  general: <Globe className="w-3 h-3" />,
};

const categoryColors: Record<NewsCategoryType, string> = {
  ipo: 'bg-green-500/20 text-green-400 border-green-500/30',
  market: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  regulatory: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  expansion: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  contract: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  joint_venture: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  acquisition: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  appointment: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  cma_violation: 'bg-red-500/20 text-red-400 border-red-500/30',
  vision_2030: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  banking: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  real_estate: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  tech_funding: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  general: 'bg-muted text-muted-foreground border-border',
};

const categoryLabels: Record<NewsCategoryType, string> = {
  ipo: 'IPO',
  market: 'Market',
  regulatory: 'Regulatory',
  expansion: 'Expansion',
  contract: 'Contract',
  joint_venture: 'JV/Partnership',
  acquisition: 'M&A',
  appointment: 'Appointments',
  cma_violation: 'CMA Violation',
  vision_2030: 'Vision 2030',
  banking: 'Banking',
  real_estate: 'Real Estate',
  tech_funding: 'Tech Funding',
  general: 'General',
};

export type NewsCategory = NewsCategoryType | 'all';

interface NewsFilterState {
  categories: NewsCategory[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

// Export filter state for TopNavigation to use
export const useNewsFilterState = () => {
  const [filters, setFilters] = useState<NewsFilterState>({
    categories: ['all'],
    dateFrom: undefined,
    dateTo: undefined,
  });

  const toggleCategory = (category: NewsCategory) => {
    setFilters(prev => {
      if (category === 'all') {
        return { ...prev, categories: ['all'] };
      }
      
      const withoutAll = prev.categories.filter(c => c !== 'all');
      const hasCategory = withoutAll.includes(category);
      
      if (hasCategory) {
        const newCats = withoutAll.filter(c => c !== category);
        return { ...prev, categories: newCats.length === 0 ? ['all'] : newCats };
      } else {
        return { ...prev, categories: [...withoutAll, category] };
      }
    });
  };

  const setDateRange = (from: Date | undefined, to: Date | undefined) => {
    setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to }));
  };

  const clearFilters = () => {
    setFilters({ categories: ['all'], dateFrom: undefined, dateTo: undefined });
  };

  const hasActiveFilters = 
    !filters.categories.includes('all') || 
    filters.dateFrom !== undefined || 
    filters.dateTo !== undefined;

  return { filters, toggleCategory, setDateRange, clearFilters, hasActiveFilters };
};

interface NewsRibbonProps {
  filterState?: ReturnType<typeof useNewsFilterState>;
}

export function NewsRibbon({ filterState }: NewsRibbonProps) {
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

  const { isSourceAllowed } = useNewsSourceSettings();
  const { notifyNewItems, settings: notificationSettings, permission } = useNewsNotifications();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const previousNewsRef = useRef<Set<string>>(new Set());

  // Use provided filter state or create local one
  const localFilterState = useNewsFilterState();
  const { filters } = filterState || localFilterState;

  // Auto-start monitoring on mount
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  // Check for new high-priority news and send notifications
  useEffect(() => {
    if (news.length === 0) return;
    
    // Find truly new items (not seen before)
    const newItems = news.filter(item => {
      const isNew = !previousNewsRef.current.has(item.id);
      return isNew && item.isNew;
    });

    if (newItems.length > 0) {
      // Send notifications for high-priority items
      notifyNewItems(newItems);
      
      // Update seen items
      news.forEach(item => previousNewsRef.current.add(item.id));
    }
  }, [news, notifyNewItems]);

  // Filter news based on current filters AND source settings
  const filteredNews = news.filter(item => {
    // Source whitelist/blacklist filter
    if (!isSourceAllowed(item.source)) {
      return false;
    }
    
    // Category filter
    if (!filters.categories.includes('all') && !filters.categories.includes(item.category)) {
      return false;
    }
    
    // Date range filter
    if (filters.dateFrom && isBefore(item.timestamp, startOfDay(filters.dateFrom))) {
      return false;
    }
    if (filters.dateTo && isAfter(item.timestamp, endOfDay(filters.dateTo))) {
      return false;
    }
    
    return true;
  });

  // Auto-scroll animation
  useEffect(() => {
    if (isPaused || isExpanded || filteredNews.length === 0) return;

    const interval = setInterval(() => {
      setScrollPosition(prev => {
        const maxScroll = filteredNews.length * 320;
        return prev >= maxScroll ? 0 : prev + 1;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isPaused, isExpanded, filteredNews.length]);

  const newItemsCount = filteredNews.filter(n => n.isNew).length;

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

  if (filteredNews.length === 0 && !isLoading) {
    return (
      <div className="fixed top-14 left-0 right-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-center gap-3 py-2 px-4">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {news.length > 0 
              ? 'No news matching filters' 
              : isMonitoring 
                ? 'Monitoring for IPO news...' 
                : 'Start monitoring to see latest news'}
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
          "fixed top-14 left-0 right-0 z-30 transition-all duration-300",
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
              {[...filteredNews, ...filteredNews].map((item, index) => (
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
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Business Intelligence Feed</h3>
                  {lastCheck && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last checked: {formatTimeAgo(lastCheck)}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  {filteredNews.slice(0, 15).map((item) => (
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
                          "text-sm",
                          item.isNew ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {item.title}
                        </p>
                        {item.snippet && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">
                            {item.snippet}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px] h-4", categoryColors[item.category])}>
                            {categoryLabels[item.category]}
                          </Badge>
                          {item.country && (
                            <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              {item.country}
                            </Badge>
                          )}
                          {item.isOfficial && (
                            <Badge className="text-[10px] h-4 bg-green-500/20 text-green-500 border-green-500/30">
                              Official
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{item.source}</span>
                          <span className="text-xs text-muted-foreground/50">•</span>
                          <span className="text-xs text-muted-foreground/50">
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>
                        {item.companies && item.companies.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {item.companies.map(company => (
                              <Badge key={company} variant="secondary" className="text-[9px] h-3.5 px-1.5">
                                {company}
                              </Badge>
                            ))}
                          </div>
                        )}
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

// News Filter Component for TopNavigation
interface NewsFilterProps {
  filterState: ReturnType<typeof useNewsFilterState>;
}

export function NewsFilter({ filterState }: NewsFilterProps) {
  const { filters, toggleCategory, setDateRange, clearFilters, hasActiveFilters } = filterState;
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const categories: { value: NewsCategory; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'all', label: 'All', icon: <Globe className="w-3 h-3" />, color: 'bg-muted text-foreground' },
    { value: 'ipo', label: 'IPO', icon: <Building2 className="w-3 h-3" />, color: categoryColors.ipo },
    { value: 'cma_violation', label: 'CMA', icon: <Gavel className="w-3 h-3" />, color: categoryColors.cma_violation },
    { value: 'vision_2030', label: 'Vision 2030', icon: <Target className="w-3 h-3" />, color: categoryColors.vision_2030 },
    { value: 'banking', label: 'Banking', icon: <Banknote className="w-3 h-3" />, color: categoryColors.banking },
    { value: 'real_estate', label: 'Real Estate', icon: <Home className="w-3 h-3" />, color: categoryColors.real_estate },
    { value: 'tech_funding', label: 'Tech', icon: <Cpu className="w-3 h-3" />, color: categoryColors.tech_funding },
    { value: 'contract', label: 'Contracts', icon: <FileText className="w-3 h-3" />, color: categoryColors.contract },
    { value: 'acquisition', label: 'M&A', icon: <Landmark className="w-3 h-3" />, color: categoryColors.acquisition },
    { value: 'joint_venture', label: 'JV', icon: <Handshake className="w-3 h-3" />, color: categoryColors.joint_venture },
    { value: 'appointment', label: 'Execs', icon: <UserPlus className="w-3 h-3" />, color: categoryColors.appointment },
    { value: 'expansion', label: 'Expansion', icon: <Rocket className="w-3 h-3" />, color: categoryColors.expansion },
    { value: 'market', label: 'Market', icon: <TrendingUp className="w-3 h-3" />, color: categoryColors.market },
    { value: 'regulatory', label: 'Regulatory', icon: <AlertCircle className="w-3 h-3" />, color: categoryColors.regulatory },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {/* Category Filter Chips */}
      {categories.map((cat) => {
        const isActive = filters.categories.includes(cat.value);
        return (
          <Button
            key={cat.value}
            variant="ghost"
            size="sm"
            onClick={() => toggleCategory(cat.value)}
            className={cn(
              "h-7 px-2 gap-1 text-xs rounded-full transition-all",
              isActive 
                ? cn(cat.color, "border") 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.icon}
            <span className="hidden sm:inline">{cat.label}</span>
          </Button>
        );
      })}

      {/* Date Range Picker */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1 text-xs rounded-full",
              (filters.dateFrom || filters.dateTo) 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "text-muted-foreground"
            )}
          >
            <Calendar className="w-3 h-3" />
            {filters.dateFrom || filters.dateTo ? (
              <span className="hidden sm:inline">
                {filters.dateFrom && filters.dateTo
                  ? `${format(filters.dateFrom, 'MMM d')} - ${format(filters.dateTo, 'MMM d')}`
                  : filters.dateFrom
                    ? `From ${format(filters.dateFrom, 'MMM d')}`
                    : `To ${format(filters.dateTo!, 'MMM d')}`}
              </span>
            ) : (
              <span className="hidden sm:inline">Date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Date Range</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateRange(undefined, undefined);
                  setDatePickerOpen(false);
                }}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="flex">
            <div className="border-r border-border p-2">
              <p className="text-xs text-muted-foreground mb-2 px-2">From</p>
              <CalendarComponent
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => setDateRange(date, filters.dateTo)}
                initialFocus
              />
            </div>
            <div className="p-2">
              <p className="text-xs text-muted-foreground mb-2 px-2">To</p>
              <CalendarComponent
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => setDateRange(filters.dateFrom, date)}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear filters</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
