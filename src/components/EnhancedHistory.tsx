import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  ChevronRight,
  Search,
  Calendar,
  RefreshCw,
  Filter,
  FileText,
  BarChart3,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResearchTask, useResearchStore } from '@/store/researchStore';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

interface EnhancedHistoryProps {
  onSelectTask: (task: ResearchTask) => void;
  onRerunQuery: (query: string) => void;
}

// Persistent history storage key
const HISTORY_STORAGE_KEY = 'research-history-v1';

interface PersistedHistoryEntry {
  id: string;
  query: string;
  status: ResearchTask['status'];
  createdAt: string;
  completedAt?: string;
  resultsCount?: number;
}

export const EnhancedHistory = ({ onSelectTask, onRerunQuery }: EnhancedHistoryProps) => {
  const { tasks, currentTask, clearTasks, reports } = useResearchStore();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ResearchTask['status']>('all');
  const [persistedHistory, setPersistedHistory] = useState<PersistedHistoryEntry[]>([]);

  // Load persisted history on mount
  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      try {
        setPersistedHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
  }, []);

  // Save tasks to persistent history
  useEffect(() => {
    if (tasks.length > 0) {
      const newEntries: PersistedHistoryEntry[] = tasks.map(task => ({
        id: task.id,
        query: task.query,
        status: task.status,
        createdAt: task.createdAt.toISOString ? task.createdAt.toISOString() : String(task.createdAt),
        completedAt: task.completedAt ? (task.completedAt.toISOString ? task.completedAt.toISOString() : String(task.completedAt)) : undefined,
        resultsCount: task.results?.length || 0,
      }));
      
      // Merge with existing, avoiding duplicates
      const merged = [...newEntries];
      persistedHistory.forEach(existing => {
        if (!merged.find(n => n.id === existing.id)) {
          merged.push(existing);
        }
      });
      
      // Keep last 100 entries
      const trimmed = merged.slice(0, 100);
      setPersistedHistory(trimmed);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
    }
  }, [tasks]);

  // Combine current tasks with persisted history
  const allHistory: ResearchTask[] = [...tasks.map(task => ({
    ...task,
    createdAt: new Date(task.createdAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
  }))];

  // Add persisted entries that aren't in current tasks
  persistedHistory.forEach(entry => {
    if (!allHistory.find(t => t.id === entry.id)) {
      allHistory.push({
        id: entry.id,
        query: entry.query,
        status: entry.status,
        progress: entry.status === 'completed' ? 100 : 0,
        results: [],
        createdAt: new Date(entry.createdAt),
        completedAt: entry.completedAt ? new Date(entry.completedAt) : undefined,
      } as ResearchTask);
    }
  });

  // Sort by date descending
  allHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter history
  const filteredHistory = allHistory.filter(task => {
    // Search filter
    if (searchQuery && !task.query.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    
    // Date filter
    const taskDate = new Date(task.createdAt);
    if (dateFilter === 'today' && !isToday(taskDate)) return false;
    if (dateFilter === 'week' && !isThisWeek(taskDate)) return false;
    if (dateFilter === 'month' && !isThisMonth(taskDate)) return false;
    
    return true;
  });

  // Group by date
  const groupedHistory = filteredHistory.reduce((groups, task) => {
    const date = new Date(task.createdAt);
    let label: string;
    
    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else if (isThisWeek(date)) {
      label = 'This Week';
    } else if (isThisMonth(date)) {
      label = 'This Month';
    } else {
      label = format(date, 'MMMM yyyy');
    }
    
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(task);
    return groups;
  }, {} as Record<string, ResearchTask[]>);

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
      pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
      processing: { label: 'Processing', className: 'bg-primary/10 text-primary' },
      completed: { label: 'Completed', className: 'bg-accent/10 text-accent' },
      failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive' },
    };
    return variants[status];
  };

  const handleClearHistory = () => {
    clearTasks();
    setPersistedHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  // Stats
  const totalQueries = allHistory.length;
  const completedQueries = allHistory.filter(t => t.status === 'completed').length;
  const successRate = totalQueries > 0 ? Math.round((completedQueries / totalQueries) * 100) : 0;

  if (allHistory.length === 0 && filteredHistory.length === 0) {
    return (
      <Card variant="glass" className="h-fit" dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="py-12 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <History className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No Research History</p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              Your research queries will appear here
            </p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Total Queries</span>
          </div>
          <p className="text-2xl font-bold">{totalQueries}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-accent">Reports</span>
          </div>
          <p className="text-2xl font-bold">{reports.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-green-500">Success Rate</span>
          </div>
          <p className="text-2xl font-bold">{successRate}%</p>
        </motion.div>
      </div>

      {/* Filters */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Research History
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
              <SelectTrigger className="w-32 h-9">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-32 h-9">
                <Filter className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="px-4 pb-4">
              {Object.entries(groupedHistory).map(([dateLabel, groupTasks], groupIndex) => (
                <div key={dateLabel} className="mb-6">
                  <div className="sticky top-0 bg-card/80 backdrop-blur-sm py-2 mb-2 z-10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {dateLabel}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {groupTasks.map((task, index) => {
                      const statusBadge = getStatusBadge(task.status);
                      const isActive = currentTask?.id === task.id;

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={cn(
                            "group p-3 rounded-lg transition-all border border-transparent",
                            isActive 
                              ? "bg-primary/10 border-primary/30" 
                              : "hover:bg-muted/50 hover:border-border/50"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">{getStatusIcon(task.status)}</div>
                            
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => onSelectTask(task)}
                                className="text-left w-full"
                              >
                                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                                  {task.query}
                                </p>
                              </button>
                              
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge variant="secondary" className={cn("text-[10px]", statusBadge.className)}>
                                  {statusBadge.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(task.createdAt), 'MMM d, h:mm a')}
                                </span>
                                {task.results?.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    • {task.results.length} results
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onRerunQuery(task.query)}
                                title="Re-run this query"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onSelectTask(task)}
                                title="View results"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredHistory.length === 0 && (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No matching results</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
