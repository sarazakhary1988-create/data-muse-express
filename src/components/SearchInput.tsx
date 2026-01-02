import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Globe, ArrowRight, Loader2, Link, FileSearch, Shield, ShieldCheck, FileText, Table, FileBarChart, Zap, Clock, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResearchStore, REPORT_FORMAT_OPTIONS, ReportFormat } from '@/store/researchStore';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SourceManager } from '@/components/SourceManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeFrameFilter, formatTimeFrameForQuery } from '@/components/TimeFrameFilter';
import { PromptEnhancer } from '@/components/PromptEnhancer';
import { CountryFilter, formatCountryForQuery } from '@/components/CountryFilter';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface SearchInputProps {
  onSearch: (query: string) => void;
  onScrapeUrl?: (url: string) => void;
}

const exampleQueries = [
  { text: "Latest AI research papers on transformer architectures", icon: Sparkles },
  { text: "Compare top 10 cloud providers pricing 2024", icon: Table },
  { text: "Renewable energy trends and market analysis", icon: Globe },
  { text: "Comprehensive guide to modern web development", icon: FileText },
];

const isUrl = (text: string): boolean => {
  const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
  return urlPattern.test(text.trim());
};

export const SearchInput = ({ onSearch, onScrapeUrl }: SearchInputProps) => {
  const { t, isRTL } = useLanguage();
  const { 
    searchQuery, 
    setSearchQuery, 
    isSearching, 
    deepVerifyMode, 
    setDeepVerifyMode, 
    reportFormat, 
    setReportFormat,
    timeFrameFilter,
    setTimeFrameFilter,
    countryFilter,
    setCountryFilter
  } = useResearchStore();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [customDomains, setCustomDomains] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const detectedUrl = isUrl(searchQuery);
  const charCount = searchQuery.length;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [searchQuery]);

  const handleSubmit = () => {
    if (searchQuery.trim() && !isSearching) {
      const timeContext = formatTimeFrameForQuery(timeFrameFilter);
      const countryContext = formatCountryForQuery(countryFilter);
      
      // Add domain constraints if specified
      let domainContext = '';
      if (customDomains.trim()) {
        const domains = customDomains.split(',').map(d => d.trim()).filter(Boolean);
        if (domains.length > 0) {
          domainContext = `site:${domains.join(' OR site:')}`;
        }
      }
      
      const contextParts = [searchQuery.trim(), timeContext, countryContext, domainContext].filter(Boolean);
      const fullQuery = contextParts.join(' ');
      
      console.log('[SearchInput] Full query with domain constraints:', fullQuery);
      onSearch(fullQuery);
      setShowSuggestions(false);
    }
  };

  const handleScrape = () => {
    if (searchQuery.trim() && !isSearching && onScrapeUrl) {
      onScrapeUrl(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleEnhancedQuery = (enhancedQuery: string) => {
    setSearchQuery(enhancedQuery);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <motion.div
        className={`relative rounded-2xl transition-all duration-500 ${
          isFocused 
            ? 'shadow-2xl shadow-primary/30' 
            : 'shadow-xl shadow-background/50'
        }`}
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Animated gradient border */}
        <motion.div
          className="absolute -inset-[1px] rounded-2xl opacity-0 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.5), hsl(var(--primary)))',
            backgroundSize: '200% 200%',
          }}
          animate={{
            opacity: isFocused ? 1 : 0,
            backgroundPosition: isFocused ? ['0% 0%', '100% 100%', '0% 0%'] : '0% 0%',
          }}
          transition={{
            opacity: { duration: 0.3 },
            backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" }
          }}
        />
        
        <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
          {/* Ambient glow effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: isFocused 
                ? 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.1) 0%, transparent 50%)'
                : 'transparent'
            }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Top bar with icon */}
          <div className="relative flex items-center gap-3 px-5 pt-4 pb-2">
            <motion.div
              className="relative"
              animate={{ 
                rotate: isSearching ? 360 : 0,
                scale: isFocused ? 1.1 : 1
              }}
              transition={{ 
                rotate: { duration: 2, repeat: isSearching ? Infinity : 0, ease: "linear" },
                scale: { type: "spring", stiffness: 300 }
              }}
            >
              {/* Pulse ring behind icon */}
              <AnimatePresence>
                {isFocused && !isSearching && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/30"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </AnimatePresence>
              
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-primary" />
              ) : detectedUrl ? (
                <Link className="w-5 h-5 text-primary" />
              ) : (
                <Globe className="w-5 h-5 text-primary" />
              )}
            </motion.div>
            
            <motion.span 
              className="text-sm text-muted-foreground font-medium"
              animate={{ opacity: isSearching ? 0.7 : 1 }}
            >
            {isSearching ? (
                <span className="flex items-center gap-2">
                  {t.search.searchingWeb}
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ...
                  </motion.span>
                </span>
              ) : detectedUrl ? (
                t.search.urlDetected
              ) : (
                t.search.whatToResearch
              )}
            </motion.span>
            
            <AnimatePresence mode="wait">
              {detectedUrl && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                    <Link className="w-3 h-3 mr-1" />
                    URL
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Character count */}
            <AnimatePresence>
              {charCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 0.5, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="ml-auto text-xs text-muted-foreground"
                >
                  {charCount} {t.search.chars}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea with animated placeholder */}
          <div className="relative px-5 py-3">
            <textarea
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                setShowSuggestions(true);
              }}
              onBlur={() => {
                setIsFocused(false);
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.search.placeholder}
              className="w-full bg-transparent text-foreground text-lg placeholder:text-muted-foreground/50 focus:outline-none resize-none min-h-[60px] max-h-[200px] scrollbar-thin"
              disabled={isSearching}
              rows={1}
            />
            
            {/* Typing indicator dots */}
            <AnimatePresence>
              {isFocused && charCount === 0 && (
                <motion.div
                  className="absolute left-5 top-1/2 -translate-y-1/2 flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  exit={{ opacity: 0 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Filters Section */}
          <motion.div
            className="px-5 pb-2"
            initial={false}
          >
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
              whileHover={{ x: 2 }}
            >
              <motion.div
                animate={{ rotate: showFilters ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
              <span>{t.search.researchFilters}</span>
              <AnimatePresence>
                {(timeFrameFilter.type !== 'all' || countryFilter !== 'any') && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {t.common.active}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 flex-wrap pt-3 pb-1">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <TimeFrameFilter 
                        value={timeFrameFilter} 
                        onChange={setTimeFrameFilter} 
                      />
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <CountryFilter
                        value={countryFilter}
                        onChange={setCountryFilter}
                      />
                    </motion.div>
                    
                    {/* Custom Domain Filter */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 }}
                      className="flex items-center gap-1.5"
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                              <input
                                type="text"
                                value={customDomains}
                                onChange={(e) => setCustomDomains(e.target.value)}
                                placeholder="Restrict to domains..."
                                className="h-7 w-[160px] text-xs border border-muted bg-background/50 hover:bg-background transition-colors rounded-md px-2 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium">Domain Filter</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Comma-separated domains to restrict search (e.g., microsoft.com, sec.gov)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Select value={reportFormat} onValueChange={(value: ReportFormat) => setReportFormat(value)}>
                                <SelectTrigger className="h-7 w-[130px] text-xs border-muted bg-background/50 hover:bg-background transition-colors">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {REPORT_FORMAT_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value} className="text-xs">
                                      <div className="flex items-center gap-2">
                                        {option.value === 'detailed' && <FileText className="w-3 h-3" />}
                                        {option.value === 'executive' && <FileBarChart className="w-3 h-3" />}
                                        {option.value === 'table' && <Table className="w-3 h-3" />}
                                        {option.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium">Report Format</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {REPORT_FORMAT_OPTIONS.find(o => o.value === reportFormat)?.description}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-border/50 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* AI Enhance Button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <PromptEnhancer 
                  query={searchQuery} 
                  onEnhanced={handleEnhancedQuery}
                  disabled={isSearching}
                  timeContext={formatTimeFrameForQuery(timeFrameFilter)}
                />
              </motion.div>
              
              {/* Deep Verify Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        deepVerifyMode 
                          ? 'bg-emerald-500/10 border border-emerald-500/30' 
                          : 'bg-muted/50 border border-transparent hover:border-border'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setDeepVerifyMode(!deepVerifyMode)}
                    >
                      <Switch
                        id="deep-verify"
                        checked={deepVerifyMode}
                        onCheckedChange={setDeepVerifyMode}
                        className="data-[state=checked]:bg-emerald-500 scale-90"
                      />
                      <label 
                        htmlFor="deep-verify" 
                        className={`text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                          deepVerifyMode ? 'text-emerald-500' : 'text-muted-foreground'
                        }`}
                      >
                        <motion.div
                          animate={{ 
                            rotate: deepVerifyMode ? [0, -10, 10, -10, 0] : 0,
                            scale: deepVerifyMode ? [1, 1.2, 1] : 1
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          {deepVerifyMode ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Shield className="w-3.5 h-3.5" />
                          )}
                        </motion.div>
                        <span className="hidden sm:inline">{t.search.deepVerify}</span>
                      </label>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">{t.search.deepVerify}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.search.deepVerifyDesc}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Source Manager - always show when deep verify is enabled */}
              <AnimatePresence>
                {deepVerifyMode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <SourceManager />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {detectedUrl && onScrapeUrl && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Button
                      onClick={handleScrape}
                      disabled={!searchQuery.trim() || isSearching}
                      variant="outline"
                      size="default"
                      className="gap-2 group"
                    >
                      <FileSearch className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      {t.search.scrapeUrl}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  onClick={handleSubmit}
                  disabled={!searchQuery.trim() || isSearching}
                  variant="hero"
                  size="default"
                  className="gap-2 relative overflow-hidden group"
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={!isSearching && searchQuery.trim() ? { x: ['100%', '-100%'] } : { x: '-100%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                  
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.common.processing}
                    </>
                  ) : (
                    <>
                      <motion.div
                        animate={{ rotate: deepVerifyMode ? [0, 360] : 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        {deepVerifyMode ? <ShieldCheck className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                      </motion.div>
                      {detectedUrl ? t.common.search : t.search.startResearch}
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.div>
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Suggestions dropdown with enhanced animations */}
        <AnimatePresence>
          {showSuggestions && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-3 py-2 flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  Try these examples
                </p>
                {exampleQueries.map((query, index) => {
                  const Icon = query.icon;
                  return (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setSearchQuery(query.text);
                        inputRef.current?.focus();
                      }}
                      onMouseEnter={() => setHoveredSuggestion(index)}
                      onMouseLeave={() => setHoveredSuggestion(null)}
                      className="w-full text-left px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all flex items-center gap-3 group relative"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 8 }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-secondary/50 rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: hoveredSuggestion === index ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                      />
                      <motion.div
                        className="relative z-10 p-1.5 rounded-md bg-primary/10 text-primary"
                        animate={{ 
                          scale: hoveredSuggestion === index ? 1.1 : 1,
                          rotate: hoveredSuggestion === index ? [0, -5, 5, 0] : 0
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <Icon className="w-4 h-4" />
                      </motion.div>
                      <span className="relative z-10 flex-1">{query.text}</span>
                      <motion.div
                        className="relative z-10"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ 
                          opacity: hoveredSuggestion === index ? 1 : 0,
                          x: hoveredSuggestion === index ? 0 : -10
                        }}
                      >
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </motion.div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
