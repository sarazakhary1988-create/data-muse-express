import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Globe, 
  ChevronDown,
  BarChart3,
  Keyboard,
  Newspaper,
  Sparkles,
  RefreshCw,
  Settings,
  Bell,
  BellOff,
  Maximize2,
  TrendingUp,
  AlertCircle,
  Landmark,
  Gavel,
  UserPlus,
  Handshake,
  Building2,
  LineChart,
  PieChart,
  Eye,
  Users,
  BookOpen,
  Briefcase,
  MapPin,
  Timer,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage, Language } from '@/lib/i18n/LanguageContext';
import { useResearchStore } from '@/store/researchStore';
import { useNewsMonitor, NewsCategory as NewsCategoryType, RefreshInterval } from '@/hooks/useNewsMonitor';
import { useNewsSourceSettings } from '@/hooks/useNewsSourceSettings';
import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { useNewsDeduplication } from '@/hooks/useNewsDeduplication';
import { NewsSourceSettings } from '@/components/NewsSourceSettings';
import { cn } from '@/lib/utils';

// Category config
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

const categoryLabels: Record<NewsCategoryType, string> = {
  tasi: 'TASI',
  nomu: 'NOMU',
  listing_approved: 'IPO',
  stock_market: 'Market',
  management_change: 'Mgmt',
  regulator_announcement: 'CMA',
  regulator_regulation: 'Regulation',
  regulator_violation: 'Violation',
  shareholder_change: 'Shareholder',
  macroeconomics: 'Macro',
  microeconomics: 'Micro',
  country_outlook: 'Vision 2030',
  joint_venture: 'JV',
  merger_acquisition: 'M&A',
  expansion_contract: 'Contracts',
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

interface TopNavigationProps {
  className?: string;
}

export const TopNavigation = ({ className }: TopNavigationProps) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { tasks, reports } = useResearchStore();
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Filter states (stored in settings)
  const [selectedCategories, setSelectedCategories] = useState<NewsCategoryType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');

  // News hooks
  const { news, isLoading, secondsUntilRefresh, refreshInterval, refreshNews, setRefreshInterval, startMonitoring, stopMonitoring } = useNewsMonitor();
  const { isSourceAllowed } = useNewsSourceSettings();
  const { notifyNewItems, settings: notificationSettings, toggleNotifications } = useNewsNotifications();
  const { deduplicateNews } = useNewsDeduplication();

  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  // Filter and deduplicate news
  const filteredNews = useMemo(() => {
    let filtered = news.filter(item => {
      if (!isSourceAllowed(item.source)) return false;
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) return false;
      // Country filter
      if (selectedCountry !== 'all' && item.country !== selectedCountry) return false;
      // Source filter
      if (selectedSource !== 'all') {
        const sourceMatch = item.source.toLowerCase().includes(selectedSource.toLowerCase());
        if (!sourceMatch) return false;
      }
      return true;
    });
    return deduplicateNews(filtered);
  }, [news, selectedCategories, selectedCountry, selectedSource, isSourceAllowed, deduplicateNews]);

  const newItemsCount = filteredNews.filter(n => n.isNew).length;

  const toggleCategory = (category: NewsCategoryType) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const themeOptions = [
    { value: 'light', label: t.common.light, icon: Sun },
    { value: 'dark', label: t.common.dark, icon: Moon },
    { value: 'system', label: t.common.system, icon: Monitor },
  ];

  const languages: { code: Language; label: string; nativeLabel: string }[] = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  ];

  const currentLang = languages.find(l => l.code === language);
  const totalQueries = tasks.length;
  const totalReports = reports.length;

  const shortcuts = [
    { keys: ['/', 'Ctrl+K'], description: t.help.focusSearch },
    { keys: ['?'], description: t.help.showShortcuts },
    { keys: ['Esc'], description: t.help.escToClose },
    { keys: ['Ctrl+Enter'], description: t.search.startResearch },
    { keys: ['H'], description: t.help.goToHistory },
    { keys: ['N'], description: t.help.newResearch },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowKeyboardShortcuts(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const openNewsUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedCountry !== 'all' || selectedSource !== 'all';

  return (
    <>
      <header 
        className={cn(
          "border-b border-border/40 bg-background/95 backdrop-blur-xl sticky top-0 z-40",
          className
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Main navigation row */}
        <div className="h-14 flex items-center justify-between px-4 md:px-6">
          {/* Left: Breadcrumb / Title */}
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <span className="text-sm font-medium text-muted-foreground">
              {t.common.home}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-semibold">{t.common.researchEngine}</span>
          </div>

          {/* Right: Stats + Controls */}
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            {/* Research Stats Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50",
                isRTL && "flex-row-reverse"
              )}
            >
              <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium">{totalQueries}</span>
                <span className="text-[10px] text-muted-foreground">{t.common.queries}</span>
              </div>
              <div className="w-px h-4 bg-border/50" />
              <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                <span className="text-xs font-medium">{totalReports}</span>
                <span className="text-[10px] text-muted-foreground">{t.common.reports}</span>
              </div>
            </motion.div>

            {/* Keyboard Shortcuts Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyboardShortcuts(true)}
              className={cn(
                "hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground",
                isRTL && "flex-row-reverse"
              )}
            >
              <Keyboard className="w-4 h-4" />
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd>
            </Button>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={cn("gap-1.5", isRTL && "flex-row-reverse")}>
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">{currentLang?.nativeLabel}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-36">
                <DropdownMenuLabel className="text-xs">{t.common.language}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={cn(
                      "flex items-center justify-between cursor-pointer",
                      language === lang.code && "bg-primary/10 text-primary"
                    )}
                  >
                    <span>{lang.nativeLabel}</span>
                    {language === lang.code && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-primary"
                      />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={theme}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      {theme === 'dark' ? (
                        <Moon className="w-4 h-4" />
                      ) : theme === 'light' ? (
                        <Sun className="w-4 h-4" />
                      ) : (
                        <Monitor className="w-4 h-4" />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-36">
                <DropdownMenuLabel className="text-xs">{t.common.theme}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {themeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      theme === option.value && "bg-primary/10 text-primary"
                    )}
                  >
                    <option.icon className="w-4 h-4" />
                    <span>{option.label}</span>
                    {theme === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn("w-2 h-2 rounded-full bg-primary", isRTL ? "mr-auto" : "ml-auto")}
                      />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* News Ticker Row - Auto-scrolling marquee */}
        <div className="h-9 border-t border-border/30 bg-muted/20 flex items-center overflow-hidden">
          {/* Left: LIVE indicator */}
          <div className="flex items-center gap-2 px-3 shrink-0 border-r border-border/30">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary">LIVE</span>
              {newItemsCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-[9px] px-1 py-0 h-4 min-w-4">
                  {newItemsCount}
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {Math.floor(secondsUntilRefresh / 60)}:{(secondsUntilRefresh % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Center: Auto-scrolling ticker */}
          <div 
            className="flex-1 overflow-hidden relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <motion.div
              ref={tickerRef}
              className="flex items-center gap-6 whitespace-nowrap"
              animate={{
                x: isPaused ? 0 : [0, -50 * Math.max(filteredNews.length, 1) + '%'],
              }}
              transition={{
                x: {
                  duration: Math.max(filteredNews.length * 8, 30),
                  ease: "linear",
                  repeat: Infinity,
                },
              }}
              style={{ willChange: 'transform' }}
            >
              {/* Double the items for seamless loop */}
              {[...filteredNews, ...filteredNews].slice(0, 30).map((item, idx) => (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => openNewsUrl(item.url)}
                  className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity group"
                >
                  {/* Category badge */}
                  {['merger_acquisition', 'joint_venture', 'country_outlook', 'regulator_violation', 'listing_approved', 'regulator_announcement'].includes(item.category) && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-5 shrink-0",
                        categoryColors[item.category]
                      )}
                    >
                      {categoryLabels[item.category]}
                    </Badge>
                  )}
                  
                  {/* Title */}
                  <span className="text-xs font-medium max-w-[300px] truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  
                  {/* Source + Time */}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {item.source.split('.')[0].substring(0, 12)} · {formatTimeAgo(item.timestamp)}
                  </span>
                </button>
              ))}
              
              {filteredNews.length === 0 && (
                <span className="text-xs text-muted-foreground px-4">No news available</span>
              )}
            </motion.div>
          </div>

          {/* Right: Action icons */}
          <div className="flex items-center gap-0.5 px-2 shrink-0 border-l border-border/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refreshNews} disabled={isLoading}>
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh news</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/news')}>
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Full news view</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => toggleNotifications(!notificationSettings.enabled)}
                >
                  {notificationSettings.enabled ? (
                    <Bell className="w-3.5 h-3.5" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{notificationSettings.enabled ? 'Disable' : 'Enable'} notifications</TooltipContent>
            </Tooltip>

            {/* Settings Sheet */}
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-7 w-7", hasActiveFilters && "text-primary")}>
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5" />
                    News Settings
                  </SheetTitle>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Category Filters */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Categories
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => toggleCategory(key as NewsCategoryType)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1",
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
                    {selectedCategories.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedCategories([])}
                        className="text-xs text-muted-foreground"
                      >
                        Clear categories
                      </Button>
                    )}
                  </div>

                  {/* Country Filter */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Country
                    </Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              <span>{c.flag}</span>
                              <span>{c.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Source Filter */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Source
                    </Label>
                    <Select value={selectedSource} onValueChange={setSelectedSource}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Refresh Interval */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      Refresh Interval
                    </Label>
                    <Select 
                      value={String(refreshInterval)} 
                      onValueChange={(val) => setRefreshInterval(Number(val) as RefreshInterval)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Every 1 minute</SelectItem>
                        <SelectItem value="5">Every 5 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Language</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={language === 'en' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLanguage('en')}
                        className="gap-2"
                      >
                        <span>🇺🇸</span>
                        <span>English</span>
                      </Button>
                      <Button
                        variant={language === 'ar' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLanguage('ar')}
                        className="gap-2"
                      >
                        <span>🇸🇦</span>
                        <span>العربية</span>
                      </Button>
                    </div>
                  </div>

                  {/* Source Settings & AI Deduplication */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Source Settings & AI Deduplication</Label>
                    <NewsSourceSettings />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Keyboard className="w-5 h-5" />
              {t.common.keyboardShortcuts}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? 'استخدم هذه الاختصارات للتنقل بشكل أسرع' : 'Use these shortcuts to navigate faster'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {shortcuts.map((shortcut, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg bg-muted/50",
                  isRTL && "flex-row-reverse"
                )}
              >
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                  {shortcut.keys.map((key, i) => (
                    <span key={i} className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                      {i > 0 && <span className="text-xs text-muted-foreground mx-1">{isRTL ? 'أو' : 'or'}</span>}
                      <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
