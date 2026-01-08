-- Add user_id column to scheduled_research_tasks
ALTER TABLE public.scheduled_research_tasks 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to scheduled_task_runs
ALTER TABLE public.scheduled_task_runs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies on scheduled_research_tasks
DROP POLICY IF EXISTS "Allow public delete to scheduled_research_tasks" ON public.scheduled_research_tasks;
DROP POLICY IF EXISTS "Allow public insert to scheduled_research_tasks" ON public.scheduled_research_tasks;
DROP POLICY IF EXISTS "Allow public read access to scheduled_research_tasks" ON public.scheduled_research_tasks;
DROP POLICY IF EXISTS "Allow public update to scheduled_research_tasks" ON public.scheduled_research_tasks;

-- Drop existing permissive policies on scheduled_task_runs
DROP POLICY IF EXISTS "Allow public insert to scheduled_task_runs" ON public.scheduled_task_runs;
DROP POLICY IF EXISTS "Allow public read access to scheduled_task_runs" ON public.scheduled_task_runs;
DROP POLICY IF EXISTS "Allow public update to scheduled_task_runs" ON public.scheduled_task_runs;

-- Create proper RLS policies for scheduled_research_tasks
CREATE POLICY "Users can view own tasks"
ON public.scheduled_research_tasks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
ON public.scheduled_research_tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
ON public.scheduled_research_tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
ON public.scheduled_research_tasks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create proper RLS policies for scheduled_task_runs
CREATE POLICY "Users can view own task runs"
ON public.scheduled_task_runs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own task runs"
ON public.scheduled_task_runs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task runs"
ON public.scheduled_task_runs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);