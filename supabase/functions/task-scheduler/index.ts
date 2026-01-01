import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  schedule_type: 'manual' | 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_time?: string;
  schedule_day_of_week?: number;
  schedule_day_of_month?: number;
  custom_interval_days?: number;
  is_active: boolean;
  next_run_at?: string;
  last_run_at?: string;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

function calculateNextRun(task: ScheduledTask): string | null {
  const now = new Date();
  let nextRun: Date;

  switch (task.schedule_type) {
    case 'daily': {
      nextRun = new Date(now);
      if (task.schedule_time) {
        const [hours, minutes] = task.schedule_time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
      }
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    }
    case 'weekly': {
      nextRun = new Date(now);
      const targetDay = task.schedule_day_of_week ?? 1; // Monday default
      const currentDay = nextRun.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      nextRun.setDate(nextRun.getDate() + daysUntil);
      if (task.schedule_time) {
        const [hours, minutes] = task.schedule_time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
      }
      break;
    }
    case 'monthly': {
      nextRun = new Date(now);
      const targetDayOfMonth = task.schedule_day_of_month ?? 1;
      nextRun.setDate(targetDayOfMonth);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      if (task.schedule_time) {
        const [hours, minutes] = task.schedule_time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
      }
      break;
    }
    case 'custom': {
      if (!task.custom_interval_days) return null;
      nextRun = new Date(task.last_run_at || now);
      nextRun.setDate(nextRun.getDate() + task.custom_interval_days);
      if (nextRun <= now) {
        nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + task.custom_interval_days);
      }
      break;
    }
    default:
      return null;
  }

  return nextRun.toISOString();
}

async function runTask(taskId: string): Promise<{ success: boolean; runId?: string; error?: string }> {
  const supabase = getSupabaseClient();
  
  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('scheduled_research_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { success: false, error: 'Task not found' };
  }

  // Create run record
  const { data: run, error: runError } = await supabase
    .from('scheduled_task_runs')
    .insert({
      task_id: taskId,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError) {
    console.error('Failed to create run record:', runError);
    return { success: false, error: 'Failed to create run record' };
  }

  try {
    // Call research orchestrator
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const response = await fetch(`${supabaseUrl}/functions/v1/research-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        query: task.enhanced_description || task.description,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Research failed: ${response.status}`);
    }

    const result = await response.json();

    // Update run with results
    await supabase
      .from('scheduled_task_runs')
      .update({
        status: result.status === 'completed' ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        report_content: result.report ? JSON.stringify(result.report) : null,
        report_format: task.report_format,
        error_message: result.error,
      })
      .eq('id', run.id);

    // Update task with last run info and calculate next run
    const nextRunAt = calculateNextRun(task);
    await supabase
      .from('scheduled_research_tasks')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunAt,
      })
      .eq('id', taskId);

    // Send email if configured
    if (task.delivery_method === 'email' && task.delivery_email && result.report) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-report-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            to: task.delivery_email,
            subject: `Research Report: ${task.title}`,
            report: result.report,
          }),
        });

        await supabase
          .from('scheduled_task_runs')
          .update({ email_sent: true })
          .eq('id', run.id);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    return { success: true, runId: run.id };

  } catch (error) {
    console.error('Task execution failed:', error);
    
    await supabase
      .from('scheduled_task_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', run.id);

    return { success: false, runId: run.id, error: String(error) };
  }
}

async function checkAndRunDueTasks(): Promise<{ ran: number; errors: number }> {
  const supabase = getSupabaseClient();
  
  // Find tasks that are due
  const now = new Date().toISOString();
  const { data: dueTasks, error } = await supabase
    .from('scheduled_research_tasks')
    .select('id, title')
    .eq('is_active', true)
    .not('schedule_type', 'eq', 'manual')
    .lte('next_run_at', now);

  if (error) {
    console.error('Failed to fetch due tasks:', error);
    return { ran: 0, errors: 1 };
  }

  console.log(`[Scheduler] Found ${dueTasks?.length || 0} due tasks`);

  let ran = 0;
  let errors = 0;

  for (const task of dueTasks || []) {
    console.log(`[Scheduler] Running task: ${task.title}`);
    const result = await runTask(task.id);
    if (result.success) {
      ran++;
    } else {
      errors++;
    }
  }

  return { ran, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/task-scheduler', '');

  try {
    // POST /schedule - Create or update a scheduled task
    if (req.method === 'POST' && path === '/schedule') {
      const taskData = await req.json();
      const supabase = getSupabaseClient();

      // Calculate next run time
      const nextRunAt = calculateNextRun(taskData);

      if (taskData.id) {
        // Update existing task
        const { data, error } = await supabase
          .from('scheduled_research_tasks')
          .update({
            ...taskData,
            next_run_at: nextRunAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskData.id)
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, task: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Create new task
        const { data, error } = await supabase
          .from('scheduled_research_tasks')
          .insert({
            ...taskData,
            next_run_at: nextRunAt,
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, task: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // POST /run/:id - Manually run a task
    if (req.method === 'POST' && path.startsWith('/run/')) {
      const taskId = path.replace('/run/', '');
      const result = await runTask(taskId);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // POST /check - Check and run all due tasks (called by cron)
    if (req.method === 'POST' && path === '/check') {
      const result = await checkAndRunDueTasks();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Checked scheduled tasks: ${result.ran} ran, ${result.errors} errors` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /tasks - List all scheduled tasks
    if (req.method === 'GET' && (path === '/tasks' || path === '')) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('scheduled_research_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ tasks: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /tasks/:id - Delete a task
    if (req.method === 'DELETE' && path.startsWith('/tasks/')) {
      const taskId = path.replace('/tasks/', '');
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('scheduled_research_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Scheduler] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
