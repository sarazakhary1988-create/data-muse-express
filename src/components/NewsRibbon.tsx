import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Handshake,
  FileText,
  Rocket,
  UserPlus,
  Landmark,
  Gavel,
  Target,
  Banknote,
  Home,
  Cpu,
  Languages,
  Settings,
  Search,
  X,
  Loader2,
  Filter,
  MapPin,
  GripVertical,
  Timer,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNewsMonitor, NewsItem, NewsCategory as NewsCategoryType, NewsRegion, RefreshInterval } from '@/hooks/useNewsMonitor';
import { useNewsSourceSettings } from '@/hooks/useNewsSourceSettings';
import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { useLanguage, Language } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const FILTER_STORAGE_KEY = 'orkestra_news_filters';
const RIBBON_POSITION_KEY = 'orkestra_ribbon_position';

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
  joint_venture: 'JV',
  acquisition: 'M&A',
  appointment: 'Exec',
  cma_violation: 'CMA',
  vision_2030: 'Vision 2030',
  banking: 'Banking',
  real_estate: 'Real Estate',
  tech_funding: 'Tech',
  general: 'News',
};

export type NewsCategory = NewsCategoryType | 'all';

// Countries for filtering
const COUNTRIES = [
  { code: 'all', label: 'All Countries', flag: '🌍' },
  { code: 'Saudi Arabia', label: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'UAE', label: 'UAE', flag: '🇦🇪' },
  { code: 'Kuwait', label: 'Kuwait', flag: '🇰🇼' },
  { code: 'Qatar', label: 'Qatar', flag: '🇶🇦' },
  { code: 'Bahrain', label: 'Bahrain', flag: '🇧🇭' },
  { code: 'Oman', label: 'Oman', flag: '🇴🇲' },
  { code: 'Egypt', label: 'Egypt', flag: '🇪🇬' },
  { code: 'USA', label: 'USA', flag: '🇺🇸' },
  { code: 'UK', label: 'UK', flag: '🇬🇧' },
];

// Sources for filtering
const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'argaam', label: 'Argaam' },
  { id: 'zawya', label: 'Zawya' },
  { id: 'reuters', label: 'Reuters' },
  { id: 'bloomberg', label: 'Bloomberg' },
  { id: 'arabnews', label: 'Arab News' },
  { id: 'ft', label: 'Financial Times' },
  { id: 'yahoo', label: 'Yahoo Finance' },
  { id: 'tadawul', label: 'Tadawul' },
];

interface NewsFilterState {
  categories: NewsCategory[];
  countries: string[];
  sources: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface NewsSummary {
  summary: string;
  keyFacts: string[];
  significance: string;
  suggestions: { topic: string; query: string }[];
}

// Load filters from localStorage
const loadFiltersFromStorage = (): NewsFilterState => {
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        categories: parsed.categories || ['all'],
        countries: parsed.countries || ['all'],
        sources: parsed.sources || ['all'],
        dateFrom: parsed.dateFrom ? new Date(parsed.dateFrom) : undefined,
        dateTo: parsed.dateTo ? new Date(parsed.dateTo) : undefined,
      };
    }
  } catch {}
  return { 
    categories: ['all'], 
    countries: ['all'], 
    sources: ['all'], 
    dateFrom: undefined, 
    dateTo: undefined 
  };
};

// Save filters to localStorage
const saveFiltersToStorage = (filters: NewsFilterState) => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      categories: filters.categories,
      countries: filters.countries,
      sources: filters.sources,
      dateFrom: filters.dateFrom?.toISOString(),
      dateTo: filters.dateTo?.toISOString(),
    }));
  } catch {}
};

export const useNewsFilterState = () => {
  const [filters, setFilters] = useState<NewsFilterState>(loadFiltersFromStorage);

  // Persist to localStorage on change
  useEffect(() => {
    saveFiltersToStorage(filters);
  }, [filters]);

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

  const toggleCountry = (country: string) => {
    setFilters(prev => {
      if (country === 'all') {
        return { ...prev, countries: ['all'] };
      }
      
      const withoutAll = prev.countries.filter(c => c !== 'all');
      const has = withoutAll.includes(country);
      
      if (has) {
        const newList = withoutAll.filter(c => c !== country);
        return { ...prev, countries: newList.length === 0 ? ['all'] : newList };
      } else {
        return { ...prev, countries: [...withoutAll, country] };
      }
    });
  };

  const toggleSource = (source: string) => {
    setFilters(prev => {
      if (source === 'all') {
        return { ...prev, sources: ['all'] };
      }
      
      const withoutAll = prev.sources.filter(s => s !== 'all');
      const has = withoutAll.includes(source);
      
      if (has) {
        const newList = withoutAll.filter(s => s !== source);
        return { ...prev, sources: newList.length === 0 ? ['all'] : newList };
      } else {
        return { ...prev, sources: [...withoutAll, source] };
      }
    });
  };

  const setDateRange = (from: Date | undefined, to: Date | undefined) => {
    setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to }));
  };

  const clearFilters = () => {
    setFilters({ 
      categories: ['all'], 
      countries: ['all'],
      sources: ['all'],
      dateFrom: undefined, 
      dateTo: undefined 
    });
  };

  const hasActiveFilters = 
    !filters.categories.includes('all') || 
    !filters.countries.includes('all') ||
    !filters.sources.includes('all') ||
    filters.dateFrom !== undefined || 
    filters.dateTo !== undefined;

  return { filters, toggleCategory, toggleCountry, toggleSource, setDateRange, clearFilters, hasActiveFilters };
};

// News category filter chips for TopNavigation
interface NewsFilterProps {
  filterState: ReturnType<typeof useNewsFilterState>;
}

export function NewsFilter({ filterState }: NewsFilterProps) {
  const { filters, toggleCategory } = filterState;
  
  const categories: { key: NewsCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'ipo', label: 'IPO' },
    { key: 'acquisition', label: 'M&A' },
    { key: 'contract', label: 'Contracts' },
    { key: 'vision_2030', label: 'Vision 2030' },
    { key: 'cma_violation', label: 'CMA' },
  ];

  return (
    <div className="flex items-center gap-1">
      {categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => toggleCategory(cat.key)}
          className={cn(
            "px-2 py-0.5 text-[10px] rounded-full transition-all",
            filters.categories.includes(cat.key)
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

interface NewsRibbonProps {
  filterState?: ReturnType<typeof useNewsFilterState>;
  onResearchNews?: (query: string) => void;
}

export function NewsRibbon({ filterState, onResearchNews }: NewsRibbonProps) {
  const navigate = useNavigate();
  const {
    news,
    isMonitoring,
    isLoading,
    lastCheck,
    refreshInterval,
    secondsUntilRefresh,
    startMonitoring,
    stopMonitoring,
    refreshNews,
    markAsRead,
    setRefreshInterval,
    updateFilters,
  } = useNewsMonitor();

  const { isSourceAllowed } = useNewsSourceSettings();
  const { 
    notifyNewItems, 
    settings: notificationSettings, 
    toggleNotifications, 
    toggleCategory: toggleNotificationCategory,
    toggleSound,
    permission 
  } = useNewsNotifications();
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  ];

  // Draggable position state
  const [position, setPosition] = useState<'top' | 'bottom'>(() => {
    try {
      const saved = localStorage.getItem(RIBBON_POSITION_KEY);
      return saved === 'bottom' ? 'bottom' : 'top';
    } catch {
      return 'top';
    }
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryItem, setSummaryItem] = useState<NewsItem | null>(null);
  const [summaryData, setSummaryData] = useState<NewsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const previousNewsRef = useRef<Set<string>>(new Set());

  const localFilterState = useNewsFilterState();
  const activeFilterState = filterState || localFilterState;
  const { filters, toggleCategory, toggleCountry, toggleSource, clearFilters, hasActiveFilters } = activeFilterState;

  // Save position to localStorage
  const togglePosition = () => {
    const newPosition = position === 'top' ? 'bottom' : 'top';
    setPosition(newPosition);
    try {
      localStorage.setItem(RIBBON_POSITION_KEY, newPosition);
    } catch {}
  };

  // Auto-start monitoring on mount
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  // Update filters in the hook when local filters change (including date range)
  useEffect(() => {
    updateFilters({
      categories: filters.categories.filter(c => c !== 'all'),
      countries: filters.countries.filter(c => c !== 'all'),
      sources: filters.sources.filter(s => s !== 'all'),
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  }, [filters.categories, filters.countries, filters.sources, filters.dateFrom, filters.dateTo, updateFilters]);

  // Check for new high-priority news and send notifications
  useEffect(() => {
    if (news.length === 0) return;
    
    const newItems = news.filter(item => {
      const isNew = !previousNewsRef.current.has(item.id);
      return isNew && item.isNew;
    });

    if (newItems.length > 0) {
      notifyNewItems(newItems);
      news.forEach(item => previousNewsRef.current.add(item.id));
    }
  }, [news, notifyNewItems]);

  // Filter news with country and source filters
  const filteredNews = news.filter(item => {
    if (!isSourceAllowed(item.source)) return false;
    if (!filters.categories.includes('all') && !filters.categories.includes(item.category)) return false;
    
    // Country filter
    if (!filters.countries.includes('all')) {
      if (!item.country || !filters.countries.includes(item.country)) return false;
    }
    
    // Source filter
    if (!filters.sources.includes('all')) {
      const sourceMatch = filters.sources.some(s => 
        item.source.toLowerCase().includes(s.toLowerCase())
      );
      if (!sourceMatch) return false;
    }
    
    if (filters.dateFrom && isBefore(item.timestamp, startOfDay(filters.dateFrom))) return false;
    if (filters.dateTo && isAfter(item.timestamp, endOfDay(filters.dateTo))) return false;
    return true;
  });

  const newItemsCount = filteredNews.filter(n => n.isNew).length;

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch AI summary for a news item
  const fetchSummary = async (item: NewsItem) => {
    setSummaryItem(item);
    setSummaryDialogOpen(true);
    setSummaryLoading(true);
    setSummaryData(null);
    markAsRead(item.id);

    try {
      const { data, error } = await supabase.functions.invoke('summarize-news', {
        body: {
          title: item.title,
          url: item.url,
          snippet: item.snippet,
          source: item.source,
        },
      });

      if (error) throw error;

      setSummaryData({
        summary: data.summary || 'Summary unavailable.',
        keyFacts: data.keyFacts || [],
        significance: data.significance || '',
        suggestions: data.suggestions || [],
      });
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      setSummaryData({
        summary: item.snippet || 'Unable to generate summary. Please visit the article directly.',
        keyFacts: [],
        significance: '',
        suggestions: [],
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleNewsClick = (item: NewsItem) => {
    fetchSummary(item);
  };

  const handleResearchClick = (item: NewsItem) => {
    setSummaryDialogOpen(false);
    if (onResearchNews) {
      onResearchNews(item.title);
    }
  };

  const handleItemExpand = (item: NewsItem) => {
    markAsRead(item.id);
    setSelectedItem(selectedItem?.id === item.id ? null : item);
  };

  // Empty state
  if (filteredNews.length === 0 && !isLoading) {
    return (
      <>
        <div className={cn(
          "fixed left-0 right-0 z-30 h-10 bg-background/95 backdrop-blur-sm border-b border-border/50",
          position === 'top' ? "top-14" : "bottom-0 border-t border-b-0"
        )}>
          <div className="flex items-center justify-center gap-3 h-full px-4">
            <Newspaper className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {news.length > 0 
                ? 'No news matching filters' 
                : isMonitoring 
                  ? 'Loading news feed...' 
                  : 'Start monitoring for news'}
            </span>
            {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
            <Button
              variant="ghost"
              size="sm"
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className="h-6 px-2"
            >
              {isMonitoring ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
            </Button>
          </div>
        </div>
        <div className="h-10" />
      </>
    );
  }

  return (
    <>
      {/* Draggable News Ribbon */}
      <div 
        className={cn(
          "fixed left-0 right-0 z-30",
          "bg-background/95 backdrop-blur-sm border-border/50",
          "transition-all duration-300",
          position === 'top' ? "top-14 border-b" : "bottom-0 border-t"
        )}
      >
        {/* Main ticker bar - 40px height */}
        <div className="flex items-center h-10 px-2 gap-2">
          {/* Drag handle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={togglePosition}
                className="shrink-0 p-1 cursor-grab active:cursor-grabbing hover:bg-muted/50 rounded"
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side={position === 'top' ? 'bottom' : 'top'}>
              Move to {position === 'top' ? 'bottom' : 'top'}
            </TooltipContent>
          </Tooltip>

          {/* Live indicator with countdown */}
          <div className="flex items-center gap-1.5 px-2 border-r border-border/50 shrink-0">
            <div className="relative">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {isMonitoring && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider hidden sm:inline">
              LIVE
            </span>
            {newItemsCount > 0 && (
              <Badge 
                variant="secondary" 
                className="text-[9px] h-4 px-1 bg-primary/20 text-primary font-medium"
              >
                {newItemsCount}
              </Badge>
            )}
            {/* Active filter indicators */}
            {hasActiveFilters && (
              <div className="hidden lg:flex items-center gap-1">
                {!filters.countries.includes('all') && filters.countries.map(c => (
                  <Badge 
                    key={c}
                    variant="outline" 
                    className="text-[8px] h-4 px-1.5 border-blue-500/50 text-blue-400 bg-blue-500/10"
                  >
                    {COUNTRIES.find(cc => cc.code === c)?.flag} {c}
                  </Badge>
                ))}
                {!filters.categories.includes('all') && filters.categories.slice(0, 2).map(cat => (
                  <Badge 
                    key={cat}
                    variant="outline" 
                    className="text-[8px] h-4 px-1.5 border-primary/50 text-primary bg-primary/10"
                  >
                    {categoryLabels[cat as NewsCategoryType] || cat}
                  </Badge>
                ))}
              </div>
            )}
            {/* Countdown timer */}
            {isMonitoring && secondsUntilRefresh > 0 && (
              <span className="text-[9px] text-muted-foreground font-mono hidden md:inline">
                {formatCountdown(secondsUntilRefresh)}
              </span>
            )}
          </div>

          {/* CSS-based scrolling ticker */}
          <div className="flex-1 overflow-hidden relative">
            <div 
              className={cn(
                "news-ticker flex items-center gap-4 whitespace-nowrap",
                filteredNews.length < 5 && "news-ticker-slow"
              )}
            >
              {/* Duplicate items for seamless loop */}
              {[...filteredNews, ...filteredNews].map((item, index) => (
                <button
                  key={`${item.id}-${index}`}
                  onClick={() => handleNewsClick(item)}
                  className={cn(
                    "inline-flex items-center gap-2 py-1 px-2.5 rounded-md transition-all",
                    "hover:bg-muted/60 cursor-pointer group shrink-0",
                    item.isNew && "bg-primary/5"
                  )}
                >
                  {/* Category badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                    categoryColors[item.category]
                  )}>
                    {categoryIcons[item.category]}
                    <span className="hidden sm:inline">{categoryLabels[item.category]}</span>
                  </span>
                  
                  {/* Title */}
                  <span className={cn(
                    "text-xs max-w-[200px] sm:max-w-[300px] truncate",
                    item.isNew ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {item.title}
                  </span>
                  
                  {/* Source & time */}
                  <span className="text-[10px] text-muted-foreground/60 hidden md:inline">
                    {item.source}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                  
                  {/* External link indicator */}
                  <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 pl-2 border-l border-border/50 shrink-0">
            {/* Refresh interval selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Timer className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-36 p-2">
                <p className="text-[10px] text-muted-foreground mb-2">Refresh interval</p>
                <div className="space-y-1">
                  {([1, 5, 15, 30] as RefreshInterval[]).map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setRefreshInterval(interval)}
                      className={cn(
                        "w-full text-left px-2 py-1 text-xs rounded hover:bg-muted",
                        refreshInterval === interval && "bg-primary/20 text-primary"
                      )}
                    >
                      {interval} min
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={refreshNews}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={position === 'top' ? 'bottom' : 'top'}>Refresh</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={position === 'top' ? 'bottom' : 'top'}>{isExpanded ? 'Collapse' : 'Expand'}</TooltipContent>
            </Tooltip>

            {/* Open full news page */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => navigate('/news')}
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={position === 'top' ? 'bottom' : 'top'}>Open News Page</TooltipContent>
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
                    <BellOff className="w-3 h-3" />
                  ) : (
                    <Bell className="w-3 h-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={position === 'top' ? 'bottom' : 'top'}>
                {isMonitoring ? 'Stop' : 'Start'}
              </TooltipContent>
            </Tooltip>

            {/* Settings */}
            <Popover open={showSettings} onOpenChange={setShowSettings}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className={cn("w-3 h-3", hasActiveFilters && "text-primary")} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3 max-h-[400px] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium">News Settings</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                  
                  {/* Category Filters */}
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Categories
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => toggleCategory(key as NewsCategory)}
                          className={cn(
                            "px-2 py-0.5 text-[10px] rounded-full border transition-all",
                            filters.categories.includes(key as NewsCategory) || filters.categories.includes('all')
                              ? categoryColors[key as NewsCategoryType]
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Country Filters */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Countries
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {COUNTRIES.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => toggleCountry(country.code)}
                          className={cn(
                            "px-2 py-0.5 text-[10px] rounded-full border transition-all flex items-center gap-1",
                            filters.countries.includes(country.code) || filters.countries.includes('all')
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          <span>{country.flag}</span>
                          <span>{country.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source Filters */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Sources
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {SOURCES.map((source) => (
                        <button
                          key={source.id}
                          onClick={() => toggleSource(source.id)}
                          className={cn(
                            "px-2 py-0.5 text-[10px] rounded-full border transition-all",
                            filters.sources.includes(source.id) || filters.sources.includes('all')
                              ? "bg-secondary text-secondary-foreground border-secondary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {source.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Notifications</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Push notifications</span>
                      <Switch 
                        checked={notificationSettings.enabled} 
                        onCheckedChange={toggleNotifications}
                        disabled={permission === 'denied'}
                      />
                    </div>
                    {permission === 'denied' && (
                      <p className="text-[10px] text-destructive">Notifications blocked by browser</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Sound alerts</span>
                      <Switch 
                        checked={notificationSettings.soundEnabled} 
                        onCheckedChange={toggleSound}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Language Toggle */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Languages className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-28 p-1">
                {languages.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={language === lang.code ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start gap-2 h-7 text-xs"
                    onClick={() => setLanguage(lang.code)}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Expanded Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border/30 overflow-hidden bg-background/98"
            >
              <div className="p-3 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-foreground">Business Intelligence Feed</h3>
                  {lastCheck && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Last check: {formatTimeAgo(lastCheck)}
                    </span>
                  )}
                </div>

                <div className="grid gap-1.5">
                  {filteredNews.slice(0, 20).map((item) => (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => handleItemExpand(item)}
                        className={cn(
                          "w-full flex items-start gap-2 p-2 rounded-md text-left transition-all",
                          "hover:bg-muted/50 border border-transparent hover:border-border/50",
                          item.isNew && "bg-primary/5 border-primary/20",
                          selectedItem?.id === item.id && "bg-muted/60 border-border"
                        )}
                      >
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 mt-0.5",
                          categoryColors[item.category]
                        )}>
                          {categoryIcons[item.category]}
                          {categoryLabels[item.category]}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs leading-tight",
                            item.isNew ? "text-foreground font-medium" : "text-muted-foreground"
                          )}>
                            {item.title}
                          </p>
                          {item.snippet && selectedItem?.id !== item.id && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-1">
                              {item.snippet}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/50">
                            <span>{item.source}</span>
                            {item.country && (
                              <>
                                <span>•</span>
                                <span>{item.country}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatTimeAgo(item.timestamp)}</span>
                            {item.isOfficial && (
                              <Badge variant="outline" className="h-3.5 px-1 text-[8px] border-green-500/30 text-green-500">
                                Official
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {selectedItem?.id === item.id ? (
                          <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                      </button>
                      
                      {/* Expanded details */}
                      <AnimatePresence>
                        {selectedItem?.id === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-8 p-3 rounded-md bg-muted/30 border border-border/50 space-y-2">
                              {item.snippet && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {item.snippet}
                                </p>
                              )}
                              
                              {item.companies && item.companies.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[10px] text-muted-foreground/60">Companies:</span>
                                  {item.companies.map((c, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] h-4 px-1.5">
                                      {c}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] gap-1"
                                  onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Read Article
                                </Button>
                                {onResearchNews && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-6 text-[10px] gap-1"
                                    onClick={() => handleResearchClick(item)}
                                  >
                                    <Search className="w-3 h-3" />
                                    Deep Research
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spacer to prevent content from going under the ribbon */}
      <div className={cn("h-10", position === 'bottom' && "order-last")} />

      {/* AI Summary Dialog */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm leading-tight pr-6">
              {summaryItem?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {summaryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Generating AI summary...</span>
              </div>
            ) : summaryData ? (
              <>
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase">Summary</h4>
                  <p className="text-sm leading-relaxed">{summaryData.summary}</p>
                </div>

                {summaryData.keyFacts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">Key Facts</h4>
                    <ul className="space-y-1">
                      {summaryData.keyFacts.map((fact, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summaryData.significance && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">Business Significance</h4>
                    <p className="text-sm text-muted-foreground">{summaryData.significance}</p>
                  </div>
                )}

                {summaryData.suggestions.length > 0 && onResearchNews && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">Research Suggestions</h4>
                    <div className="flex flex-wrap gap-1">
                      {summaryData.suggestions.map((s, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSummaryDialogOpen(false);
                            onResearchNews(s.query);
                          }}
                        >
                          <Search className="w-3 h-3 mr-1" />
                          {s.topic}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => window.open(summaryItem?.url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Article
                  </Button>
                  {onResearchNews && summaryItem && (
                    <Button
                      variant="secondary"
                      onClick={() => handleResearchClick(summaryItem)}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Deep Research
                    </Button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
