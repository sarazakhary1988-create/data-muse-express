import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScheduledResearchTask, ScheduledTaskRun, CreateScheduledTaskForm } from '@/types/scheduledTask';
import { toast } from 'sonner';

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledResearchTask[]>([]);
  const [runs, setRuns] = useState<ScheduledTaskRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_research_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data as ScheduledResearchTask[]);
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error);
      toast.error('Failed to load scheduled tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTaskRuns = useCallback(async (taskId?: string) => {
    try {
      let query = supabase
        .from('scheduled_task_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (taskId) {
        query = query.eq('task_id', taskId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRuns(data as ScheduledTaskRun[]);
    } catch (error) {
      console.error('Error fetching task runs:', error);
    }
  }, []);

  const createTask = useCallback(async (form: CreateScheduledTaskForm): Promise<ScheduledResearchTask | null> => {
    setIsCreating(true);
    try {
      // Calculate next_run_at based on schedule
      let next_run_at: string | null = null;
      if (form.schedule_type !== 'manual' && form.execution_mode === 'automatic') {
        const now = new Date();
        const [hours, minutes] = (form.schedule_time || '09:00').split(':').map(Number);
        
        switch (form.schedule_type) {
          case 'daily':
            next_run_at = new Date(now.setHours(hours, minutes, 0, 0)).toISOString();
            if (new Date(next_run_at) <= new Date()) {
              next_run_at = new Date(new Date(next_run_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
            }
            break;
          case 'weekly':
            const targetDay = form.schedule_day_of_week ?? 1;
            const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
            next_run_at = new Date(now.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'monthly':
            const targetDate = form.schedule_day_of_month ?? 1;
            const nextMonth = new Date(now.getFullYear(), now.getMonth(), targetDate, hours, minutes);
            if (nextMonth <= now) {
              nextMonth.setMonth(nextMonth.getMonth() + 1);
            }
            next_run_at = nextMonth.toISOString();
            break;
          case 'annually':
            const targetMonth = (form.schedule_month ?? 1) - 1;
            const annualDate = new Date(now.getFullYear(), targetMonth, form.schedule_day_of_month ?? 1, hours, minutes);
            if (annualDate <= now) {
              annualDate.setFullYear(annualDate.getFullYear() + 1);
            }
            next_run_at = annualDate.toISOString();
            break;
          case 'custom':
            const intervalDays = form.custom_interval_days ?? 7;
            next_run_at = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
            break;
        }
      }

      const { data, error } = await supabase
        .from('scheduled_research_tasks')
        .insert({
          title: form.title,
          description: form.description,
          enhanced_description: form.use_ai_enhancer ? null : null, // Will be set by AI enhancer
          industry: form.industry || null,
          research_depth: form.research_depth,
          source_types: form.source_types,
          geographic_focus: form.geographic_focus || null,
          country: form.country || null,
          custom_websites: form.custom_websites,
          schedule_type: form.schedule_type,
          schedule_time: form.schedule_time || null,
          schedule_day_of_week: form.schedule_day_of_week,
          schedule_day_of_month: form.schedule_day_of_month,
          schedule_month: form.schedule_month,
          custom_interval_days: form.custom_interval_days,
          next_run_at,
          report_format: form.report_format,
          delivery_method: form.delivery_method,
          delivery_email: form.delivery_email || null,
          execution_mode: form.execution_mode,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      
      setTasks(prev => [data as ScheduledResearchTask, ...prev]);
      toast.success('Scheduled task created successfully');
      return data as ScheduledResearchTask;
    } catch (error) {
      console.error('Error creating scheduled task:', error);
      toast.error('Failed to create scheduled task');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<ScheduledResearchTask>) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_research_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === id ? data as ScheduledResearchTask : t));
      toast.success('Task updated successfully');
      return data as ScheduledResearchTask;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      return null;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_research_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      return false;
    }
  }, []);

  const runTaskNow = useCallback(async (task: ScheduledResearchTask) => {
    try {
      // Create a run record
      const { data: runData, error: runError } = await supabase
        .from('scheduled_task_runs')
        .insert({
          task_id: task.id,
          status: 'pending',
        })
        .select()
        .single();

      if (runError) throw runError;

      toast.success('Task execution started');
      setRuns(prev => [runData as ScheduledTaskRun, ...prev]);
      
      // Trigger the edge function to execute immediately
      supabase.functions.invoke('execute-scheduled-task', {
        body: { taskId: task.id, runId: runData.id },
      }).catch(err => {
        console.error('Error invoking execute-scheduled-task:', err);
      });
      
      return runData as ScheduledTaskRun;
    } catch (error) {
      console.error('Error starting task run:', error);
      toast.error('Failed to start task execution');
      return null;
    }
  }, []);

  const toggleTaskActive = useCallback(async (id: string, isActive: boolean) => {
    return updateTask(id, { is_active: isActive });
  }, [updateTask]);

  // Subscribe to realtime updates for task runs
  useEffect(() => {
    const channel = supabase
      .channel('scheduled-task-runs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_task_runs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRuns(prev => [payload.new as ScheduledTaskRun, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRuns(prev => prev.map(r => r.id === payload.new.id ? payload.new as ScheduledTaskRun : r));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchTaskRuns();
  }, [fetchTasks, fetchTaskRuns]);

  return {
    tasks,
    runs,
    isLoading,
    isCreating,
    fetchTasks,
    fetchTaskRuns,
    createTask,
    updateTask,
    deleteTask,
    runTaskNow,
    toggleTaskActive,
  };
}
