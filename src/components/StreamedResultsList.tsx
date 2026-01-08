import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExternalLink, Shield, Crown, CheckCircle2, XCircle, 
  Clock, Building2, Users, DollarSign, Linkedin,
  Loader2, FileText, Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StreamedResult } from '@/hooks/useManusRealtime';

interface StreamedResultsListProps {
  results: StreamedResult[];
  isLoading?: boolean;
  className?: string;
}

const getCredibilityIcon = (badge?: string) => {
  switch (badge) {
    case 'official': return <Shield className="w-3 h-3" />;
    case 'premium': return <Crown className="w-3 h-3" />;
    case 'verified': return <CheckCircle2 className="w-3 h-3" />;
    default: return null;
  }
};

const getCredibilityColor = (badge?: string) => {
  switch (badge) {
    case 'official': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    case 'premium': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    case 'verified': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getValidationColor = (status: StreamedResult['validationStatus']) => {
  switch (status) {
    case 'valid':
      return 'border-l-emerald-500';
    case 'invalid':
    case 'date_rejected':
      return 'border-l-destructive opacity-60';
    default:
      return 'border-l-amber-500';
  }
};

export function StreamedResultsList({ results, isLoading, className }: StreamedResultsListProps) {
  const validResults = results.filter((r) => r.validationStatus === 'valid');
  const rejectedResults = results.filter(
    (r) => r.validationStatus === 'invalid' || r.validationStatus === 'date_rejected'
  );
  const pendingResults = results.filter((r) => r.validationStatus === 'pending');

  if (results.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card variant="glass" className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Streamed Results</span>
          {isLoading && (
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            {validResults.length} valid
          </Badge>
          {rejectedResults.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/30">
              {rejectedResults.length} rejected
            </Badge>
          )}
          {pendingResults.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {pendingResults.length} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Results List */}
      <ScrollArea className="h-[300px] pr-2">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                <div 
                  className={`
                    p-3 rounded-lg border-l-4 bg-muted/30
                    ${getValidationColor(result.validationStatus)}
                  `}
                >
                  {/* Title & Source */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {result.data.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {result.data.source}
                        </span>
                        {result.data.publishDate && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(result.data.publishDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {result.data.credibilityBadge && result.data.credibilityBadge !== 'unverified' && (
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] px-1.5 py-0 ${getCredibilityColor(result.data.credibilityBadge)}`}
                        >
                          {getCredibilityIcon(result.data.credibilityBadge)}
                          <span className="ml-1 capitalize">{result.data.credibilityBadge}</span>
                        </Badge>
                      )}
                      
                      {result.validationStatus === 'valid' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      {result.validationStatus === 'invalid' && (
                        <XCircle className="w-3.5 h-3.5 text-destructive" />
                      )}
                      {result.validationStatus === 'pending' && (
                        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Snippet */}
                  {result.data.snippet && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
                      {result.data.snippet}
                    </p>
                  )}

                  {/* Explorium Enrichment Data */}
                  {result.data.explorium && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 p-2 bg-primary/5 rounded-md border border-primary/20"
                    >
                      <div className="flex items-center gap-1 mb-1.5">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-medium text-primary">Explorium Enrichment</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                        {result.data.explorium.linkedInProfiles && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Linkedin className="w-3 h-3" />
                            {result.data.explorium.linkedInProfiles} profiles
                          </div>
                        )}
                        {result.data.explorium.employeeCount && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {result.data.explorium.employeeCount.toLocaleString()}
                          </div>
                        )}
                        {result.data.explorium.revenueEstimate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="w-3 h-3" />
                            {result.data.explorium.revenueEstimate}
                          </div>
                        )}
                        {result.data.explorium.fundingRounds && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {result.data.explorium.fundingRounds} rounds
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Footer: Relevance & Link */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {result.data.relevanceScore && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {result.data.relevanceScore}% match
                        </Badge>
                      )}
                      <span className="text-[9px] text-muted-foreground">
                        via {result.agentId.split('-')[0]}
                      </span>
                    </div>
                    
                    {result.data.url && result.validationStatus === 'valid' && (
                      <a
                        href={result.data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        View source
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Validation Errors */}
                  {result.validation?.errors && result.validation.errors.length > 0 && (
                    <div className="mt-2 text-[9px] text-destructive">
                      {result.validation.errors.join(' • ')}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Summary Footer */}
      {results.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {results.length} total results streamed
          </span>
          <span>
            {Math.round((validResults.length / results.length) * 100)}% validation rate
          </span>
        </div>
      )}
    </Card>
  );
}

export default StreamedResultsList;
