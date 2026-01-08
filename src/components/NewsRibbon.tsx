import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Newspaper, Bell, BellOff, ExternalLink, Clock, TrendingUp, AlertCircle, Building2, Globe,
  ChevronDown, ChevronUp, RefreshCw, Sparkles, Handshake, FileText, Rocket, UserPlus,
  Landmark, Gavel, Target, Banknote, PieChart, BarChart3, LineChart, Eye, Users,
  Languages, Settings, Search, X, Loader2, Filter, MapPin, GripVertical, Timer,
  Maximize2, Plus, Link, BookOpen, Briefcase, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNewsMonitor, NewsItem, NewsCategory as NewsCategoryType, NewsRegion, RefreshInterval, COUNTRY_REGULATORS, COUNTRY_EXCHANGES } from '@/hooks/useNewsMonitor';
import { useNewsSourceSettings } from '@/hooks/useNewsSourceSettings';
import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { useNewsDeduplication } from '@/hooks/useNewsDeduplication';
import { useCustomCrawlSources } from '@/components/CustomCrawlSourceSettings';
import { useLanguage, Language } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const FILTER_STORAGE_KEY = 'orkestra_news_filters';
const RIBBON_POSITION_KEY = 'orkestra_ribbon_position';

const categoryIcons: Record<NewsCategoryType, React.ReactNode> = {
  tasi: <TrendingUp className="w-3 h-3" />,
  nomu: <BarChart3 className="w-3 h-3" />,
  listing_approved: <Building2 className="w-3 h-3" />,
  stock_market: <LineChart className="w-3 h-3" />,
  management_change: <UserPlus className="w-3 h-3" />,
  regulator_announcement: <AlertCircle className="w-3 h-3" />,
  regulator_regulation: <BookOpen className="w-3 h-3" />,
  regulator_violation: <Gavel className="w-3 h-3" />,
  shareholder_change: <Users className="w-3 h-3" />,
  macroeconomics: <PieChart className="w-3 h-3" />,
  microeconomics: <BarChart3 className="w-3 h-3" />,
  country_outlook: <Eye className="w-3 h-3" />,
  joint_venture: <Handshake className="w-3 h-3" />,
  merger_acquisition: <Landmark className="w-3 h-3" />,
  expansion_contract: <Briefcase className="w-3 h-3" />,
  general: <Globe className="w-3 h-3" />,
};

const categoryColors: Record<NewsCategoryType, string> = {
  tasi: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  nomu: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  listing_approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  stock_market: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  management_change: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  regulator_announcement: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  regulator_regulation: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  regulator_violation: 'bg-red-500/20 text-red-400 border-red-500/30',
  shareholder_change: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  macroeconomics: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  microeconomics: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  country_outlook: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  joint_venture: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  merger_acquisition: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  expansion_contract: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  general: 'bg-muted text-muted-foreground border-border',
};

// Dynamic labels based on selected country
const getCategoryLabels = (country?: string): Record<NewsCategoryType, string> => {
  const regulator = country ? COUNTRY_REGULATORS[country] : COUNTRY_REGULATORS['Saudi Arabia'];
  const exchange = country ? COUNTRY_EXCHANGES[country] : COUNTRY_EXCHANGES['Saudi Arabia'];
  const regulatorName = regulator?.shortName || 'CMA';
  
  return {
    tasi: country === 'Saudi Arabia' || !country ? 'TASI' : `${exchange?.shortName || 'Main'}`,
    nomu: country === 'Saudi Arabia' || !country ? 'NOMU' : 'Parallel',
    listing_approved: 'Listing',
    stock_market: 'Market',
    management_change: 'Mgmt',
    regulator_announcement: regulatorName,
    regulator_regulation: 'Regulation',
    regulator_violation: 'Violation',
    shareholder_change: 'Shareholder',
    macroeconomics: 'Macro',
    microeconomics: 'Micro',
    country_outlook: 'Outlook',
    joint_venture: 'JV',
    merger_acquisition: 'M&A',
    expansion_contract: 'Expansion',
    general: 'News',
  };
};

export type NewsCategory = NewsCategoryType | 'all';

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
  return { categories: ['all'], countries: ['all'], sources: ['all'], dateFrom: undefined, dateTo: undefined };
};

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
    setFilters({ categories: ['all'], countries: ['all'], sources: ['all'], dateFrom: undefined, dateTo: undefined });
  };

  const hasActiveFilters = 
    !filters.categories.includes('all') || 
    !filters.countries.includes('all') ||
    !filters.sources.includes('all') ||
    filters.dateFrom !== undefined || 
    filters.dateTo !== undefined;

  return { filters, toggleCategory, toggleCountry, toggleSource, setDateRange, clearFilters, hasActiveFilters };
};

interface NewsFilterProps {
  filterState: ReturnType<typeof useNewsFilterState>;
}

export function NewsFilter({ filterState }: NewsFilterProps) {
  const { filters, toggleCategory } = filterState;
  const categoryLabels = getCategoryLabels();
  
  const quickCategories: { key: NewsCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'tasi', label: 'TASI' },
    { key: 'nomu', label: 'NOMU' },
    { key: 'regulator_violation', label: 'Violations' },
    { key: 'management_change', label: 'Mgmt' },
    { key: 'merger_acquisition', label: 'M&A' },
  ];

  return (
    <div className="flex items-center gap-1">
      {quickCategories.map((cat) => (
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
  onPositionChange?: (position: 'top' | 'bottom') => void;
}

export function NewsRibbon({ filterState, onResearchNews, onPositionChange }: NewsRibbonProps) {
  const navigate = useNavigate();
  const {
    news, isMonitoring, isLoading, lastCheck, refreshInterval, secondsUntilRefresh,
    startMonitoring, stopMonitoring, refreshNews, markAsRead, setRefreshInterval, updateFilters,
  } = useNewsMonitor();

  const { isSourceAllowed } = useNewsSourceSettings();
  const { 
    notifyNewItems, settings: notificationSettings, toggleNotifications, 
    toggleCategory: toggleNotificationCategory, toggleSound, permission 
  } = useNewsNotifications();
  const { deduplicateNews, settings: dedupSettings } = useNewsDeduplication();
  const { sources: customCrawlSources, addSource: addCrawlSource, removeSource: removeCrawlSource } = useCustomCrawlSources();
  const [newCrawlUrl, setNewCrawlUrl] = useState('');
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  ];

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

  // Get country for dynamic labels
  const selectedCountry = filters.countries.find(c => c !== 'all') || 'Saudi Arabia';
  const categoryLabels = getCategoryLabels(selectedCountry);

  const togglePosition = () => {
    const newPosition = position === 'top' ? 'bottom' : 'top';
    setPosition(newPosition);
    onPositionChange?.(newPosition);
    try {
      localStorage.setItem(RIBBON_POSITION_KEY, newPosition);
    } catch {}
  };

  useEffect(() => {
    onPositionChange?.(position);
  }, []);

  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  useEffect(() => {
    updateFilters({
      categories: filters.categories.filter(c => c !== 'all'),
      countries: filters.countries.filter(c => c !== 'all'),
      sources: filters.sources.filter(s => s !== 'all'),
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  }, [filters.categories, filters.countries, filters.sources, filters.dateFrom, filters.dateTo, updateFilters]);

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

  // Filter news and apply deduplication
  const filteredNews = useMemo(() => {
    let filtered = news.filter(item => {
      if (!isSourceAllowed(item.source)) return false;
      if (!filters.categories.includes('all') && !filters.categories.includes(item.category)) return false;
      if (!filters.countries.includes('all')) {
        if (!item.country || !filters.countries.includes(item.country)) return false;
      }
      if (!filters.sources.includes('all')) {
        const sourceMatch = filters.sources.some(s => item.source.toLowerCase().includes(s.toLowerCase()));
        if (!sourceMatch) return false;
      }
      if (filters.dateFrom && isBefore(item.timestamp, startOfDay(filters.dateFrom))) return false;
      if (filters.dateTo && isAfter(item.timestamp, endOfDay(filters.dateTo))) return false;
      return true;
    });

    // Apply AI deduplication
    return deduplicateNews(filtered);
  }, [news, filters, isSourceAllowed, deduplicateNews]);

  const newItemsCount = filteredNews.filter(n => n.isNew).length;

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const fetchSummary = async (item: NewsItem) => {
    setSummaryItem(item);
    setSummaryDialogOpen(true);
    setSummaryLoading(true);
    setSummaryData(null);
    markAsRead(item.id);

    try {
      const { data, error } = await supabase.functions.invoke('summarize-news', {
        body: { title: item.title, url: item.url, snippet: item.snippet, source: item.source },
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
        summary: item.snippet || 'Unable to generate summary.',
        keyFacts: [],
        significance: '',
        suggestions: [],
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleResearch = (query: string) => {
    if (onResearchNews) {
      onResearchNews(query);
    } else {
      navigate('/?search=' + encodeURIComponent(query));
    }
    setSummaryDialogOpen(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "fixed left-0 right-0 z-40 ml-16",
          position === 'top' ? 'top-0' : 'bottom-0'
        )}
      >
        {/* Collapsed ribbon */}
        <div className="bg-card/95 backdrop-blur-md border-b shadow-lg">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={togglePosition} className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Drag to reposition</TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">News</span>
                {newItemsCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5">
                    {newItemsCount}
                  </Badge>
                )}
              </div>

              {/* Quick filters */}
              <div className="hidden md:flex items-center gap-1 ml-4">
                {(['all', 'tasi', 'nomu', 'regulator_violation', 'management_change', 'merger_acquisition'] as NewsCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded-full transition-all flex items-center gap-1",
                      filters.categories.includes(cat)
                        ? cat === 'all' ? "bg-primary text-primary-foreground" : categoryColors[cat as NewsCategoryType]
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {cat !== 'all' && categoryIcons[cat as NewsCategoryType]}
                    {cat === 'all' ? 'All' : categoryLabels[cat as NewsCategoryType]}
                  </button>
                ))}
              </div>

              {/* Country filter */}
              <Select 
                value={filters.countries[0] || 'all'} 
                onValueChange={(val) => toggleCountry(val)}
              >
                <SelectTrigger className="w-32 h-7 text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-1">
                        <span>{c.flag}</span>
                        <span>{c.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {/* Timer */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer className="w-3 h-3" />
                    <span>{Math.floor(secondsUntilRefresh / 60)}:{(secondsUntilRefresh % 60).toString().padStart(2, '0')}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Next refresh in {Math.floor(secondsUntilRefresh / 60)}m {secondsUntilRefresh % 60}s</TooltipContent>
              </Tooltip>

              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refreshNews} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>

              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/news')}>
                <Maximize2 className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Scrolling news ticker */}
          <AnimatePresence>
            {!isExpanded && filteredNews.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t"
              >
                <div className="flex overflow-x-auto gap-4 px-4 py-2 scrollbar-hide">
                  {filteredNews.slice(0, 10).map(item => (
                    <button
                      key={item.id}
                      onClick={() => fetchSummary(item)}
                      className={cn(
                        "flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:border-primary/50",
                        item.isNew ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
                      )}
                    >
                      <Badge variant="outline" className={cn("text-[9px] px-1", categoryColors[item.category])}>
                        {categoryIcons[item.category]}
                      </Badge>
                      <span className="text-xs font-medium max-w-[200px] truncate">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTimeAgo(item.timestamp)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded view */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t max-h-[50vh] overflow-y-auto"
              >
                {/* All category chips */}
                <div className="flex flex-wrap gap-1 px-4 py-2 border-b bg-muted/20">
                  <span className="text-xs text-muted-foreground mr-2">Categories:</span>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleCategory(key as NewsCategory)}
                      className={cn(
                        "px-2 py-0.5 text-[10px] rounded-full border transition-all flex items-center gap-1",
                        filters.categories.includes(key as NewsCategory)
                          ? categoryColors[key as NewsCategoryType]
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {categoryIcons[key as NewsCategoryType]}
                      {label}
                    </button>
                  ))}
                </div>

                {/* News list */}
                <div className="divide-y">
                  {filteredNews.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No news matching filters</p>
                    </div>
                  ) : (
                    filteredNews.slice(0, 20).map(item => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 hover:bg-muted/30 cursor-pointer transition-all",
                          item.isNew && "bg-primary/5"
                        )}
                        onClick={() => fetchSummary(item)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={cn("text-[9px]", categoryColors[item.category])}>
                                {categoryIcons[item.category]}
                                <span className="ml-1">{categoryLabels[item.category]}</span>
                              </Badge>
                              {item.country && (
                                <Badge variant="outline" className="text-[9px]">
                                  <MapPin className="w-2 h-2 mr-0.5" />
                                  {item.country}
                                </Badge>
                              )}
                              {item.isNew && (
                                <Badge className="bg-primary text-[9px]">NEW</Badge>
                              )}
                            </div>
                            <h4 className="text-sm font-medium line-clamp-1">{item.title}</h4>
                            {item.snippet && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.snippet}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" />
                                {item.source}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTimeAgo(item.timestamp)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(item.url, '_blank');
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {filteredNews.length > 20 && (
                  <div className="p-2 text-center border-t">
                    <Button variant="link" size="sm" onClick={() => navigate('/news')}>
                      View all {filteredNews.length} news items
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Summary Dialog */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold pr-8">
              {summaryItem?.title}
            </DialogTitle>
          </DialogHeader>
          
          {summaryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3">Analyzing article...</span>
            </div>
          ) : summaryData ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground">{summaryData.summary}</p>
              </div>
              
              {summaryData.keyFacts.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Key Facts</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {summaryData.keyFacts.map((fact, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{fact}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {summaryData.significance && (
                <div>
                  <h4 className="font-medium mb-2">Significance</h4>
                  <p className="text-sm text-muted-foreground">{summaryData.significance}</p>
                </div>
              )}
              
              {summaryData.suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Research Further</h4>
                  <div className="flex flex-wrap gap-2">
                    {summaryData.suggestions.map((sug, i) => (
                      <Button key={i} variant="outline" size="sm" onClick={() => handleResearch(sug.query)}>
                        {sug.topic}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => window.open(summaryItem?.url, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Read Full Article
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NewsRibbon;
