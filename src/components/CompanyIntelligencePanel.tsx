import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight,
  Globe,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Link2,
  Quote,
  MapPin,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Regex,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

export interface CompanyEntity {
  name: string;
  ticker?: string;
  market?: string;
  action?: string;
  confidence: 'high' | 'medium' | 'low';
  extractionMethod: 'ai' | 'regex' | 'verification';
  sources?: {
    url: string;
    domain: string;
    title: string;
    snippet?: string;
  }[];
  relatedData?: {
    dates?: string[];
    financials?: { label: string; value: string }[];
    people?: { name: string; role?: string }[];
    facts?: string[];
  };
}

interface CompanyIntelligencePanelProps {
  companies: CompanyEntity[];
  totalSources: number;
}

export const CompanyIntelligencePanel = ({ companies, totalSources }: CompanyIntelligencePanelProps) => {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(
    companies.length > 0 ? companies[0].name : null
  );

  const toggleCompany = (name: string) => {
    setExpandedCompany(prev => prev === name ? null : name);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceBg = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-500/10 border-green-500/30';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'bg-orange-500/10 border-orange-500/30';
      default: return 'bg-muted/30';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'ai': return <Cpu className="w-3 h-3" />;
      case 'regex': return <Regex className="w-3 h-3" />;
      case 'verification': return <ShieldCheck className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'ai': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'regex': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'verification': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Stats
  const highConfidence = companies.filter(c => c.confidence === 'high').length;
  const withSources = companies.filter(c => c.sources && c.sources.length > 0).length;

  if (companies.length === 0) {
    return (
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Companies Identified</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Company intelligence will appear here after research extracts company entities
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Company Intelligence</CardTitle>
              <p className="text-sm text-muted-foreground">
                {companies.length} companies from {totalSources} sources
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">{highConfidence} High Confidence</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Link2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">{withSources} With Sources</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-3">
            {companies.map((company, idx) => (
              <Collapsible
                key={`${company.name}-${idx}`}
                open={expandedCompany === company.name}
                onOpenChange={() => toggleCompany(company.name)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border overflow-hidden ${getConfidenceBg(company.confidence)}`}
                >
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-semibold">{company.name}</p>
                          {company.ticker && (
                            <Badge variant="secondary" className="text-xs">
                              {company.ticker}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {company.market && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {company.market}
                            </span>
                          )}
                          {company.action && (
                            <Badge variant="outline" className="text-xs">
                              {company.action}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`text-xs gap-1 ${getMethodColor(company.extractionMethod)}`}
                      >
                        {getMethodIcon(company.extractionMethod)}
                        {company.extractionMethod.toUpperCase()}
                      </Badge>
                      <div className={`flex items-center gap-1 text-xs font-medium ${getConfidenceColor(company.confidence)}`}>
                        {company.confidence === 'high' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {company.confidence !== 'high' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {company.confidence.toUpperCase()}
                      </div>
                      {expandedCompany === company.name ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      <Separator className="bg-border/50" />
                      
                      {/* Related Data Section */}
                      {company.relatedData && (
                        <div className="grid gap-3 md:grid-cols-2">
                          {/* Key Dates */}
                          {company.relatedData.dates && company.relatedData.dates.length > 0 && (
                            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">Key Dates</span>
                              </div>
                              <ul className="space-y-1">
                                {company.relatedData.dates.map((date, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">
                                    • {date}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Financials */}
                          {company.relatedData.financials && company.relatedData.financials.length > 0 && (
                            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                              <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-medium">Financial Data</span>
                              </div>
                              <ul className="space-y-1">
                                {company.relatedData.financials.map((f, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex justify-between">
                                    <span>{f.label}</span>
                                    <span className="font-medium text-foreground">{f.value}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Key People */}
                          {company.relatedData.people && company.relatedData.people.length > 0 && (
                            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-purple-400" />
                                <span className="text-sm font-medium">Key People</span>
                              </div>
                              <ul className="space-y-1">
                                {company.relatedData.people.map((p, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">
                                    • {p.name}{p.role ? ` - ${p.role}` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Key Facts */}
                          {company.relatedData.facts && company.relatedData.facts.length > 0 && (
                            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm font-medium">Key Facts</span>
                              </div>
                              <ul className="space-y-1">
                                {company.relatedData.facts.slice(0, 3).map((fact, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">
                                    • {fact}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Source Citations */}
                      {company.sources && company.sources.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Source Citations ({company.sources.length})</span>
                          </div>
                          
                          <div className="space-y-2">
                            {company.sources.map((source, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors group"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                      <span className="text-xs text-muted-foreground truncate">
                                        {source.domain}
                                      </span>
                                    </div>
                                    <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                      {source.title}
                                    </p>
                                    {source.snippet && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex items-start gap-1">
                                        <Quote className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary/50" />
                                        {source.snippet}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0 opacity-50 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(source.url, '_blank');
                                    }}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No additional data message */}
                      {!company.sources?.length && !company.relatedData && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No additional details available for this company
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </motion.div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
