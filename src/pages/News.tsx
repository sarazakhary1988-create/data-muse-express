import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import {
  Newspaper, Clock, ExternalLink, Search, Filter, Calendar, Globe, MapPin,
  RefreshCw, ArrowLeft, Loader2, Building2, TrendingUp, AlertCircle, Rocket,
  FileText, Handshake, Landmark, UserPlus, Gavel, Target, Banknote, PieChart, X,
  BarChart3, LineChart, Eye, Users, Scale, BookOpen, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Sidebar } from '@/components/Sidebar';
import { TopNavigation } from '@/components/TopNavigation';
import { useNewsMonitor, NewsItem, NewsCategory as NewsCategoryType, COUNTRY_REGULATORS, COUNTRY_EXCHANGES } from '@/hooks/useNewsMonitor';
import { useNewsFilterState } from '@/components/NewsRibbon';
import { useNewsDeduplication } from '@/hooks/useNewsDeduplication';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const categoryIcons: Record<NewsCategoryType, React.ReactNode> = {
  tasi: <TrendingUp className="w-4 h-4" />,
  nomu: <BarChart3 className="w-4 h-4" />,
  listing_approved: <Building2 className="w-4 h-4" />,
  stock_market: <LineChart className="w-4 h-4" />,
  management_change: <UserPlus className="w-4 h-4" />,
  regulator_announcement: <AlertCircle className="w-4 h-4" />,
  regulator_regulation: <BookOpen className="w-4 h-4" />,
  regulator_violation: <Gavel className="w-4 h-4" />,
  shareholder_change: <Users className="w-4 h-4" />,
  macroeconomics: <PieChart className="w-4 h-4" />,
  microeconomics: <BarChart3 className="w-4 h-4" />,
  country_outlook: <Eye className="w-4 h-4" />,
  joint_venture: <Handshake className="w-4 h-4" />,
  merger_acquisition: <Landmark className="w-4 h-4" />,
  expansion_contract: <Briefcase className="w-4 h-4" />,
  general: <Globe className="w-4 h-4" />,
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
    tasi: country === 'Saudi Arabia' || !country ? 'TASI' : `${exchange?.shortName || 'Main'} Index`,
    nomu: country === 'Saudi Arabia' || !country ? 'NOMU' : 'Parallel Market',
    listing_approved: 'Approved Listing',
    stock_market: country === 'Saudi Arabia' || !country ? 'Saudi Market' : `${country} Market`,
    management_change: 'Mgmt Changes',
    regulator_announcement: `${regulatorName} News`,
    regulator_regulation: `${regulatorName} Regulation`,
    regulator_violation: `${regulatorName} Violation`,
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

interface NewsSummary {
  summary: string;
  keyFacts: string[];
  significance: string;
  suggestions: { topic: string; query: string }[];
}

const News = () => {
  const navigate = useNavigate();
  const newsFilterState = useNewsFilterState();
  const {
    news,
    isMonitoring,
    isLoading,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    refreshNews,
    markAsRead,
  } = useNewsMonitor();
  
  const { deduplicateNews, settings: dedupSettings } = useNewsDeduplication();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<NewsCategoryType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Summary dialog
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryItem, setSummaryItem] = useState<NewsItem | null>(null);
  const [summaryData, setSummaryData] = useState<NewsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Get dynamic labels based on selected country
  const categoryLabels = useMemo(() => 
    getCategoryLabels(selectedCountry === 'all' ? undefined : selectedCountry),
    [selectedCountry]
  );

  // Auto-start monitoring
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  // Filtered news with deduplication
  const filteredNews = useMemo(() => {
    const filtered = news.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          item.title.toLowerCase().includes(query) ||
          item.source.toLowerCase().includes(query) ||
          (item.snippet?.toLowerCase().includes(query)) ||
          (item.companies?.some(c => c.toLowerCase().includes(query)));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
        return false;
      }

      // Country filter
      if (selectedCountry !== 'all') {
        if (!item.country || item.country !== selectedCountry) return false;
      }

      // Date filter
      if (dateFrom || dateTo) {
        const itemDate = new Date(item.timestamp);
        if (dateFrom && itemDate < startOfDay(dateFrom)) return false;
        if (dateTo && itemDate > endOfDay(dateTo)) return false;
      }

      return true;
    });

    // Apply AI deduplication
    return deduplicateNews(filtered);
  }, [news, searchQuery, selectedCategories, selectedCountry, dateFrom, dateTo, deduplicateNews]);

  const toggleCategory = (category: NewsCategoryType) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedCountry('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || selectedCategories.length > 0 || 
    selectedCountry !== 'all' || dateFrom || dateTo;

  // Fetch AI summary
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
    navigate('/?search=' + encodeURIComponent(query));
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return format(date, 'MMM d, yyyy');
  };

  return (
    <>
      <Helmet>
        <title>News Feed - ORKESTRA</title>
        <meta name="description" content="Real-time GCC business news and market intelligence" />
      </Helmet>

      <div className="flex min-h-screen bg-background">
        <AnimatedBackground />
        <Sidebar activeView="search" onViewChange={() => navigate('/')} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNavigation newsFilterState={newsFilterState} />

          <main className="flex-1 overflow-auto p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                      <Newspaper className="w-6 h-6 text-primary" />
                      {selectedCountry === 'all' ? 'GCC' : selectedCountry} Business News
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Real-time market intelligence from verified sources
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lastCheck && (
                    <span className="text-xs text-muted-foreground">
                      Updated {formatTimeAgo(lastCheck)}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshNews}
                    disabled={isLoading}
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg border p-4 space-y-4">
                {/* Search */}
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search news by title, source, company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Country dropdown */}
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-48">
                      <MapPin className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date range */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-48">
                        <Calendar className="w-4 h-4 mr-2" />
                        {dateFrom ? format(dateFrom, 'MMM d') : 'From'} 
                        {' - '}
                        {dateTo ? format(dateTo, 'MMM d') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="end">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium mb-2">From Date</p>
                          <CalendarUI
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            initialFocus
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-2">To Date</p>
                          <CalendarUI
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setDateFrom(subDays(new Date(), 7));
                              setDateTo(new Date());
                            }}
                          >
                            Last 7 days
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setDateFrom(startOfDay(new Date()));
                              setDateTo(endOfDay(new Date()));
                            }}
                          >
                            Today
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Category filter chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground flex items-center mr-2">
                    <Filter className="w-3 h-3 mr-1" /> Categories:
                  </span>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleCategory(key as NewsCategoryType)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1.5",
                        selectedCategories.includes(key as NewsCategoryType)
                          ? categoryColors[key as NewsCategoryType]
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {categoryIcons[key as NewsCategoryType]}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {filteredNews.length} news items
                  {hasActiveFilters && ` (filtered from ${news.length})`}
                </span>
              </div>

              {/* News Grid */}
              <div className="grid gap-4">
                {filteredNews.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No news matching your filters</p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters} className="mt-2">
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredNews.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "bg-card/50 backdrop-blur-sm rounded-lg border p-4 hover:border-primary/30 transition-all cursor-pointer",
                        item.isNew && "ring-1 ring-primary/30"
                      )}
                      onClick={() => fetchSummary(item)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px]", categoryColors[item.category])}
                            >
                              {categoryIcons[item.category]}
                              <span className="ml-1">{categoryLabels[item.category]}</span>
                            </Badge>
                            {item.country && (
                              <Badge variant="outline" className="text-[10px]">
                                <MapPin className="w-3 h-3 mr-1" />
                                {item.country}
                              </Badge>
                            )}
                            {item.isNew && (
                              <Badge className="bg-primary text-primary-foreground text-[10px]">
                                NEW
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="font-medium text-sm mb-1 line-clamp-2">
                            {item.title}
                          </h3>
                          
                          {item.snippet && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {item.snippet}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {item.source}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(item.timestamp)}
                            </span>
                            {item.companies && item.companies.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {item.companies.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.url, '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </main>
        </div>
      </div>

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
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSummaryDialogOpen(false);
                          handleResearch(sug.query);
                        }}
                      >
                        {sug.topic}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(summaryItem?.url, '_blank')}
                >
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
};

export default News;
