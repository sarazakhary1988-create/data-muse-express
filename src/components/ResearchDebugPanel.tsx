import React, { useState } from 'react';
import { useResearchStore } from '@/store/researchStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Bug, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Trash2, 
  Terminal, 
  Globe, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParsedLog {
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'timing';
  category: string;
  message: string;
  raw: string;
}

const parseLogEntry = (log: string): ParsedLog => {
  // Extract timestamp if present
  const timestampMatch = log.match(/^\[(\d{4}-\d{2}-\d{2}T[\d:.Z]+)\]/);
  const timestamp = timestampMatch ? timestampMatch[1] : '';
  const withoutTimestamp = timestampMatch ? log.slice(timestampMatch[0].length).trim() : log;
  
  // Detect type and category
  let type: ParsedLog['type'] = 'info';
  let category = 'general';
  
  if (withoutTimestamp.includes('[ERROR]') || withoutTimestamp.toLowerCase().includes('error')) {
    type = 'error';
    category = 'error';
  } else if (withoutTimestamp.includes('[WARN]') || withoutTimestamp.toLowerCase().includes('warning')) {
    type = 'warning';
    category = 'warning';
  } else if (withoutTimestamp.includes('[SUCCESS]') || withoutTimestamp.includes('✓') || withoutTimestamp.includes('completed')) {
    type = 'success';
    category = 'success';
  } else if (withoutTimestamp.includes('ms:') || withoutTimestamp.includes('[TIMING]') || withoutTimestamp.toLowerCase().includes('duration')) {
    type = 'timing';
    category = 'timing';
  }
  
  // Detect specific categories
  if (withoutTimestamp.includes('[INIT]')) category = 'init';
  else if (withoutTimestamp.includes('[SEARCH]') || withoutTimestamp.includes('web search')) category = 'search';
  else if (withoutTimestamp.includes('[LLM]') || withoutTimestamp.includes('AI')) category = 'llm';
  else if (withoutTimestamp.includes('[SCRAPE]')) category = 'scrape';
  else if (withoutTimestamp.includes('[PLAN]')) category = 'plan';
  else if (withoutTimestamp.includes('[REPORT]')) category = 'report';
  
  return {
    timestamp,
    type,
    category,
    message: withoutTimestamp,
    raw: log
  };
};

const LogIcon = ({ type }: { type: ParsedLog['type'] }) => {
  switch (type) {
    case 'error':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    case 'warning':
      return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    case 'success':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'timing':
      return <Clock className="h-3 w-3 text-blue-500" />;
    default:
      return <Terminal className="h-3 w-3 text-muted-foreground" />;
  }
};

const CategoryBadge = ({ category }: { category: string }) => {
  const variants: Record<string, string> = {
    init: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    search: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    llm: 'bg-green-500/10 text-green-500 border-green-500/20',
    scrape: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    plan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    report: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    timing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn("text-[10px] px-1.5 py-0 font-mono uppercase", variants[category] || '')}
    >
      {category}
    </Badge>
  );
};

export const ResearchDebugPanel: React.FC = () => {
  const { 
    debugLogs, 
    clearDebugLogs, 
    researchSettings,
    currentRunId,
    runHistory,
    agentState
  } = useResearchStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  
  // Don't render if debug panel is disabled
  if (!researchSettings.enableDebugPanel) {
    return null;
  }
  
  const parsedLogs = debugLogs.map(parseLogEntry);
  const filteredLogs = filter 
    ? parsedLogs.filter(log => log.category === filter || log.type === filter)
    : parsedLogs;
  
  const currentRun = runHistory.find(r => r.id === currentRunId);
  
  const copyLogs = () => {
    const text = debugLogs.join('\n');
    navigator.clipboard.writeText(text);
  };
  
  const errorCount = parsedLogs.filter(l => l.type === 'error').length;
  const warningCount = parsedLogs.filter(l => l.type === 'warning').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px]">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3 px-4 flex flex-row items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Debug Panel</CardTitle>
                {debugLogs.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {debugLogs.length}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} errors
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    {warningCount} warnings
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {currentRun && (
                  <div className="flex items-center gap-1.5">
                    {currentRun.status === 'running' && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {currentRun.status}
                    </span>
                  </div>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="p-0">
              {/* Current Run Info */}
              {currentRun && (
                <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Query:</span>
                      <span className="font-medium truncate max-w-[200px]">
                        {currentRun.inputs.query}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentRun.inputs.country && (
                        <Badge variant="outline" className="text-[10px]">
                          {currentRun.inputs.country}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {currentRun.inputs.reportFormat}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Agent State */}
              {agentState && (
                <div className="px-4 py-2 border-b border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Agent State:</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {agentState.state}
                    </Badge>
                  </div>
                  {agentState.plan && (
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground">Plan:</span>
                      <span className="truncate max-w-[200px]">{agentState.plan.query}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Filter Buttons */}
              <div className="px-4 py-2 border-b border-border/50 flex items-center gap-1 flex-wrap">
                <Button 
                  variant={filter === null ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setFilter(null)}
                >
                  All
                </Button>
                <Button 
                  variant={filter === 'error' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setFilter('error')}
                >
                  Errors
                </Button>
                <Button 
                  variant={filter === 'search' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setFilter('search')}
                >
                  Search
                </Button>
                <Button 
                  variant={filter === 'llm' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setFilter('llm')}
                >
                  LLM
                </Button>
                <Button 
                  variant={filter === 'timing' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setFilter('timing')}
                >
                  Timing
                </Button>
              </div>
              
              {/* Logs */}
              <ScrollArea className="h-[250px]">
                <div className="p-2 space-y-1 font-mono text-xs">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No logs yet. Run a research query to see debug output.
                    </div>
                  ) : (
                    filteredLogs.map((log, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex items-start gap-2 p-1.5 rounded hover:bg-muted/50",
                          log.type === 'error' && "bg-destructive/5",
                          log.type === 'warning' && "bg-yellow-500/5"
                        )}
                      >
                        <LogIcon type={log.type} />
                        <CategoryBadge category={log.category} />
                        <span className="flex-1 break-all text-foreground/80">
                          {log.message}
                        </span>
                        {log.timestamp && (
                          <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              {/* Actions */}
              <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {filteredLogs.length} of {debugLogs.length} logs
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={copyLogs}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={clearDebugLogs}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default ResearchDebugPanel;
