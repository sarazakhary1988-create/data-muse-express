import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Globe, ArrowRight, Loader2, Link, FileSearch, Shield, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResearchStore } from '@/store/researchStore';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeepVerifySettings } from '@/components/DeepVerifySettings';

interface SearchInputProps {
  onSearch: (query: string) => void;
  onScrapeUrl?: (url: string) => void;
}

const exampleQueries = [
  "Latest AI research papers on transformer architectures",
  "Compare top 10 cloud providers pricing 2024",
  "Renewable energy trends and market analysis",
  "Comprehensive guide to modern web development",
];

const isUrl = (text: string): boolean => {
  const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
  return urlPattern.test(text.trim());
};

export const SearchInput = ({ onSearch, onScrapeUrl }: SearchInputProps) => {
  const { searchQuery, setSearchQuery, isSearching, deepVerifyMode, setDeepVerifyMode } = useResearchStore();
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const detectedUrl = isUrl(searchQuery);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [searchQuery]);

  const handleSubmit = () => {
    if (searchQuery.trim() && !isSearching) {
      onSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleScrape = () => {
    if (searchQuery.trim() && !isSearching && onScrapeUrl) {
      onScrapeUrl(searchQuery.trim());
      setShowSuggestions(false);
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
      transition={{ delay: 0.2 }}
    >
      <motion.div
        className={`relative rounded-2xl transition-all duration-300 ${
          isFocused 
            ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary/50' 
            : 'shadow-xl'
        }`}
      >
        <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
          {/* Top bar with icon */}
          <div className="flex items-center gap-3 px-5 pt-4 pb-2">
            <motion.div
              animate={{ rotate: isSearching ? 360 : 0 }}
              transition={{ duration: 2, repeat: isSearching ? Infinity : 0, ease: "linear" }}
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-primary" />
              ) : detectedUrl ? (
                <Link className="w-5 h-5 text-primary" />
              ) : (
                <Globe className="w-5 h-5 text-primary" />
              )}
            </motion.div>
            <span className="text-sm text-muted-foreground font-medium">
              {isSearching ? 'Searching the web...' : 
               detectedUrl ? 'URL detected - Scrape or search for it' :
               'What would you like to research?'}
            </span>
            {detectedUrl && (
              <Badge variant="secondary" className="text-xs">
                URL
              </Badge>
            )}
          </div>

          {/* Textarea */}
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
            placeholder="Enter your research query, topic, or URL to scrape..."
            className="w-full px-5 py-3 bg-transparent text-foreground text-lg placeholder:text-muted-foreground/50 focus:outline-none resize-none min-h-[60px] max-h-[200px] scrollbar-thin"
            disabled={isSearching}
            rows={1}
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                <span>AI-powered deep research</span>
              </div>
              
              {/* Deep Verify Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="deep-verify"
                        checked={deepVerifyMode}
                        onCheckedChange={setDeepVerifyMode}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <label 
                        htmlFor="deep-verify" 
                        className={`text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                          deepVerifyMode ? 'text-emerald-500' : 'text-muted-foreground'
                        }`}
                      >
                        {deepVerifyMode ? (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                        Deep Verify
                      </label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">Deep Verify Mode</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Crawls official sources first before web search for maximum accuracy on financial/market data.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Deep Verify Settings - only show when mode is enabled */}
              {deepVerifyMode && <DeepVerifySettings />}
            </div>
            
            <div className="flex items-center gap-2">
              {detectedUrl && onScrapeUrl && (
                <Button
                  onClick={handleScrape}
                  disabled={!searchQuery.trim() || isSearching}
                  variant="outline"
                  size="default"
                  className="gap-2"
                >
                  <FileSearch className="w-4 h-4" />
                  Scrape URL
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!searchQuery.trim() || isSearching}
                variant="hero"
                size="default"
                className="gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {deepVerifyMode ? 'Deep Verifying...' : 'Researching...'}
                  </>
                ) : (
                  <>
                    {deepVerifyMode ? <ShieldCheck className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    {detectedUrl ? 'Search About' : deepVerifyMode ? 'Deep Verify' : 'Research'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-10"
            >
              <div className="p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-3 py-2">
                  Try these examples
                </p>
                {exampleQueries.map((query, index) => (
                  <motion.button
                    key={index}
                    onClick={() => {
                      setSearchQuery(query);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    whileHover={{ x: 4 }}
                  >
                    {query}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
