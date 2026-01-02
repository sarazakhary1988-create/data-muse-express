import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Shield, Target, Activity, CheckCircle2, AlertCircle, Loader2, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useResearchStore } from '@/store/researchStore';

const stateLabels: Record<string, string> = {
  idle: 'Ready',
  planning: 'Creating Strategy',
  searching: 'Searching Web',
  scraping: 'Extracting Content',
  analyzing: 'Analyzing Data',
  verifying: 'Verifying Claims',
  compiling: 'Compiling Report',
  completed: 'Complete',
  failed: 'Failed',
};

const stateIcons: Record<string, any> = {
  idle: Activity,
  planning: Brain,
  searching: Target,
  scraping: Zap,
  analyzing: Brain,
  verifying: Shield,
  compiling: CheckCircle2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

// Search engine configuration
const ENGINE_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  duckduckgo: { color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/30', label: 'DuckDuckGo' },
  google: { color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30', label: 'Google' },
  bing: { color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 border-cyan-500/30', label: 'Bing' },
  internal: { color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30', label: 'Sitemap' },
  unknown: { color: 'text-muted-foreground', bgColor: 'bg-muted/50 border-border', label: 'Other' },
};

export const AgentStatusPanel = () => {
  const { agentState, isSearching } = useResearchStore();
  const { state, quality, metrics, lastDecision, verifications, searchEngines } = agentState;

  if (!isSearching && state === 'idle') return null;

  const StateIcon = stateIcons[state] || Activity;
  const isActive = isSearching && state !== 'completed' && state !== 'failed';

  // Search engine data
  const engines = searchEngines?.engines || [];
  const resultCounts = searchEngines?.resultCounts || {};
  const totalResults = Object.values(resultCounts).reduce((sum, count) => sum + count, 0);
  const timing = searchEngines?.timing;
  const searchMethod = searchEngines?.searchMethod || 'embedded_web_search';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-2xl mx-auto mb-4"
      >
        <Card variant="glass" className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/20 text-primary' : state === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <StateIcon className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-sm font-semibold">Agent Status</h4>
                <p className="text-xs text-muted-foreground">{stateLabels[state]}</p>
              </div>
            </div>
            {lastDecision && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="text-sm font-medium">{(lastDecision.confidence * 100).toFixed(0)}%</p>
              </div>
            )}
          </div>

          {/* Search Engines Indicator */}
          <AnimatePresence>
            {(isSearching || searchEngines) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-muted/20 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium">Search Engines</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] text-muted-foreground cursor-help">
                          ({searchMethod === 'embedded_web_search' ? 'Zero-API Embedded' : searchMethod})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">
                          Using embedded web scraping with zero external API dependencies. 
                          Real-time results from DuckDuckGo, Google, and Bing.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Loading state */}
                  {isSearching && !searchEngines && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center gap-1"
                    >
                      {['duckduckgo', 'google', 'bing'].map((engine) => (
                        <Badge 
                          key={engine} 
                          variant="outline" 
                          className={`text-[10px] px-2 py-0.5 ${ENGINE_CONFIG[engine]?.bgColor} opacity-50`}
                        >
                          <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
                          {ENGINE_CONFIG[engine]?.label}
                        </Badge>
                      ))}
                    </motion.div>
                  )}

                  {/* Active engines with results */}
                  {searchEngines && engines.length > 0 && engines.map((engine) => {
                    const config = ENGINE_CONFIG[engine.toLowerCase()] || ENGINE_CONFIG.unknown;
                    const count = resultCounts[engine] || resultCounts[engine.toLowerCase()] || 0;
                    
                    return (
                      <TooltipProvider key={engine}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-2 py-0.5 ${config.bgColor} ${count > 0 ? 'opacity-100' : 'opacity-40'}`}
                              >
                                <Globe className={`w-2.5 h-2.5 mr-1 ${config.color}`} />
                                {config.label}
                                {count > 0 && (
                                  <span className={`ml-1.5 font-bold ${config.color}`}>
                                    {count}
                                  </span>
                                )}
                              </Badge>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {count > 0 
                                ? `${count} sources scraped from ${config.label}` 
                                : `No results from ${config.label}`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}

                  {/* Summary stats */}
                  {searchEngines && totalResults > 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-[10px] text-muted-foreground ml-auto pl-2 border-l border-border"
                    >
                      <span className="font-medium text-foreground">{totalResults}</span>
                      <span>sources scraped</span>
                      {timing && <span>• {(timing / 1000).toFixed(1)}s</span>}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decision */}
          {lastDecision && (
            <div className="mb-4 p-2 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Current Decision</p>
              <p className="text-sm">{lastDecision.message}</p>
            </div>
          )}

          {/* Quality Scores */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Overall</p>
              <div className="relative">
                <Progress value={quality.overall * 100} className="h-2" />
                <p className="text-xs font-medium mt-1">{(quality.overall * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
              <div className="relative">
                <Progress value={quality.accuracy * 100} className="h-2" />
                <p className="text-xs font-medium mt-1">{(quality.accuracy * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Verification</p>
              <div className="relative">
                <Progress value={quality.claimVerification * 100} className="h-2" />
                <p className="text-xs font-medium mt-1">{(quality.claimVerification * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tasks: {metrics.completedTasks}/{metrics.totalTasks}</span>
            <span>Efficiency: {(metrics.parallelEfficiency * 100).toFixed(0)}%</span>
            <span>Claims: {verifications.filter(v => v.status === 'verified').length}/{verifications.length}</span>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
