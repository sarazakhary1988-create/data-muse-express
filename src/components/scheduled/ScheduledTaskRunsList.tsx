import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  FileText, 
  Mail,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScheduledTaskRun, ScheduledResearchTask } from '@/types/scheduledTask';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScheduledTaskRunsListProps {
  runs: ScheduledTaskRun[];
  task: ScheduledResearchTask | null;
}

export function ScheduledTaskRunsList({ runs, task }: ScheduledTaskRunsListProps) {
  const [selectedRun, setSelectedRun] = useState<ScheduledTaskRun | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'running':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'pending':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return '';
    }
  };

  if (runs.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Runs Yet</h3>
          <p className="text-muted-foreground text-center">
            {task 
              ? "This task hasn't been executed yet. Click 'Run Now' to start."
              : "No task executions found."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-semibold text-lg mb-4">Execution History</h3>
        {runs.map((run) => (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className={cn(
              "bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all cursor-pointer"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(run.status)}>
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </Badge>
                        {run.report_format && (
                          <Badge variant="secondary" className="text-xs">
                            {run.report_format}
                          </Badge>
                        )}
                        {run.email_sent && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Mail className="w-3 h-3" />
                            Sent
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {run.started_at
                          ? `Started: ${format(new Date(run.started_at), 'MMM d, yyyy HH:mm')}`
                          : `Created: ${format(new Date(run.created_at), 'MMM d, yyyy HH:mm')}`}
                        {run.completed_at && (
                          <span className="ml-3">
                            Duration: {Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at!).getTime()) / 1000)}s
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {run.status === 'completed' && run.report_content && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRun(run)}
                        className="gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        View Report
                      </Button>
                    )}
                    {run.status === 'failed' && run.error_message && (
                      <span className="text-sm text-destructive">{run.error_message}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Research Report
              {selectedRun?.report_format && (
                <Badge variant="secondary">{selectedRun.report_format}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {selectedRun?.report_content && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedRun.report_content}
                </ReactMarkdown>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
