import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldQuestion, 
  Info,
  TrendingUp,
  Building2,
  Calendar,
  DollarSign,
  Users,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export interface ConfidenceCategory {
  category: string;
  icon: React.ReactNode;
  confidence: number; // 0-100
  description: string;
  dataType: 'historical' | 'current' | 'projected' | 'ai-inferred';
  sources: string[];
}

export interface DataConfidenceProps {
  categories: ConfidenceCategory[];
  overallConfidence: number;
  knowledgeCutoff: string;
  searchMethod: 'ai-powered' | 'web-search' | 'hybrid';
}

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 80) return 'text-green-500';
  if (confidence >= 60) return 'text-yellow-500';
  if (confidence >= 40) return 'text-orange-500';
  return 'text-red-500';
};

const getConfidenceBgColor = (confidence: number): string => {
  if (confidence >= 80) return 'bg-green-500/10 border-green-500/30';
  if (confidence >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
  if (confidence >= 40) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 80) return 'High Confidence';
  if (confidence >= 60) return 'Moderate Confidence';
  if (confidence >= 40) return 'Low Confidence';
  return 'Uncertain';
};

const getConfidenceIcon = (confidence: number) => {
  if (confidence >= 80) return <ShieldCheck className="w-5 h-5 text-green-500" />;
  if (confidence >= 60) return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
  return <ShieldQuestion className="w-5 h-5 text-orange-500" />;
};

const getDataTypeLabel = (type: ConfidenceCategory['dataType']): { label: string; color: string } => {
  switch (type) {
    case 'historical':
      return { label: 'Historical Data', color: 'bg-blue-500/20 text-blue-400' };
    case 'current':
      return { label: 'Current Data', color: 'bg-green-500/20 text-green-400' };
    case 'projected':
      return { label: 'Projected', color: 'bg-purple-500/20 text-purple-400' };
    case 'ai-inferred':
      return { label: 'AI Inferred', color: 'bg-orange-500/20 text-orange-400' };
  }
};

export const DataConfidenceIndicator = ({ 
  categories, 
  overallConfidence, 
  knowledgeCutoff,
  searchMethod 
}: DataConfidenceProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-card via-primary/5 to-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getConfidenceIcon(overallConfidence)}
              <div>
                <CardTitle className="text-lg font-semibold">Data Confidence Assessment</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  AI knowledge reliability indicators
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getConfidenceBgColor(overallConfidence)}>
                <span className={getConfidenceColor(overallConfidence)}>
                  {Math.round(overallConfidence)}% Overall
                </span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Overall Confidence Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Data Reliability</span>
              <span className={`font-medium ${getConfidenceColor(overallConfidence)}`}>
                {getConfidenceLabel(overallConfidence)}
              </span>
            </div>
            <Progress value={overallConfidence} className="h-2" />
          </div>

          {/* Research Method & Knowledge Cutoff */}
          <div className="flex flex-wrap gap-2 py-2 border-y border-border/50">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="gap-1.5">
                    <Info className="w-3 h-3" />
                    {searchMethod === 'ai-powered' && 'AI Knowledge Base'}
                    {searchMethod === 'web-search' && 'Web Search'}
                    {searchMethod === 'hybrid' && 'Hybrid Research'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    {searchMethod === 'ai-powered' && 
                      'Data synthesized from AI knowledge base. Best for historical facts and established information.'}
                    {searchMethod === 'web-search' && 
                      'Data retrieved from web search. More current but may have varying reliability.'}
                    {searchMethod === 'hybrid' && 
                      'Combines web search with AI knowledge for comprehensive coverage.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Knowledge Cutoff: {knowledgeCutoff}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    AI training data includes information up to this date. Events after this date may not be accurately reflected.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Confidence by Category</p>
            
            <div className="grid gap-3">
              {categories.map((category, index) => (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border ${getConfidenceBgColor(category.confidence)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-foreground text-sm">
                          {category.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge className={getDataTypeLabel(category.dataType).color} variant="secondary">
                            {getDataTypeLabel(category.dataType).label}
                          </Badge>
                          <span className={`text-sm font-semibold ${getConfidenceColor(category.confidence)}`}>
                            {category.confidence}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {category.description}
                      </p>
                      <Progress value={category.confidence} className="h-1.5" />
                      {category.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {category.sources.slice(0, 3).map((source, i) => (
                            <span 
                              key={i} 
                              className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground"
                            >
                              {source}
                            </span>
                          ))}
                          {category.sources.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                              +{category.sources.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Important:</strong> Confidence scores indicate AI knowledge reliability, 
              not absolute accuracy. For critical decisions, always verify data from primary sources such as 
              official regulatory filings, company announcements, and authoritative financial databases.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Helper function to generate confidence categories from research results
export const generateConfidenceCategories = (
  query: string,
  searchMethod: string = 'ai-powered'
): { categories: ConfidenceCategory[]; overallConfidence: number; knowledgeCutoff: string } => {
  const queryLower = query.toLowerCase();
  
  // Analyze query to determine relevant categories
  const categories: ConfidenceCategory[] = [];
  
  // Stock/Market data
  if (queryLower.includes('stock') || queryLower.includes('market') || queryLower.includes('tasi') || 
      queryLower.includes('tadawul') || queryLower.includes('nomu') || queryLower.includes('ipo')) {
    categories.push({
      category: 'Stock Market Data',
      icon: <TrendingUp className="w-4 h-4" />,
      confidence: searchMethod === 'ai-powered' ? 65 : 78,
      description: 'Stock prices, indices, and market performance metrics. AI has historical knowledge but may not reflect real-time prices.',
      dataType: 'historical',
      sources: ['Tadawul', 'Saudi Exchange', 'AI Knowledge Base']
    });
  }

  // Company information
  if (queryLower.includes('company') || queryLower.includes('companies') || queryLower.includes('corporate') ||
      queryLower.includes('ipo') || queryLower.includes('listing')) {
    categories.push({
      category: 'Company Information',
      icon: <Building2 className="w-4 h-4" />,
      confidence: 82,
      description: 'Company profiles, sectors, and basic information. Well-established companies have higher confidence.',
      dataType: 'historical',
      sources: ['Company Filings', 'CMA', 'AI Knowledge Base']
    });
  }

  // Financial figures
  if (queryLower.includes('price') || queryLower.includes('revenue') || queryLower.includes('profit') ||
      queryLower.includes('market cap') || queryLower.includes('valuation') || queryLower.includes('sar')) {
    categories.push({
      category: 'Financial Figures',
      icon: <DollarSign className="w-4 h-4" />,
      confidence: searchMethod === 'ai-powered' ? 55 : 72,
      description: 'Specific financial numbers and valuations. Historical figures are more reliable than current ones.',
      dataType: queryLower.includes('2024') || queryLower.includes('2025') ? 'ai-inferred' : 'historical',
      sources: ['Financial Reports', 'Market Data', 'AI Knowledge Base']
    });
  }

  // Dates and events
  if (queryLower.includes('date') || queryLower.includes('when') || queryLower.includes('announced') ||
      queryLower.includes('december') || queryLower.includes('2024') || queryLower.includes('2025')) {
    categories.push({
      category: 'Dates & Events',
      icon: <Calendar className="w-4 h-4" />,
      confidence: searchMethod === 'ai-powered' ? 60 : 75,
      description: 'Event dates and timelines. Recent events (2024-2025) may have lower confidence.',
      dataType: queryLower.includes('2025') ? 'ai-inferred' : 'historical',
      sources: ['News Archives', 'Official Announcements', 'AI Knowledge Base']
    });
  }

  // Executive/Personnel information
  if (queryLower.includes('ceo') || queryLower.includes('management') || queryLower.includes('board') ||
      queryLower.includes('executive') || queryLower.includes('chairman')) {
    categories.push({
      category: 'Executive Information',
      icon: <Users className="w-4 h-4" />,
      confidence: 70,
      description: 'Leadership and management details. Subject to frequent changes not captured in AI knowledge.',
      dataType: 'historical',
      sources: ['Company Announcements', 'CMA Filings', 'AI Knowledge Base']
    });
  }

  // Regulatory information
  if (queryLower.includes('regulation') || queryLower.includes('cma') || queryLower.includes('penalty') ||
      queryLower.includes('compliance') || queryLower.includes('violation')) {
    categories.push({
      category: 'Regulatory Information',
      icon: <FileText className="w-4 h-4" />,
      confidence: 75,
      description: 'Regulatory frameworks and compliance details. Specific recent penalties may not be fully captured.',
      dataType: 'historical',
      sources: ['CMA', 'Regulatory Filings', 'AI Knowledge Base']
    });
  }

  // Default category if none matched
  if (categories.length === 0) {
    categories.push({
      category: 'General Research',
      icon: <Info className="w-4 h-4" />,
      confidence: 70,
      description: 'General information synthesized from AI knowledge base.',
      dataType: 'ai-inferred',
      sources: ['AI Knowledge Base']
    });
  }

  // Calculate overall confidence
  const overallConfidence = Math.round(
    categories.reduce((sum, cat) => sum + cat.confidence, 0) / categories.length
  );

  return {
    categories,
    overallConfidence,
    knowledgeCutoff: 'Early 2024' // AI knowledge cutoff
  };
};