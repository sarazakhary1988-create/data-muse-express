import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link2, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Shield,
  ArrowRight,
  Globe,
  Database,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface EvidenceSource {
  id: string;
  url: string;
  domain: string;
  title: string;
  status: 'verified' | 'partial' | 'unverified' | 'failed';
  extractedData: ExtractedDataPoint[];
  confidenceScore: number;
  crawlTimestamp?: string;
  wordCount?: number;
}

export interface ExtractedDataPoint {
  id: string;
  field: string;
  value: string;
  sourceSnippet: string;
  confidence: number;
}

export interface DerivedClaim {
  id: string;
  statement: string;
  supportingSources: string[];
  contradictingSources: string[];
  confidenceScore: number;
  verificationStatus: 'verified' | 'likely' | 'uncertain' | 'disputed';
}

interface EvidenceChainPanelProps {
  sources: EvidenceSource[];
  claims: DerivedClaim[];
  onSourceClick?: (source: EvidenceSource) => void;
}

export const EvidenceChainPanel = ({ sources, claims, onSourceClick }: EvidenceChainPanelProps) => {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'chain' | 'sources' | 'claims'>('chain');

  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'unverified':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Verified</Badge>;
      case 'likely':
        return <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Likely</Badge>;
      case 'uncertain':
        return <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Uncertain</Badge>;
      case 'disputed':
        return <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">Disputed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const overallConfidence = sources.length > 0 
    ? Math.round(sources.reduce((acc, s) => acc + s.confidenceScore, 0) / sources.length)
    : 0;

  const verifiedClaims = claims.filter(c => c.verificationStatus === 'verified').length;
  const totalClaims = claims.length;

  return (
    <Card variant="glass" className="overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Evidence Chain</CardTitle>
              <p className="text-sm text-muted-foreground">
                {sources.length} sources → {claims.length} claims
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{overallConfidence}%</p>
              <p className="text-xs text-muted-foreground">Overall Confidence</p>
            </div>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeView === 'chain' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('chain')}
            className="gap-1.5"
          >
            <Link2 className="w-3.5 h-3.5" />
            Chain View
          </Button>
          <Button
            variant={activeView === 'sources' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('sources')}
            className="gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            Sources ({sources.length})
          </Button>
          <Button
            variant={activeView === 'claims' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('claims')}
            className="gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Claims ({claims.length})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4">
            {activeView === 'chain' && (
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Sources</span>
                    </div>
                    <p className="text-2xl font-bold">{sources.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {sources.filter(s => s.status === 'verified').length} verified
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">Extracted</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {sources.reduce((acc, s) => acc + s.extractedData.length, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">data points</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                    <p className="text-2xl font-bold">{verifiedClaims}/{totalClaims}</p>
                    <p className="text-xs text-muted-foreground">claims</p>
                  </div>
                </div>

                {/* Chain visualization */}
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-muted" />
                  
                  {claims.slice(0, 5).map((claim, idx) => (
                    <motion.div
                      key={claim.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative pl-14 py-4"
                    >
                      {/* Node */}
                      <div className="absolute left-4 top-5 w-4 h-4 rounded-full bg-background border-2 border-primary z-10 flex items-center justify-center">
                        {getStatusIcon(claim.verificationStatus)}
                      </div>

                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-medium leading-relaxed">{claim.statement}</p>
                          {getVerificationBadge(claim.verificationStatus)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {claim.supportingSources.length} supporting
                          </span>
                          {claim.contradictingSources.length > 0 && (
                            <span className="flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-500" />
                              {claim.contradictingSources.length} contradicting
                            </span>
                          )}
                          <span>
                            Confidence: {Math.round(claim.confidenceScore * 100)}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'sources' && (
              <div className="space-y-3">
                {sources.map((source) => (
                  <Collapsible key={source.id} open={expandedSources.has(source.id)}>
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      <CollapsibleTrigger 
                        className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        onClick={() => toggleSource(source.id)}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(source.status)}
                          <div className="text-left">
                            <p className="text-sm font-medium line-clamp-1">{source.title}</p>
                            <p className="text-xs text-muted-foreground">{source.domain}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {source.extractedData.length} data points
                          </Badge>
                          <div className="w-16">
                            <Progress value={source.confidenceScore} className="h-1.5" />
                          </div>
                          {expandedSources.has(source.id) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="p-3 pt-0 space-y-2 border-t border-border/50">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{source.wordCount ? `${source.wordCount.toLocaleString()} words` : 'Unknown length'}</span>
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              View source <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          
                          {source.extractedData.length > 0 && (
                            <div className="space-y-2 mt-2">
                              <p className="text-xs font-medium text-muted-foreground">Extracted Data:</p>
                              {source.extractedData.slice(0, 3).map((dp) => (
                                <div key={dp.id} className="p-2 rounded bg-muted/20 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-primary">{dp.field}</span>
                                    <span className="text-muted-foreground">{Math.round(dp.confidence * 100)}%</span>
                                  </div>
                                  <p className="text-muted-foreground">{dp.value}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}

            {activeView === 'claims' && (
              <div className="space-y-3">
                {claims.map((claim, idx) => (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-sm leading-relaxed">{claim.statement}</p>
                      {getVerificationBadge(claim.verificationStatus)}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Progress value={claim.confidenceScore * 100} className="flex-1 h-2" />
                      <span className="text-xs font-medium w-12 text-right">
                        {Math.round(claim.confidenceScore * 100)}%
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {claim.supportingSources.slice(0, 3).map((sourceId) => {
                        const source = sources.find(s => s.id === sourceId);
                        return source ? (
                          <Badge key={sourceId} variant="outline" className="text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {source.domain}
                          </Badge>
                        ) : null;
                      })}
                      {claim.contradictingSources.slice(0, 2).map((sourceId) => {
                        const source = sources.find(s => s.id === sourceId);
                        return source ? (
                          <Badge key={sourceId} variant="outline" className="text-xs gap-1 border-red-500/30">
                            <XCircle className="w-3 h-3 text-red-500" />
                            {source.domain}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
