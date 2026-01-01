import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Clock, Play, Pause, Trash2, Edit, Mail, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScheduledTasks } from '@/hooks/useScheduledTasks';
import { ScheduledTaskBuilder } from './ScheduledTaskBuilder';
import { ScheduledTaskRunsList } from './ScheduledTaskRunsList';
import { ScheduledResearchTask } from '@/types/scheduledTask';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ScheduledTasksViewProps {
  onBack?: () => void;
}

export function ScheduledTasksView({ onBack }: ScheduledTasksViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledResearchTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ScheduledResearchTask | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const { 
    tasks, 
    runs, 
    isLoading, 
    isCreating: isSaving,
    createTask,
    updateTask,
    deleteTask,
    runTaskNow,
    toggleTaskActive,
    fetchTaskRuns,
  } = useScheduledTasks();

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsCreating(true);
  };

  const handleEditTask = (task: ScheduledResearchTask) => {
    setEditingTask(task);
    setIsCreating(true);
  };

  const handleViewRuns = (task: ScheduledResearchTask) => {
    setSelectedTask(task);
    fetchTaskRuns(task.id);
  };

  const handleDeleteTask = async () => {
    if (deleteConfirm) {
      await deleteTask(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleRunNow = async (task: ScheduledResearchTask) => {
    await runTaskNow(task);
    setSelectedTask(task);
    fetchTaskRuns(task.id);
  };

  const getScheduleLabel = (task: ScheduledResearchTask) => {
    switch (task.schedule_type) {
      case 'manual': return 'Manual';
      case 'daily': return `Daily at ${task.schedule_time || '09:00'}`;
      case 'weekly': return `Weekly on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][task.schedule_day_of_week || 0]}`;
      case 'monthly': return `Monthly on day ${task.schedule_day_of_month || 1}`;
      case 'annually': return 'Annually';
      case 'custom': return `Every ${task.custom_interval_days} days`;
      default: return task.schedule_type;
    }
  };

  const getDeliveryIcon = (method: string) => {
    switch (method) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'app': return <Monitor className="w-4 h-4" />;
      case 'both': return <><Monitor className="w-4 h-4" /><Mail className="w-4 h-4" /></>;
      default: return null;
    }
  };

  if (isCreating) {
    return (
      <ScheduledTaskBuilder
        task={editingTask}
        onBack={() => setIsCreating(false)}
        onSave={async (form) => {
          if (editingTask) {
            await updateTask(editingTask.id, form as any);
          } else {
            await createTask(form);
          }
          setIsCreating(false);
        }}
        isSaving={isSaving}
      />
    );
  }

  if (selectedTask) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => setSelectedTask(null)}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 transition-colors"
          >
            ← Back to Tasks
          </button>
          
          <Card className="mb-6 bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedTask.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTask.enhanced_description || selectedTask.description}
                  </p>
                </div>
                <Button onClick={() => handleRunNow(selectedTask)} size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  Run Now
                </Button>
              </div>
            </CardHeader>
          </Card>
          
          <ScheduledTaskRunsList 
            runs={runs.filter(r => r.task_id === selectedTask.id)} 
            task={selectedTask}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 transition-colors"
          >
            ← Back to Search
          </button>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Scheduled Research Tasks
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage automated research tasks with custom schedules
            </p>
          </div>
          <Button onClick={handleCreateTask} className="gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active">Active Tasks</TabsTrigger>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="runs">Recent Runs</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.filter(t => t.is_active).length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Tasks</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first scheduled research task to automate your research workflow.
                  </p>
                  <Button onClick={handleCreateTask}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tasks.filter(t => t.is_active).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={(id) => setDeleteConfirm(id)}
                    onToggleActive={toggleTaskActive}
                    onRunNow={handleRunNow}
                    onViewRuns={handleViewRuns}
                    getScheduleLabel={getScheduleLabel}
                    getDeliveryIcon={getDeliveryIcon}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {tasks.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">No tasks created yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={(id) => setDeleteConfirm(id)}
                    onToggleActive={toggleTaskActive}
                    onRunNow={handleRunNow}
                    onViewRuns={handleViewRuns}
                    getScheduleLabel={getScheduleLabel}
                    getDeliveryIcon={getDeliveryIcon}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="runs">
            <ScheduledTaskRunsList runs={runs} task={null} />
          </TabsContent>
        </Tabs>

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this scheduled task? This action cannot be undone.
                All associated run history will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}

interface TaskCardProps {
  task: ScheduledResearchTask;
  onEdit: (task: ScheduledResearchTask) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onRunNow: (task: ScheduledResearchTask) => void;
  onViewRuns: (task: ScheduledResearchTask) => void;
  getScheduleLabel: (task: ScheduledResearchTask) => string;
  getDeliveryIcon: (method: string) => React.ReactNode;
}

function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onToggleActive, 
  onRunNow,
  onViewRuns,
  getScheduleLabel,
  getDeliveryIcon,
}: TaskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card className={cn(
        "bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all cursor-pointer",
        !task.is_active && "opacity-60"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0" onClick={() => onViewRuns(task)}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold truncate">{task.title}</h3>
                <Badge variant={task.execution_mode === 'automatic' ? 'default' : 'secondary'} className="text-xs">
                  {task.execution_mode === 'automatic' ? 'Auto' : 'Manual'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {task.report_format}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {task.enhanced_description || task.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getScheduleLabel(task)}
                </span>
                
                {task.industry && (
                  <Badge variant="outline" className="text-xs">
                    {task.industry}
                  </Badge>
                )}
                
                <span className="flex items-center gap-1">
                  {getDeliveryIcon(task.delivery_method)}
                  {task.delivery_method === 'both' ? 'App + Email' : task.delivery_method}
                </span>
                
                {task.next_run_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Next: {format(new Date(task.next_run_at), 'MMM d, HH:mm')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={task.is_active}
                onCheckedChange={(checked) => onToggleActive(task.id, checked)}
              />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onRunNow(task);
                }}
                title="Run Now"
              >
                <Play className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
