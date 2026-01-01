import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Sparkles, 
  Globe, 
  Building2, 
  Target, 
  Link2, 
  Clock, 
  Mail, 
  Monitor, 
  FileText,
  Plus,
  X,
  Loader2,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CreateScheduledTaskForm, 
  ScheduledResearchTask,
  INDUSTRY_OPTIONS,
  RESEARCH_DEPTH_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  GEOGRAPHIC_FOCUS_OPTIONS,
  SCHEDULE_OPTIONS,
  DAY_OPTIONS,
} from '@/types/scheduledTask';
import { REPORT_FORMAT_OPTIONS } from '@/store/researchStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ScheduledTaskBuilderProps {
  task?: ScheduledResearchTask | null;
  onBack: () => void;
  onSave: (form: CreateScheduledTaskForm) => Promise<void>;
  isSaving: boolean;
}

export function ScheduledTaskBuilder({ task, onBack, onSave, isSaving }: ScheduledTaskBuilderProps) {
  const [form, setForm] = useState<CreateScheduledTaskForm>({
    title: task?.title || '',
    description: task?.description || '',
    industry: task?.industry || '',
    research_depth: task?.research_depth || 'standard',
    source_types: task?.source_types || ['news', 'academic', 'government'],
    geographic_focus: task?.geographic_focus || 'global',
    country: task?.country || '',
    custom_websites: task?.custom_websites || [],
    schedule_type: task?.schedule_type || 'manual',
    schedule_time: task?.schedule_time || '09:00',
    schedule_day_of_week: task?.schedule_day_of_week ?? 1,
    schedule_day_of_month: task?.schedule_day_of_month ?? 1,
    schedule_month: task?.schedule_month ?? 1,
    custom_interval_days: task?.custom_interval_days ?? 7,
    report_format: task?.report_format || 'detailed',
    delivery_method: task?.delivery_method || 'app',
    delivery_email: task?.delivery_email || '',
    execution_mode: task?.execution_mode || 'manual',
    use_ai_enhancer: false,
  });

  const [enhancedDescription, setEnhancedDescription] = useState<string | null>(task?.enhanced_description || null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [newWebsite, setNewWebsite] = useState('');

  const updateForm = <K extends keyof CreateScheduledTaskForm>(key: K, value: CreateScheduledTaskForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleSourceType = (sourceType: string) => {
    setForm(prev => ({
      ...prev,
      source_types: prev.source_types.includes(sourceType)
        ? prev.source_types.filter(s => s !== sourceType)
        : [...prev.source_types, sourceType],
    }));
  };

  const addWebsite = () => {
    if (newWebsite.trim()) {
      let url = newWebsite.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      setForm(prev => ({
        ...prev,
        custom_websites: [...prev.custom_websites, url],
      }));
      setNewWebsite('');
    }
  };

  const removeWebsite = (index: number) => {
    setForm(prev => ({
      ...prev,
      custom_websites: prev.custom_websites.filter((_, i) => i !== index),
    }));
  };

  const handleEnhanceDescription = async () => {
    if (!form.description.trim()) {
      toast.error('Please enter a description first');
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          description: form.description,
          industry: form.industry,
          research_depth: form.research_depth,
          source_types: form.source_types,
          geographic_focus: form.geographic_focus,
          country: form.country,
          custom_websites: form.custom_websites,
        },
      });

      if (error) throw error;

      if (data?.enhanced_description) {
        setEnhancedDescription(data.enhanced_description);
        updateForm('use_ai_enhancer', true);
        toast.success('Description enhanced successfully');
      }
    } catch (error) {
      console.error('Error enhancing description:', error);
      toast.error('Failed to enhance description');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please fill in the title and description');
      return;
    }

    if (form.delivery_method !== 'app' && !form.delivery_email.trim()) {
      toast.error('Please enter an email address for email delivery');
      return;
    }

    await onSave(form);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {task ? 'Edit Research Task' : 'Create Research Task'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your automated research task with guidance filters and AI enhancement
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Task Details
              </CardTitle>
              <CardDescription>Define what you want to research</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Weekly Tech Industry Analysis"
                  value={form.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Research Description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnhanceDescription}
                    disabled={isEnhancing || !form.description.trim()}
                    className="gap-2"
                  >
                    {isEnhancing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    AI Enhance
                  </Button>
                </div>
                <Textarea
                  id="description"
                  placeholder="Describe what you want to research in detail..."
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  className="min-h-[100px] bg-background/50"
                />
              </div>

              {enhancedDescription && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI-Enhanced Description
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnhancedDescription(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm whitespace-pre-wrap">{enhancedDescription}</p>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Research Filters */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Research Filters
              </CardTitle>
              <CardDescription>Customize your research parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Industry */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Industry / Domain
                </Label>
                <Select value={form.industry} onValueChange={(v) => updateForm('industry', v)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Research Depth */}
              <div className="space-y-3">
                <Label>Research Depth</Label>
                <RadioGroup
                  value={form.research_depth}
                  onValueChange={(v) => updateForm('research_depth', v as any)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  {RESEARCH_DEPTH_OPTIONS.map((opt) => (
                    <Label
                      key={opt.value}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                        form.research_depth === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={opt.value} className="mt-0.5" />
                      <div>
                        <span className="font-medium">{opt.label}</span>
                        <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Source Types */}
              <div className="space-y-3">
                <Label>Source Types</Label>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_TYPE_OPTIONS.map((opt) => (
                    <Badge
                      key={opt.value}
                      variant={form.source_types.includes(opt.value) ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer transition-all",
                        form.source_types.includes(opt.value) && "bg-primary"
                      )}
                      onClick={() => toggleSourceType(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Geographic Focus */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Geographic Focus
                  </Label>
                  <Select value={form.geographic_focus} onValueChange={(v) => updateForm('geographic_focus', v)}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {GEOGRAPHIC_FOCUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.geographic_focus === 'country' && (
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      placeholder="e.g., United States"
                      value={form.country}
                      onChange={(e) => updateForm('country', e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                )}
              </div>

              {/* Custom Websites */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Custom Websites to Scrape
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com"
                    value={newWebsite}
                    onChange={(e) => setNewWebsite(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWebsite())}
                    className="bg-background/50"
                  />
                  <Button type="button" variant="outline" onClick={addWebsite}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.custom_websites.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.custom_websites.map((url, index) => (
                      <Badge key={index} variant="secondary" className="gap-1 pr-1">
                        {new URL(url).hostname}
                        <button
                          type="button"
                          onClick={() => removeWebsite(index)}
                          className="ml-1 p-0.5 hover:bg-background/50 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Schedule
              </CardTitle>
              <CardDescription>When should this task run?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select value={form.schedule_type} onValueChange={(v) => updateForm('schedule_type', v as any)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-muted-foreground ml-2">- {opt.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.schedule_type !== 'manual' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={form.schedule_time}
                      onChange={(e) => updateForm('schedule_time', e.target.value)}
                      className="bg-background/50"
                    />
                  </div>

                  {form.schedule_type === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select
                        value={String(form.schedule_day_of_week)}
                        onValueChange={(v) => updateForm('schedule_day_of_week', Number(v))}
                      >
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(form.schedule_type === 'monthly' || form.schedule_type === 'annually') && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={form.schedule_day_of_month || 1}
                        onChange={(e) => updateForm('schedule_day_of_month', Number(e.target.value))}
                        className="bg-background/50"
                      />
                    </div>
                  )}

                  {form.schedule_type === 'annually' && (
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Select
                        value={String(form.schedule_month)}
                        onValueChange={(v) => updateForm('schedule_month', Number(v))}
                      >
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                            <SelectItem key={i} value={String(i + 1)}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {form.schedule_type === 'custom' && (
                    <div className="space-y-2">
                      <Label>Interval (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.custom_interval_days || 7}
                        onChange={(e) => updateForm('custom_interval_days', Number(e.target.value))}
                        className="bg-background/50"
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {form.schedule_type !== 'manual' && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50">
                  <div>
                    <Label className="font-medium">Automatic Execution</Label>
                    <p className="text-sm text-muted-foreground">Run task automatically at scheduled times</p>
                  </div>
                  <Switch
                    checked={form.execution_mode === 'automatic'}
                    onCheckedChange={(checked) => updateForm('execution_mode', checked ? 'automatic' : 'manual')}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Report Delivery
              </CardTitle>
              <CardDescription>How should reports be delivered?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Report Format</Label>
                <RadioGroup
                  value={form.report_format}
                  onValueChange={(v) => updateForm('report_format', v as any)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  {REPORT_FORMAT_OPTIONS.map((opt) => (
                    <Label
                      key={opt.value}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                        form.report_format === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={opt.value} className="mt-0.5" />
                      <div>
                        <span className="font-medium">{opt.label}</span>
                        <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Delivery Method</Label>
                <RadioGroup
                  value={form.delivery_method}
                  onValueChange={(v) => updateForm('delivery_method', v as any)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  <Label
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                      form.delivery_method === 'app'
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value="app" />
                    <Monitor className="w-4 h-4" />
                    <span>In-App Only</span>
                  </Label>
                  <Label
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                      form.delivery_method === 'email'
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value="email" />
                    <Mail className="w-4 h-4" />
                    <span>Email Only</span>
                  </Label>
                  <Label
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                      form.delivery_method === 'both'
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value="both" />
                    <div className="flex gap-1">
                      <Monitor className="w-4 h-4" />
                      <Mail className="w-4 h-4" />
                    </div>
                    <span>Both</span>
                  </Label>
                </RadioGroup>
              </div>

              {form.delivery_method !== 'app' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={form.delivery_email}
                    onChange={(e) => updateForm('delivery_email', e.target.value)}
                    className="bg-background/50"
                  />
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {task ? 'Update Task' : 'Create Task'}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
