import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldOff, 
  Plus, 
  X, 
  RotateCcw,
  Check,
  Info,
  Search,
  Globe,
  Sparkles,
  ChevronDown,
  Layers,
  ArrowUp,
  ArrowDown,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useNewsSourceSettings } from '@/hooks/useNewsSourceSettings';
import { useNewsDeduplication } from '@/hooks/useNewsDeduplication';
import { cn } from '@/lib/utils';

export function NewsSourceSettings() {
  const {
    settings,
    setMode,
    addToWhitelist,
    removeFromWhitelist,
    addToBlacklist,
    removeFromBlacklist,
    resetSettings,
  } = useNewsSourceSettings();

  const {
    settings: dedupSettings,
    toggleEnabled: toggleDedup,
    setThreshold,
    addPreferredSource,
    removePreferredSource,
    reorderPreferredSource,
  } = useNewsDeduplication();

  const [newSource, setNewSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [newPrioritySource, setNewPrioritySource] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddSource = () => {
    if (!newSource.trim()) return;
    
    if (settings.mode === 'whitelist') {
      addToWhitelist(newSource);
    } else {
      addToBlacklist(newSource);
    }
    setNewSource('');
  };

  const handleRemoveSource = (source: string) => {
    if (settings.mode === 'whitelist') {
      removeFromWhitelist(source);
    } else {
      removeFromBlacklist(source);
    }
  };

  const currentList = settings.mode === 'whitelist' ? settings.whitelist : settings.blacklist;

  // Filter sources by search query
  const filteredSources = currentList.filter(source => 
    source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const commonSources = ['argaam', 'zawya', 'reuters', 'bloomberg', 'cnbc', 'wsj', 'ft', 'yahoo', 'marketwatch', 'tadawul', 'cma'];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* AI Deduplication Section */}
        <motion.div
          className={cn(
            "relative rounded-2xl transition-all duration-300",
            dedupSettings.enabled 
              ? 'shadow-lg shadow-primary/10' 
              : 'shadow-md shadow-background/50'
          )}
        >
          <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
            {/* Ambient glow effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                background: dedupSettings.enabled 
                  ? 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.08) 0%, transparent 50%)'
                  : 'transparent'
              }}
              transition={{ duration: 0.5 }}
            />
            
            {/* Header */}
            <div className="relative flex items-center gap-3 px-4 pt-4 pb-2">
              <motion.div
                animate={{ 
                  scale: dedupSettings.enabled ? 1.1 : 1
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Brain className={cn(
                  "w-5 h-5 transition-colors",
                  dedupSettings.enabled ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>
              
              <div className="flex-1">
                <span className="text-sm font-medium">AI Deduplication</span>
                <p className="text-xs text-muted-foreground">
                  Automatically remove duplicate news from multiple sources
                </p>
              </div>
              
              <Switch
                checked={dedupSettings.enabled}
                onCheckedChange={toggleDedup}
              />
            </div>

            {/* Dedup Settings */}
            <AnimatePresence>
              {dedupSettings.enabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4">
                    {/* Similarity threshold */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Similarity Threshold</Label>
                        <span className="text-xs font-mono text-primary">
                          {Math.round(dedupSettings.similarityThreshold * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[dedupSettings.similarityThreshold * 100]}
                        onValueChange={([val]) => setThreshold(val / 100)}
                        min={50}
                        max={95}
                        step={5}
                        className="py-1"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Higher = stricter matching (fewer duplicates removed)
                      </p>
                    </div>

                    {/* Source Priority */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Source Priority (drag to reorder)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={newPrioritySource}
                          onChange={(e) => setNewPrioritySource(e.target.value)}
                          placeholder="Add priority source..."
                          className="flex-1 h-8 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addPreferredSource(newPrioritySource);
                              setNewPrioritySource('');
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            addPreferredSource(newPrioritySource);
                            setNewPrioritySource('');
                          }}
                          disabled={!newPrioritySource.trim()}
                          className="h-8 px-2"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 rounded-lg border border-border/50 bg-muted/20">
                        {dedupSettings.preferredSources.slice(0, 10).map((source, idx) => (
                          <Badge
                            key={source}
                            variant="secondary"
                            className="gap-1 px-2 py-0.5 text-[10px] bg-primary/5 border-primary/20"
                          >
                            <span className="text-primary font-mono mr-1">{idx + 1}</span>
                            {source}
                            <div className="flex items-center ml-1">
                              <button
                                onClick={() => reorderPreferredSource(source, 'up')}
                                className="hover:text-primary p-0.5"
                                disabled={idx === 0}
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => reorderPreferredSource(source, 'down')}
                                className="hover:text-primary p-0.5"
                                disabled={idx === dedupSettings.preferredSources.length - 1}
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => removePreferredSource(source)}
                                className="hover:text-destructive p-0.5"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Source Filter Section - Search Box Style */}
        <motion.div
          className={cn(
            "relative rounded-2xl transition-all duration-500",
            isFocused 
              ? 'shadow-xl shadow-primary/20' 
              : 'shadow-lg shadow-background/50'
          )}
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
            <div className="relative flex items-center gap-3 px-4 pt-4 pb-2">
              <motion.div
                animate={{ 
                  scale: isFocused ? 1.1 : 1
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {settings.mode === 'whitelist' ? (
                  <Shield className="w-5 h-5 text-green-500" />
                ) : (
                  <ShieldOff className="w-5 h-5 text-amber-500" />
                )}
              </motion.div>
              
              <span className="text-sm font-medium">
                {settings.mode === 'whitelist' ? 'Whitelist Mode' : 'Blacklist Mode'}
              </span>
              
              <div className="flex-1" />
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Blacklist</span>
                <Switch
                  checked={settings.mode === 'whitelist'}
                  onCheckedChange={(checked) => setMode(checked ? 'whitelist' : 'blacklist')}
                />
                <span>Whitelist</span>
              </div>
            </div>

            {/* Search/Add Input Area */}
            <div className="relative px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  placeholder={`Search or add source to ${settings.mode}...`}
                  className="pl-10 pr-20 h-11 text-sm bg-muted/30 border-muted-foreground/20 focus:border-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {newSource.trim() && (
                    <Button
                      size="sm"
                      onClick={handleAddSource}
                      className="h-7 px-3 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible Filters Section */}
            <motion.div className="px-4 pb-2">
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
                <span>Quick Add Sources</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {commonSources.length}
                </Badge>
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
                    <div className="flex flex-wrap gap-1.5 pt-3 pb-1">
                      {commonSources.map((source) => {
                        const isInList = currentList.includes(source);
                        return (
                          <motion.button
                            key={source}
                            onClick={() => isInList ? handleRemoveSource(source) : (settings.mode === 'whitelist' ? addToWhitelist(source) : addToBlacklist(source))}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1.5 capitalize",
                              isInList
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isInList && <Check className="w-3 h-3" />}
                            <Globe className="w-3 h-3" />
                            {source}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Current List */}
            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  {settings.mode === 'whitelist' ? 'Whitelisted' : 'Blacklisted'} sources ({currentList.length})
                </Label>
                {currentList.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetSettings}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear all and reset to defaults</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {currentList.length === 0 ? (
                <motion.div 
                  className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No sources {settings.mode === 'whitelist' ? 'whitelisted' : 'blacklisted'} yet</p>
                  <p className="text-xs mt-1">Add sources above to filter news</p>
                </motion.div>
              ) : (
                <motion.div 
                  className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-border/50 bg-muted/20 max-h-40 overflow-y-auto"
                  layout
                >
                  <AnimatePresence mode="popLayout">
                    {filteredSources.map((source) => (
                      <motion.div
                        key={source}
                        layout
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Badge
                          variant="secondary"
                          className={cn(
                            "gap-1.5 px-2.5 py-1 capitalize transition-all",
                            settings.mode === 'whitelist' 
                              ? "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20" 
                              : "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20"
                          )}
                        >
                          <Globe className="w-3 h-3" />
                          {source}
                          <button
                            onClick={() => handleRemoveSource(source)}
                            className="hover:bg-background/50 rounded-full p-0.5 transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Info tip */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {settings.mode === 'whitelist'
                ? 'Add trusted sources to show only their news. Leave empty to show all sources.'
                : 'Add unwanted sources to hide their news from your feed.'}
            </p>
            {dedupSettings.enabled && (
              <p className="text-xs text-primary/80">
                AI deduplication is active - duplicate articles will be automatically merged.
              </p>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
