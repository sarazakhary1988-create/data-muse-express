import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Globe,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface SourceStatus {
  name: string;
  baseUrl: string;
  status: 'success' | 'failed' | 'timeout' | 'blocked' | 'no_content';
  pagesFound: number;
  pagesExtracted: number;
  error?: string;
  responseTime?: number;
}

export interface UnreachableSource {
  name: string;
  url: string;
  reason: string;
  responseTime?: number;
}

export interface SourceStatusPanelProps {
  sourceStatuses?: SourceStatus[];
  unreachableSources?: UnreachableSource[];
  strictModeFailure?: boolean;
  recommendations?: string[];
  summary?: {
    sourcesChecked: number;
    sourcesReachable: number;
    sourcesUnreachable: number;
    totalPagesFound: number;
    totalPagesExtracted: number;
  };
  onRetry?: () => void;
  onDisableStrictMode?: () => void;
}

const getStatusIcon = (status: SourceStatus['status']) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'timeout':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'blocked':
      return <ShieldAlert className="w-4 h-4 text-red-500" />;
    case 'no_content':
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    default:
      return <XCircle className="w-4 h-4 text-red-500" />;
  }
};

const getStatusColor = (status: SourceStatus['status']) => {
  switch (status) {
    case 'success':
      return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'timeout':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'blocked':
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'no_content':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    default:
      return 'bg-red-500/10 text-red-400 border-red-500/30';
  }
};

const getStatusLabel = (status: SourceStatus['status']) => {
  switch (status) {
    case 'success':
      return 'Accessible';
    case 'timeout':
      return 'Timeout';
    case 'blocked':
      return 'Blocked';
    case 'no_content':
      return 'No Content';
    default:
      return 'Failed';
  }
};

export const SourceStatusPanel = ({
  sourceStatuses,
  unreachableSources,
  strictModeFailure,
  recommendations,
  summary,
  onRetry,
  onDisableStrictMode,
}: SourceStatusPanelProps) => {
  if (!sourceStatuses && !unreachableSources) return null;

  const successCount = sourceStatuses?.filter(s => s.status === 'success').length || 0;
  const totalCount = sourceStatuses?.length || 0;
  const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card variant="glass" className={`overflow-hidden ${strictModeFailure ? 'border-red-500/50' : ''}`}>
        <CardHeader className={`border-b border-border/50 p-4 ${
          strictModeFailure 
            ? 'bg-gradient-to-r from-red-500/10 via-card to-red-500/10' 
            : 'bg-gradient-to-r from-card via-primary/5 to-card'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {strictModeFailure ? (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-green-500" />
              )}
              <div>
                <CardTitle className="text-lg font-semibold">
                  {strictModeFailure ? 'Strict Mode Failure' : 'Source Status'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {strictModeFailure 
                    ? 'Not enough sources were accessible to complete the research'
                    : `${successCount}/${totalCount} sources accessible`
                  }
                </p>
              </div>
            </div>
            {summary && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={successRate >= 60 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                  {Math.round(successRate)}% Reachable
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{summary.sourcesChecked}</p>
                <p className="text-xs text-muted-foreground">Sources Checked</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{summary.sourcesReachable}</p>
                <p className="text-xs text-muted-foreground">Reachable</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-400">{summary.sourcesUnreachable}</p>
                <p className="text-xs text-muted-foreground">Unreachable</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{summary.totalPagesExtracted}</p>
                <p className="text-xs text-muted-foreground">Pages Extracted</p>
              </div>
            </div>
          )}

          {/* Source Status List */}
          {sourceStatuses && sourceStatuses.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Source Details</p>
              <div className="space-y-2">
                {sourceStatuses.map((source, index) => (
                  <motion.div
                    key={source.baseUrl}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border ${getStatusColor(source.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(source.status)}
                        <div>
                          <p className="font-medium text-foreground text-sm">{source.name}</p>
                          <a 
                            href={source.baseUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            {new URL(source.baseUrl).hostname}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {source.responseTime && (
                          <span className="text-xs text-muted-foreground">
                            {source.responseTime}ms
                          </span>
                        )}
                        <Badge variant="outline" className={getStatusColor(source.status)}>
                          {getStatusLabel(source.status)}
                        </Badge>
                        {source.status === 'success' && (
                          <Badge variant="secondary" className="text-xs">
                            {source.pagesExtracted}/{source.pagesFound} pages
                          </Badge>
                        )}
                      </div>
                    </div>
                    {source.error && source.status !== 'success' && (
                      <p className="text-xs text-muted-foreground mt-2 pl-7">
                        Error: {source.error}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Unreachable Sources (for strict mode failure) */}
          {unreachableSources && unreachableSources.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-400">Unreachable Sources</p>
              <div className="space-y-2">
                {unreachableSources.map((source, index) => (
                  <div 
                    key={source.url}
                    className="p-3 rounded-lg border bg-red-500/10 border-red-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="font-medium text-foreground text-sm">{source.name}</p>
                          <p className="text-xs text-muted-foreground">{source.url}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">
                          {source.reason}
                        </Badge>
                        {source.responseTime && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {source.responseTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && (
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm font-medium text-foreground mb-2">Recommendations</p>
              <ul className="space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {strictModeFailure && (
            <div className="flex items-center gap-2 pt-2">
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
              )}
              {onDisableStrictMode && (
                <Button variant="secondary" size="sm" onClick={onDisableStrictMode} className="gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Disable Strict Mode & Retry
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};