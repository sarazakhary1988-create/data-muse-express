// Discrepancy Report - Shows source conflicts and authority-based resolutions
// Manus-inspired data validation visualization

import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Shield, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Scale
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Discrepancy, QualityMetrics, SourceCoverage } from '@/lib/agent/dataConsolidator';
import { AUTHORITY_HIERARCHY, SourceCategory } from '@/lib/agent/sourceAuthority';

interface DiscrepancyReportProps {
  discrepancies: Discrepancy[];
  qualityMetrics: QualityMetrics;
  sourceCoverage: SourceCoverage;
  consolidatedData: Record<string, any>;
}

const CATEGORY_COLORS: Record<SourceCategory, string> = {
  government: 'bg-emerald-500',
  regulatory: 'bg-teal-500',
  official: 'bg-blue-500',
  academic: 'bg-indigo-500',
  financial: 'bg-violet-500',
  news_major: 'bg-amber-500',
  news_minor: 'bg-orange-400',
  wiki: 'bg-slate-400',
  social: 'bg-pink-400',
  unknown: 'bg-gray-400',
};

const CATEGORY_LABELS: Record<SourceCategory, string> = {
  government: 'Government',
  regulatory: 'Regulatory',
  official: 'Official',
  academic: 'Academic',
  financial: 'Financial',
  news_major: 'Major News',
  news_minor: 'Minor News',
  wiki: 'Wiki/Reference',
  social: 'Social Media',
  unknown: 'Unknown',
};

export const DiscrepancyReport = ({ 
  discrepancies, 
  qualityMetrics, 
  sourceCoverage,
  consolidatedData 
}: DiscrepancyReportProps) => {
  const [expandedDiscrepancy, setExpandedDiscrepancy] = useState<string | null>(null);
  const [showAuthorityLegend, setShowAuthorityLegend] = useState(false);

  const toggleDiscrepancy = (field: string) => {
    setExpandedDiscrepancy(expandedDiscrepancy === field ? null : field);
  };

  const getAuthorityColor = (authority: number): string => {
    if (authority >= 0.8) return 'text-emerald-500';
    if (authority >= 0.6) return 'text-amber-500';
    return 'text-orange-500';
  };

  const getAuthorityLabel = (authority: number): string => {
    if (authority >= 0.9) return 'Very High';
    if (authority >= 0.7) return 'High';
    if (authority >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Data Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Overall</span>
                <span className="text-sm font-medium">{Math.round(qualityMetrics.overallScore * 100)}%</span>
              </div>
              <Progress value={qualityMetrics.overallScore * 100} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Completeness</span>
                <span className="text-sm font-medium">{Math.round(qualityMetrics.completeness * 100)}%</span>
              </div>
              <Progress value={qualityMetrics.completeness * 100} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Consistency</span>
                <span className="text-sm font-medium">{Math.round(qualityMetrics.consistency * 100)}%</span>
              </div>
              <Progress value={qualityMetrics.consistency * 100} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Authority</span>
                <span className="text-sm font-medium">{Math.round(qualityMetrics.sourceAuthority * 100)}%</span>
              </div>
              <Progress value={qualityMetrics.sourceAuthority * 100} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Validation</span>
                <span className="text-sm font-medium">{Math.round(qualityMetrics.crossValidation * 100)}%</span>
              </div>
              <Progress value={qualityMetrics.crossValidation * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Coverage */}
      <Card variant="glass">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Source Authority Distribution
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAuthorityLegend(!showAuthorityLegend)}
              className="text-xs"
            >
              {showAuthorityLegend ? 'Hide' : 'Show'} Legend
              {showAuthorityLegend ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Authority Distribution Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>High ({sourceCoverage.authorityDistribution.high})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Medium ({sourceCoverage.authorityDistribution.medium})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Low ({sourceCoverage.authorityDistribution.low})</span>
              </div>
            </div>
            
            <div className="h-4 rounded-full overflow-hidden bg-muted flex">
              {sourceCoverage.totalSources > 0 && (
                <>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(sourceCoverage.authorityDistribution.high / sourceCoverage.totalSources) * 100}%` }}
                    className="bg-emerald-500 h-full"
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(sourceCoverage.authorityDistribution.medium / sourceCoverage.totalSources) * 100}%` }}
                    className="bg-amber-500 h-full"
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(sourceCoverage.authorityDistribution.low / sourceCoverage.totalSources) * 100}%` }}
                    className="bg-orange-500 h-full"
                  />
                </>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(sourceCoverage.categoryBreakdown).map(([category, count]) => (
              <Badge 
                key={category} 
                variant="outline"
                className="flex items-center gap-1.5"
              >
                <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category as SourceCategory] || 'bg-gray-400'}`} />
                {CATEGORY_LABELS[category as SourceCategory] || category}: {count}
              </Badge>
            ))}
          </div>

          {/* Authority Legend */}
          <AnimatePresence>
            {showAuthorityLegend && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-3">Authority Hierarchy (Higher = More Trusted)</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.entries(AUTHORITY_HIERARCHY)
                      .sort(([,a], [,b]) => b - a)
                      .map(([category, score]) => (
                        <div 
                          key={category}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category as SourceCategory]}`} />
                            <span className="text-xs">{CATEGORY_LABELS[category as SourceCategory]}</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {(score * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Discrepancies */}
      {discrepancies.length > 0 ? (
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              Data Conflicts & Resolutions
              <Badge variant="secondary" className="ml-2">{discrepancies.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {discrepancies.map((discrepancy) => (
              <Collapsible
                key={discrepancy.field}
                open={expandedDiscrepancy === discrepancy.field}
                onOpenChange={() => toggleDiscrepancy(discrepancy.field)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">{discrepancy.field}</span>
                      <Badge variant="outline" className="text-xs">
                        {discrepancy.values.length} sources differ
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                              Resolved
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Selected value from highest authority source</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {expandedDiscrepancy === discrepancy.field ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-4 rounded-lg border border-border/50 bg-background/50 space-y-4"
                  >
                    {/* Resolution */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-500">Selected Value</p>
                        <p className="text-foreground mt-1">
                          {typeof discrepancy.resolution.selectedValue === 'object' 
                            ? JSON.stringify(discrepancy.resolution.selectedValue)
                            : String(discrepancy.resolution.selectedValue)
                          }
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          From: {discrepancy.resolution.selectedSource} • {discrepancy.resolution.reason}
                        </p>
                      </div>
                    </div>

                    {/* Conflicting Values */}
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        All Reported Values
                      </p>
                      <div className="space-y-2">
                        {discrepancy.values
                          .sort((a, b) => b.authority - a.authority)
                          .map((item, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between p-2 rounded bg-muted/30"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className={`w-2 h-2 rounded-full ${
                                      item.authority >= 0.8 ? 'bg-emerald-500' :
                                      item.authority >= 0.5 ? 'bg-amber-500' : 'bg-orange-500'
                                    }`} 
                                  />
                                  <span className={`text-xs font-medium ${getAuthorityColor(item.authority)}`}>
                                    {getAuthorityLabel(item.authority)}
                                  </span>
                                </div>
                                <span className="text-sm truncate max-w-[200px]">
                                  {item.source}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {typeof item.value === 'object' 
                                    ? JSON.stringify(item.value).substring(0, 30)
                                    : String(item.value).substring(0, 30)
                                  }
                                </code>
                                <span className="text-xs text-muted-foreground">
                                  {(item.authority * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card variant="glass">
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="font-medium">No Data Conflicts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                All sources reported consistent data
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consolidated Data Preview */}
      {Object.keys(consolidatedData).length > 0 && (
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Consolidated Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(consolidatedData)
                .filter(([key]) => !key.startsWith('_'))
                .slice(0, 9)
                .map(([key, value]) => (
                  <div 
                    key={key}
                    className="p-3 rounded-lg bg-muted/50"
                  >
                    <p className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm font-medium mt-1 truncate">
                      {typeof value === 'object' 
                        ? JSON.stringify(value).substring(0, 50)
                        : String(value).substring(0, 50)
                      }
                    </p>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
