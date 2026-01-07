import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Code2, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Building2,
  Calendar,
  DollarSign,
  User,
  TrendingUp,
  Cpu,
  Regex,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ExtractedEntity {
  name: string;
  type: 'company' | 'date' | 'numeric' | 'person' | 'fact';
  value: string;
  confidence: 'high' | 'medium' | 'low';
  extractionMethod: 'ai' | 'regex' | 'verification';
  metadata?: {
    ticker?: string;
    market?: string;
    action?: string;
    source_url?: string;
  };
}

interface ExtractionQualityPanelProps {
  entities: ExtractedEntity[];
  totalSources: number;
}

export const ExtractionQualityPanel = ({ entities, totalSources }: ExtractionQualityPanelProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['company']));

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group entities by type
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, ExtractedEntity[]>);

  // Calculate stats
  const stats = {
    total: entities.length,
    byMethod: {
      ai: entities.filter(e => e.extractionMethod === 'ai').length,
      regex: entities.filter(e => e.extractionMethod === 'regex').length,
      verification: entities.filter(e => e.extractionMethod === 'verification').length,
    },
    byConfidence: {
      high: entities.filter(e => e.confidence === 'high').length,
      medium: entities.filter(e => e.confidence === 'medium').length,
      low: entities.filter(e => e.confidence === 'low').length,
    },
  };

  const qualityScore = entities.length > 0
    ? Math.round(
        ((stats.byConfidence.high * 100 + stats.byConfidence.medium * 60 + stats.byConfidence.low * 30) / entities.length)
      )
    : 0;

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'ai':
        return <Cpu className="w-3 h-3" />;
      case 'regex':
        return <Regex className="w-3 h-3" />;
      case 'verification':
        return <ShieldCheck className="w-3 h-3" />;
      default:
        return <Code2 className="w-3 h-3" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'ai':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'regex':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'verification':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getConfidenceBg = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-500/10 border-green-500/30';
      case 'medium':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'low':
        return 'bg-orange-500/10 border-orange-500/30';
      default:
        return 'bg-muted/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company':
        return <Building2 className="w-4 h-4" />;
      case 'date':
        return <Calendar className="w-4 h-4" />;
      case 'numeric':
        return <DollarSign className="w-4 h-4" />;
      case 'person':
        return <User className="w-4 h-4" />;
      case 'fact':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const typeLabels: Record<string, string> = {
    company: 'Companies',
    date: 'Key Dates',
    numeric: 'Financial Data',
    person: 'Key People',
    fact: 'Key Facts',
  };

  if (entities.length === 0) {
    return (
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Extraction Data</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Entity extraction data will appear here after research is completed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Extraction Quality</CardTitle>
              <p className="text-sm text-muted-foreground">
                {stats.total} entities from {totalSources} sources
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{qualityScore}%</p>
            <p className="text-xs text-muted-foreground">Quality Score</p>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 cursor-help">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium">AI</span>
                  </div>
                  <p className="text-xl font-bold">{stats.byMethod.ai}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Extracted using AI/LLM analysis</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 cursor-help">
                  <div className="flex items-center gap-2 mb-1">
                    <Regex className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">Regex</span>
                  </div>
                  <p className="text-xl font-bold">{stats.byMethod.regex}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Extracted using pattern matching</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 cursor-help">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                  <p className="text-xl font-bold">{stats.byMethod.verification}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Verified through secondary extraction</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Confidence breakdown */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Confidence Distribution</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                High: {stats.byConfidence.high}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                Medium: {stats.byConfidence.medium}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Low: {stats.byConfidence.low}
              </span>
            </div>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
            <div 
              className="bg-green-500 transition-all duration-500" 
              style={{ width: `${(stats.byConfidence.high / stats.total) * 100}%` }}
            />
            <div 
              className="bg-yellow-500 transition-all duration-500" 
              style={{ width: `${(stats.byConfidence.medium / stats.total) * 100}%` }}
            />
            <div 
              className="bg-orange-500 transition-all duration-500" 
              style={{ width: `${(stats.byConfidence.low / stats.total) * 100}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-3">
            {Object.entries(groupedEntities).map(([type, typeEntities]) => (
              <Collapsible 
                key={type} 
                open={expandedCategories.has(type)}
                onOpenChange={() => toggleCategory(type)}
              >
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {getTypeIcon(type)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{typeLabels[type] || type}</p>
                        <p className="text-xs text-muted-foreground">{typeEntities.length} entities</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {typeEntities.filter(e => e.confidence === 'high').length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                            <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                          </span>
                        )}
                        {typeEntities.filter(e => e.confidence === 'low').length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                            <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
                          </span>
                        )}
                      </div>
                      {expandedCategories.has(type) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="p-3 pt-0 space-y-2 border-t border-border/50">
                      <AnimatePresence>
                        {typeEntities.map((entity, idx) => (
                          <motion.div
                            key={`${entity.name}-${idx}`}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`p-3 rounded-lg border ${getConfidenceBg(entity.confidence)}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{entity.name || entity.value}</p>
                                {entity.metadata?.action && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {entity.metadata.action}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs gap-1 ${getMethodColor(entity.extractionMethod)}`}
                                >
                                  {getMethodIcon(entity.extractionMethod)}
                                  {entity.extractionMethod.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                {entity.metadata?.ticker && (
                                  <Badge variant="secondary" className="text-xs">
                                    {entity.metadata.ticker}
                                  </Badge>
                                )}
                                {entity.metadata?.market && (
                                  <span className="text-muted-foreground">
                                    {entity.metadata.market}
                                  </span>
                                )}
                              </div>
                              <div className={`flex items-center gap-1 font-medium ${getConfidenceColor(entity.confidence)}`}>
                                {entity.confidence === 'high' && <CheckCircle2 className="w-3 h-3" />}
                                {entity.confidence === 'medium' && <AlertTriangle className="w-3 h-3" />}
                                {entity.confidence === 'low' && <AlertTriangle className="w-3 h-3" />}
                                {entity.confidence.charAt(0).toUpperCase() + entity.confidence.slice(1)} Confidence
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};