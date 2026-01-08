import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';
import {
  Newspaper, Clock, ExternalLink, Search, Filter, Calendar, Globe, MapPin,
  RefreshCw, ArrowLeft, Loader2, Building2, TrendingUp, AlertCircle, Rocket,
  FileText, Handshake, Landmark, UserPlus, Gavel, Target, Banknote, Home, Cpu, X
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
import { useNewsMonitor, NewsItem, NewsCategory as NewsCategoryType } from '@/hooks/useNewsMonitor';
import { useNewsFilterState } from '@/components/NewsRibbon';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const categoryIcons: Record<NewsCategoryType, React.ReactNode> = {
  ipo: <Building2 className="w-4 h-4" />,
  market: <TrendingUp className="w-4 h-4" />,
  regulatory: <AlertCircle className="w-4 h-4" />,
  expansion: <Rocket className="w-4 h-4" />,
  contract: <FileText className="w-4 h-4" />,
  joint_venture: <Handshake className="w-4 h-4" />,
  acquisition: <Landmark className="w-4 h-4" />,
  appointment: <UserPlus className="w-4 h-4" />,
  cma_violation: <Gavel className="w-4 h-4" />,
  vision_2030: <Target className="w-4 h-4" />,
  banking: <Banknote className="w-4 h-4" />,
  real_estate: <Home className="w-4 h-4" />,
  tech_funding: <Cpu className="w-4 h-4" />,
  general: <Globe className="w-4 h-4" />,
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

  // Auto-start monitoring
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  // Filtered news
  const filteredNews = useMemo(() => {
    return news.filter(item => {
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
  }, [news, searchQuery, selectedCategories, selectedCountry, dateFrom, dateTo]);

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
                      GCC Business News
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
                      <div className="flex items-start gap-4">
                        {/* Category icon */}
                        <div className={cn(
                          "p-2.5 rounded-lg shrink-0",
                          categoryColors[item.category].replace('text-', 'bg-').replace(/\/20|\/30/g, '/10')
                        )}>
                          {categoryIcons[item.category]}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className={cn(
                                "text-base font-medium leading-tight",
                                item.isNew && "text-foreground"
                              )}>
                                {item.title}
                              </h3>
                              {item.snippet && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {item.snippet}
                                </p>
                              )}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn("shrink-0", categoryColors[item.category])}
                            >
                              {categoryLabels[item.category]}
                            </Badge>
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {item.source}
                            </span>
                            {item.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.country}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(item.timestamp)}
                            </span>
                            {item.isOfficial && (
                              <Badge variant="outline" className="h-4 text-[10px] border-green-500/30 text-green-500">
                                Official
                              </Badge>
                            )}
                          </div>

                          {/* Companies */}
                          {item.companies && item.companies.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              {item.companies.map((company, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">
                                  {company}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </main>
        </div>
      </div>

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

                {summaryData.suggestions.length > 0 && (
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
                            handleResearch(s.query);
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
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSummaryDialogOpen(false);
                      if (summaryItem) handleResearch(summaryItem.title);
                    }}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Deep Research
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default News;
