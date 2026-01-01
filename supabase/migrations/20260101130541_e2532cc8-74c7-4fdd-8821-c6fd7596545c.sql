-- Create scheduled_research_tasks table
CREATE TABLE public.scheduled_research_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Task description and settings
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  enhanced_description TEXT, -- AI-enhanced version
  
  -- Filters/Guidance
  industry TEXT, -- Technology, Healthcare, Finance, Marketing, etc.
  research_depth TEXT NOT NULL DEFAULT 'standard', -- quick, standard, deep
  source_types TEXT[] DEFAULT ARRAY['news', 'academic', 'government'], -- news, academic, social, government, custom
  geographic_focus TEXT, -- Global, Regional, Country-specific
  country TEXT, -- Specific country if geographic_focus is country
  custom_websites TEXT[] DEFAULT ARRAY[]::TEXT[], -- Custom websites to scrape
  
  -- Scheduling
  schedule_type TEXT NOT NULL DEFAULT 'manual', -- manual, daily, weekly, monthly, annually, custom
  schedule_time TIME, -- Time of day to run
  schedule_day_of_week INTEGER, -- 0-6 for weekly
  schedule_day_of_month INTEGER, -- 1-31 for monthly
  schedule_month INTEGER, -- 1-12 for annually
  custom_interval_days INTEGER, -- For custom intervals
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery
  report_format TEXT NOT NULL DEFAULT 'detailed', -- detailed, executive, table
  delivery_method TEXT NOT NULL DEFAULT 'app', -- app, email, both
  delivery_email TEXT, -- Email address for delivery
  
  -- Execution settings
  execution_mode TEXT NOT NULL DEFAULT 'manual', -- manual, automatic
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_task_runs table to track executions
CREATE TABLE public.scheduled_task_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.scheduled_research_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  report_content TEXT,
  report_format TEXT,
  error_message TEXT,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_scheduled_tasks_next_run ON public.scheduled_research_tasks(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_tasks_schedule_type ON public.scheduled_research_tasks(schedule_type);
CREATE INDEX idx_task_runs_task_id ON public.scheduled_task_runs(task_id);
CREATE INDEX idx_task_runs_status ON public.scheduled_task_runs(status);

-- Enable RLS
ALTER TABLE public.scheduled_research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_task_runs ENABLE ROW LEVEL SECURITY;

-- For now, allow public access (no auth required) - can be restricted later
CREATE POLICY "Allow public read access to scheduled_research_tasks"
ON public.scheduled_research_tasks FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to scheduled_research_tasks"
ON public.scheduled_research_tasks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to scheduled_research_tasks"
ON public.scheduled_research_tasks FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete to scheduled_research_tasks"
ON public.scheduled_research_tasks FOR DELETE
USING (true);

CREATE POLICY "Allow public read access to scheduled_task_runs"
ON public.scheduled_task_runs FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to scheduled_task_runs"
ON public.scheduled_task_runs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to scheduled_task_runs"
ON public.scheduled_task_runs FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_scheduled_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scheduled_research_tasks_updated_at
BEFORE UPDATE ON public.scheduled_research_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_scheduled_task_updated_at();

-- Enable realtime for task runs
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_task_runs;