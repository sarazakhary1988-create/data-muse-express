// Scheduled Research Task Types

export type ScheduleType = 'manual' | 'daily' | 'weekly' | 'monthly' | 'annually' | 'custom';
export type ExecutionMode = 'manual' | 'automatic';
export type DeliveryMethod = 'app' | 'email' | 'both';
export type ResearchDepth = 'quick' | 'standard' | 'deep';
export type ReportFormatType = 'detailed' | 'executive' | 'table';

export const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'education', label: 'Education' },
  { value: 'government', label: 'Government & Public Sector' },
  { value: 'legal', label: 'Legal' },
  { value: 'entertainment', label: 'Entertainment & Media' },
  { value: 'other', label: 'Other' },
] as const;

export const RESEARCH_DEPTH_OPTIONS = [
  { value: 'quick', label: 'Quick Overview', description: 'Fast scan, key highlights only' },
  { value: 'standard', label: 'Standard Analysis', description: 'Balanced depth and speed' },
  { value: 'deep', label: 'Deep Dive', description: 'Comprehensive research with verification' },
] as const;

export const SOURCE_TYPE_OPTIONS = [
  { value: 'news', label: 'News & Media' },
  { value: 'academic', label: 'Academic & Research' },
  { value: 'social', label: 'Social Media' },
  { value: 'government', label: 'Government Sources' },
  { value: 'corporate', label: 'Corporate Reports' },
  { value: 'blogs', label: 'Blogs & Forums' },
] as const;

export const GEOGRAPHIC_FOCUS_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'north-america', label: 'North America' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia-pacific', label: 'Asia Pacific' },
  { value: 'middle-east', label: 'Middle East' },
  { value: 'africa', label: 'Africa' },
  { value: 'latin-america', label: 'Latin America' },
  { value: 'country', label: 'Specific Country' },
] as const;

export const SCHEDULE_OPTIONS = [
  { value: 'manual', label: 'Manual Only', description: 'Run on demand' },
  { value: 'daily', label: 'Daily', description: 'Every day at specified time' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
  { value: 'annually', label: 'Annually', description: 'Once a year' },
  { value: 'custom', label: 'Custom Interval', description: 'Set custom day interval' },
] as const;

export const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

export interface ScheduledResearchTask {
  id: string;
  title: string;
  description: string;
  enhanced_description: string | null;
  
  // Filters
  industry: string | null;
  research_depth: ResearchDepth;
  source_types: string[];
  geographic_focus: string | null;
  country: string | null;
  custom_websites: string[];
  
  // Scheduling
  schedule_type: ScheduleType;
  schedule_time: string | null;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  schedule_month: number | null;
  custom_interval_days: number | null;
  next_run_at: string | null;
  last_run_at: string | null;
  
  // Delivery
  report_format: ReportFormatType;
  delivery_method: DeliveryMethod;
  delivery_email: string | null;
  
  // Execution
  execution_mode: ExecutionMode;
  is_active: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ScheduledTaskRun {
  id: string;
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  report_content: string | null;
  report_format: string | null;
  error_message: string | null;
  email_sent: boolean;
  created_at: string;
}

export interface CreateScheduledTaskForm {
  title: string;
  description: string;
  industry: string;
  research_depth: ResearchDepth;
  source_types: string[];
  geographic_focus: string;
  country: string;
  custom_websites: string[];
  schedule_type: ScheduleType;
  schedule_time: string;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  schedule_month: number | null;
  custom_interval_days: number | null;
  report_format: ReportFormatType;
  delivery_method: DeliveryMethod;
  delivery_email: string;
  execution_mode: ExecutionMode;
  use_ai_enhancer: boolean;
}
