import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Wand2,
  ChevronDown,
  Check,
  Zap,
  Calendar,
  Send
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

// Card animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  })
};

// Interactive Card wrapper component
const InteractiveCard = ({ 
  children, 
  index, 
  icon: Icon, 
  title, 
  description,
  isExpanded = true,
  onToggle
}: { 
  children: React.ReactNode; 
  index: number; 
  icon: React.ElementType; 
  title: string; 
  description: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className={cn(
        "bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300 overflow-hidden",
        isHovered && "shadow-lg shadow-primary/10 border-primary/30"
      )}>
        {/* Ambient glow effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-lg"
          animate={{
            background: isHovered 
              ? 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.08) 0%, transparent 60%)'
              : 'transparent'
          }}
          transition={{ duration: 0.3 }}
        />
        
        <CardHeader 
          className={cn(
            "relative cursor-pointer select-none",
            onToggle && "hover:bg-muted/30 transition-colors"
          )}
          onClick={onToggle}
        >
          <CardTitle className="flex items-center gap-2">
            <motion.div
              className="p-1.5 rounded-md bg-primary/10"
              animate={{ 
                scale: isHovered ? 1.1 : 1,
                rotate: isHovered ? [0, -5, 5, 0] : 0
              }}
              transition={{ duration: 0.3 }}
            >
              <Icon className="w-5 h-5 text-primary" />
            </motion.div>
            <span>{title}</span>
            {onToggle && (
              <motion.div
                className="ml-auto"
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            )}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CardContent className="space-y-4 relative">
                {children}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    filters: true,
    schedule: true,
    delivery: true
  });

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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate form completion percentage
  const completionPercentage = [
    form.title.trim(),
    form.description.trim(),
    form.industry,
    form.source_types.length > 0,
    form.schedule_type !== 'manual' ? form.schedule_time : true,
    form.delivery_method !== 'app' ? form.delivery_email.trim() : true
  ].filter(Boolean).length / 6 * 100;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        {/* Back Button */}
        <motion.button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 transition-colors group"
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Tasks
        </motion.button>

        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <motion.h1 
                className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_100%]"
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              >
                {task ? 'Edit Research Task' : 'Create Research Task'}
              </motion.h1>
              <p className="text-muted-foreground mt-1">
                Configure your automated research task with guidance filters and AI enhancement
              </p>
            </div>
            
            {/* Completion Indicator */}
            <motion.div 
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 border border-border/50"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-muted"
                  />
                  <motion.circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={100}
                    strokeDashoffset={100 - completionPercentage}
                    className="text-primary"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 100 - completionPercentage }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {Math.round(completionPercentage)}%
                </span>
              </div>
              <span className="text-sm text-muted-foreground hidden sm:inline">Complete</span>
            </motion.div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <InteractiveCard
            index={0}
            icon={FileText}
            title="Task Details"
            description="Define what you want to research"
            isExpanded={expandedSections.details}
            onToggle={() => toggleSection('details')}
          >
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                Task Title
                {form.title.trim() && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-emerald-500"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </motion.div>
                )}
              </Label>
              <motion.div
                animate={{
                  boxShadow: focusedInput === 'title' 
                    ? '0 0 0 2px hsl(var(--primary)/0.3)' 
                    : '0 0 0 0px transparent'
                }}
                className="rounded-md"
              >
                <Input
                  id="title"
                  placeholder="e.g., Weekly Tech Industry Analysis"
                  value={form.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  onFocus={() => setFocusedInput('title')}
                  onBlur={() => setFocusedInput(null)}
                  className="bg-background/50 transition-all"
                />
              </motion.div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="flex items-center gap-2">
                  Research Description
                  {form.description.trim() && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-emerald-500"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </motion.div>
                  )}
                </Label>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnhanceDescription}
                    disabled={isEnhancing || !form.description.trim()}
                    className="gap-2 group relative overflow-hidden"
                  >
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={!isEnhancing && form.description.trim() ? { x: ['100%', '-100%'] } : { x: '-100%' }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    />
                    {isEnhancing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        <Wand2 className="w-4 h-4" />
                      </motion.div>
                    )}
                    <span className="relative z-10">AI Enhance</span>
                  </Button>
                </motion.div>
              </div>
              <motion.div
                animate={{
                  boxShadow: focusedInput === 'description' 
                    ? '0 0 0 2px hsl(var(--primary)/0.3)' 
                    : '0 0 0 0px transparent'
                }}
                className="rounded-md"
              >
                <Textarea
                  id="description"
                  placeholder="Describe what you want to research in detail..."
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  onFocus={() => setFocusedInput('description')}
                  onBlur={() => setFocusedInput(null)}
                  className="min-h-[100px] bg-background/50 transition-all"
                />
              </motion.div>
              <motion.div 
                className="flex justify-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: form.description.length > 0 ? 0.5 : 0 }}
              >
                <span className="text-xs text-muted-foreground">
                  {form.description.length} characters
                </span>
              </motion.div>
            </div>

            <AnimatePresence>
              {enhancedDescription && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-4 h-4 text-primary" />
                      </motion.div>
                      AI-Enhanced Description
                    </Label>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEnhancedDescription(null)}
                        className="h-7 w-7 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                  <motion.div 
                    className="p-4 rounded-lg bg-primary/5 border border-primary/20 relative overflow-hidden"
                    initial={{ backgroundPosition: '0% 50%' }}
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 10, repeat: Infinity }}
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)/0.05), hsl(var(--primary)/0.1), hsl(var(--primary)/0.05))',
                      backgroundSize: '200% 200%'
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap relative z-10">{enhancedDescription}</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </InteractiveCard>

          {/* Research Filters */}
          <InteractiveCard
            index={1}
            icon={Target}
            title="Research Filters"
            description="Customize your research parameters"
            isExpanded={expandedSections.filters}
            onToggle={() => toggleSection('filters')}
          >
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
                <SelectContent className="bg-popover">
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
                {RESEARCH_DEPTH_OPTIONS.map((opt, idx) => (
                  <motion.div
                    key={opt.value}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Label
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all relative overflow-hidden",
                        form.research_depth === opt.value
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      {form.research_depth === opt.value && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                        />
                      )}
                      <RadioGroupItem value={opt.value} className="mt-0.5 relative z-10" />
                      <div className="relative z-10">
                        <span className="font-medium">{opt.label}</span>
                        <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </div>

            {/* Source Types */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Source Types
                <Badge variant="secondary" className="text-[10px] ml-2">
                  {form.source_types.length} selected
                </Badge>
              </Label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_TYPE_OPTIONS.map((opt, idx) => (
                  <motion.div
                    key={opt.value}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Badge
                      variant={form.source_types.includes(opt.value) ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer transition-all px-3 py-1.5",
                        form.source_types.includes(opt.value) && "bg-primary shadow-md shadow-primary/20"
                      )}
                      onClick={() => toggleSourceType(opt.value)}
                    >
                      {form.source_types.includes(opt.value) && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mr-1"
                        >
                          <Check className="w-3 h-3" />
                        </motion.span>
                      )}
                      {opt.label}
                    </Badge>
                  </motion.div>
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
                  <SelectContent className="bg-popover">
                    {GEOGRAPHIC_FOCUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <AnimatePresence>
                {form.geographic_focus === 'country' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-2"
                  >
                    <Label>Country</Label>
                    <Input
                      placeholder="e.g., United States"
                      value={form.country}
                      onChange={(e) => updateForm('country', e.target.value)}
                      className="bg-background/50"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Custom Websites */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Custom Websites to Scrape
                {form.custom_websites.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {form.custom_websites.length}
                  </Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <motion.div 
                  className="flex-1"
                  animate={{
                    boxShadow: focusedInput === 'website' 
                      ? '0 0 0 2px hsl(var(--primary)/0.3)' 
                      : '0 0 0 0px transparent'
                  }}
                >
                  <Input
                    placeholder="https://example.com"
                    value={newWebsite}
                    onChange={(e) => setNewWebsite(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWebsite())}
                    onFocus={() => setFocusedInput('website')}
                    onBlur={() => setFocusedInput(null)}
                    className="bg-background/50"
                  />
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button type="button" variant="outline" onClick={addWebsite} className="px-3">
                    <Plus className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
              <AnimatePresence>
                {form.custom_websites.length > 0 && (
                  <motion.div 
                    className="flex flex-wrap gap-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {form.custom_websites.map((url, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        layout
                      >
                        <Badge variant="secondary" className="gap-1 pr-1 group">
                          <Link2 className="w-3 h-3 text-muted-foreground" />
                          {new URL(url).hostname}
                          <motion.button
                            type="button"
                            onClick={() => removeWebsite(index)}
                            className="ml-1 p-0.5 hover:bg-destructive/20 hover:text-destructive rounded transition-colors"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="w-3 h-3" />
                          </motion.button>
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </InteractiveCard>

          {/* Schedule */}
          <InteractiveCard
            index={2}
            icon={Clock}
            title="Schedule"
            description="When should this task run?"
            isExpanded={expandedSections.schedule}
            onToggle={() => toggleSection('schedule')}
          >
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <Select value={form.schedule_type} onValueChange={(v) => updateForm('schedule_type', v as any)}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground ml-2">- {opt.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AnimatePresence>
              {form.schedule_type !== 'manual' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Time
                    </Label>
                    <Input
                      type="time"
                      value={form.schedule_time}
                      onChange={(e) => updateForm('schedule_time', e.target.value)}
                      className="bg-background/50"
                    />
                  </motion.div>

                  {form.schedule_type === 'weekly' && (
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Label>Day of Week</Label>
                      <Select
                        value={String(form.schedule_day_of_week)}
                        onValueChange={(v) => updateForm('schedule_day_of_week', Number(v))}
                      >
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {DAY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}

                  {(form.schedule_type === 'monthly' || form.schedule_type === 'annually') && (
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Label>Day of Month</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={form.schedule_day_of_month || 1}
                        onChange={(e) => updateForm('schedule_day_of_month', Number(e.target.value))}
                        className="bg-background/50"
                      />
                    </motion.div>
                  )}

                  {form.schedule_type === 'annually' && (
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Label>Month</Label>
                      <Select
                        value={String(form.schedule_month)}
                        onValueChange={(v) => updateForm('schedule_month', Number(v))}
                      >
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                            <SelectItem key={i} value={String(i + 1)}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}

                  {form.schedule_type === 'custom' && (
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Label>Interval (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.custom_interval_days || 7}
                        onChange={(e) => updateForm('custom_interval_days', Number(e.target.value))}
                        className="bg-background/50"
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {form.schedule_type !== 'manual' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50"
                >
                  <div>
                    <Label className="font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Automatic Execution
                    </Label>
                    <p className="text-sm text-muted-foreground">Run task automatically at scheduled times</p>
                  </div>
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Switch
                      checked={form.execution_mode === 'automatic'}
                      onCheckedChange={(checked) => updateForm('execution_mode', checked ? 'automatic' : 'manual')}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </InteractiveCard>

          {/* Delivery */}
          <InteractiveCard
            index={3}
            icon={Mail}
            title="Report Delivery"
            description="How should reports be delivered?"
            isExpanded={expandedSections.delivery}
            onToggle={() => toggleSection('delivery')}
          >
            <div className="space-y-2">
              <Label>Report Format</Label>
              <RadioGroup
                value={form.report_format}
                onValueChange={(v) => updateForm('report_format', v as any)}
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                {REPORT_FORMAT_OPTIONS.map((opt) => (
                  <motion.div
                    key={opt.value}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Label
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all relative overflow-hidden",
                        form.report_format === opt.value
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      {form.report_format === opt.value && (
                        <motion.div
                          className="absolute top-2 right-2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <Check className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                      <RadioGroupItem value={opt.value} className="mt-0.5" />
                      <div>
                        <span className="font-medium">{opt.label}</span>
                        <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                    </Label>
                  </motion.div>
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
                {[
                  { value: 'app', icon: Monitor, label: 'In-App Only' },
                  { value: 'email', icon: Mail, label: 'Email Only' },
                  { value: 'both', icons: [Monitor, Mail], label: 'Both' }
                ].map((item) => (
                  <motion.div
                    key={item.value}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Label
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all relative",
                        form.delivery_method === item.value
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={item.value} />
                      {'icons' in item ? (
                        <div className="flex gap-1">
                          {item.icons.map((Icon, i) => (
                            <Icon key={i} className="w-4 h-4" />
                          ))}
                        </div>
                      ) : (
                        <item.icon className="w-4 h-4" />
                      )}
                      <span>{item.label}</span>
                      {form.delivery_method === item.value && (
                        <motion.div
                          className="absolute top-2 right-2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <Check className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </div>

            <AnimatePresence>
              {form.delivery_method !== 'app' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label className="flex items-center gap-2">
                    Email Address
                    {form.delivery_email.includes('@') && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-emerald-500"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </motion.div>
                    )}
                  </Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={form.delivery_email}
                    onChange={(e) => updateForm('delivery_email', e.target.value)}
                    className="bg-background/50"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </InteractiveCard>

          {/* Submit */}
          <motion.div 
            className="flex justify-end gap-3 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="button" variant="outline" onClick={onBack} className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                type="submit" 
                disabled={isSaving} 
                className="gap-2 relative overflow-hidden"
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={!isSaving ? { x: ['100%', '-100%'] } : { x: '-100%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    {task ? 'Update Task' : 'Create Task'}
                    <Send className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
