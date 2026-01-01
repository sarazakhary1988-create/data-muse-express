import { motion } from 'framer-motion';
import { History, Clock, CheckCircle, XCircle, Trash2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResearchTask, useResearchStore } from '@/store/researchStore';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface TaskHistoryProps {
  onSelectTask: (task: ResearchTask) => void;
}

export const TaskHistory = ({ onSelectTask }: TaskHistoryProps) => {
  const { tasks, currentTask, clearTasks } = useResearchStore();
  const { t, isRTL } = useLanguage();

  const getStatusIcon = (status: ResearchTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'processing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="w-4 h-4 text-primary" />
          </motion.div>
        );
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ResearchTask['status']) => {
    const variants: Record<ResearchTask['status'], { label: string; className: string }> = {
      pending: { label: t.history.status.pending, className: 'bg-muted text-muted-foreground' },
      processing: { label: t.history.status.processing, className: 'bg-primary/10 text-primary' },
      completed: { label: t.history.status.completed, className: 'bg-accent/10 text-accent' },
      failed: { label: t.history.status.failed, className: 'bg-destructive/10 text-destructive' },
    };
    return variants[status];
  };

  if (tasks.length === 0) {
    return (
      <Card variant="glass" className="h-fit" dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="py-12 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">{t.history.noHistory}</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {t.history.noHistoryDesc}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="h-fit" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            {t.history.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTasks}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {t.history.clear}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="px-4 pb-4 space-y-2">
            {tasks.map((task, index) => {
              const statusBadge = getStatusBadge(task.status);
              const isActive = currentTask?.id === task.id;

              return (
                <motion.button
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectTask(task)}
                  className={`w-full text-left p-3 rounded-lg transition-all group ${
                    isActive 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getStatusIcon(task.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {task.query}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className={`text-xs ${statusBadge.className}`}>
                          {statusBadge.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
