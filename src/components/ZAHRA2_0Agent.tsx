import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, TrendingUp, Users, Link, Lightbulb, Sparkles,
  ChevronRight, ChevronLeft, Check, ArrowRight, X,
  BookOpen, Newspaper, Building2, Globe, Database,
  Zap, Clock, Target, FileText, Play, Minimize2,
  LayoutTemplate, Brain, Settings2, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ViewType } from '@/components/Sidebar';

// ============================================
// TYPES
// ============================================

type ResearchType = 'market' | 'competitor' | 'leads' | 'scraping' | 'hypothesis';
type SourceType = 'academic' | 'news' | 'social' | 'government' | 'corporate';
type AnalysisDepth = 'quick' | 'standard' | 'deep';
type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;

interface ResearchWorkflowState {
  currentStep: WorkflowStep;
  topic: string;
  researchType: ResearchType | null;
  sourcePreferences: SourceType[];
  analysisDepth: AnalysisDepth;
  selectedTemplate: string | null;
}

interface ZAHRA2_0AgentProps {
  className?: string;
  onResearchTriggered?: (query: string) => void;
  onViewChange?: (view: ViewType) => void;
  onTemplateSelected?: (templateId: string, fields: Record<string, string>) => void;
  onMinimize?: () => void;
}

// ============================================
// RESEARCH PERSONALITY STATES
// ============================================

const RESEARCH_PERSONALITIES = {
  analytical: { color: '#3B82F6', name: 'Analytical', icon: Brain },
  curious: { color: '#00D9FF', name: 'Curious', icon: Search },
  confident: { color: '#26C281', name: 'Confident', icon: Target },
  thoughtful: { color: '#9C27B0', name: 'Thoughtful', icon: Lightbulb },
  efficient: { color: '#FFD700', name: 'Efficient', icon: Zap },
} as const;

type ResearchPersonality = keyof typeof RESEARCH_PERSONALITIES;

// ============================================
// STEP CONFIGURATION
// ============================================

const STEPS = [
  { id: 1, title: 'Research Topic', shortTitle: 'Topic' },
  { id: 2, title: 'Research Type', shortTitle: 'Type' },
  { id: 3, title: 'Source Preferences', shortTitle: 'Sources' },
  { id: 4, title: 'Analysis Depth', shortTitle: 'Depth' },
  { id: 5, title: 'Template Selection', shortTitle: 'Template' },
  { id: 6, title: 'Review & Execute', shortTitle: 'Execute' },
] as const;

const RESEARCH_TYPES = [
  { id: 'market' as ResearchType, name: 'Market Research', icon: TrendingUp, description: 'Analyze market trends, size, and opportunities', color: 'from-blue-500 to-cyan-500' },
  { id: 'competitor' as ResearchType, name: 'Competitor Analysis', icon: Building2, description: 'Deep dive into competitor strategies', color: 'from-purple-500 to-pink-500' },
  { id: 'leads' as ResearchType, name: 'Lead Enrichment', icon: Users, description: 'Enrich prospect and company data', color: 'from-green-500 to-emerald-500' },
  { id: 'scraping' as ResearchType, name: 'URL Scraping', icon: Link, description: 'Extract data from specific URLs', color: 'from-orange-500 to-amber-500' },
  { id: 'hypothesis' as ResearchType, name: 'Hypothesis Testing', icon: Lightbulb, description: 'Test and validate theories', color: 'from-yellow-500 to-orange-500' },
];

const SOURCE_TYPES = [
  { id: 'academic' as SourceType, name: 'Academic', icon: BookOpen, description: 'Scholarly papers & journals' },
  { id: 'news' as SourceType, name: 'News', icon: Newspaper, description: 'Recent news articles' },
  { id: 'social' as SourceType, name: 'Social', icon: Users, description: 'Social media & forums' },
  { id: 'government' as SourceType, name: 'Government', icon: Building2, description: 'Official government sources' },
  { id: 'corporate' as SourceType, name: 'Corporate', icon: Globe, description: 'Company websites & reports' },
];

const ANALYSIS_DEPTHS = [
  { id: 'quick' as AnalysisDepth, name: 'Quick Scan', icon: Zap, description: '2-3 minutes • Surface-level insights', time: '2-3 min' },
  { id: 'standard' as AnalysisDepth, name: 'Standard Research', icon: Search, description: '5-10 minutes • Balanced depth', time: '5-10 min' },
  { id: 'deep' as AnalysisDepth, name: 'Deep Investigation', icon: Database, description: '15-30 minutes • Comprehensive analysis', time: '15-30 min' },
];

const TEMPLATE_SUGGESTIONS: Record<ResearchType, { id: string; name: string; description: string }[]> = {
  market: [
    { id: 'market-research', name: 'Market Research', description: 'Analyze market trends and size' },
    { id: 'industry-trends', name: 'Industry Trends', description: 'Identify emerging trends' },
  ],
  competitor: [
    { id: 'competitor-analysis', name: 'Competitor Analysis', description: 'Deep dive into competitors' },
    { id: 'company-deep-dive', name: 'Company Deep Dive', description: 'Comprehensive company research' },
  ],
  leads: [
    { id: 'talent-leadership', name: 'Talent & Leadership', description: 'Research executives and leaders' },
  ],
  scraping: [],
  hypothesis: [
    { id: 'academic-research', name: 'Academic Research', description: 'Literature review and analysis' },
  ],
};

// ============================================
// ZAHRA DIALOG CONTENT
// ============================================

const ZAHRA_DIALOGS: Record<WorkflowStep, { greeting: string; question: string; hint: string }> = {
  1: {
    greeting: "Hello! I'm ZAHRA, your research intelligence assistant.",
    question: "What intelligence are you seeking today?",
    hint: "Enter a topic, company, market, or question you want to research",
  },
  2: {
    greeting: "Excellent topic! Let me understand your research goals.",
    question: "What type of research approach fits your needs?",
    hint: "Select the research methodology that best matches your objective",
  },
  3: {
    greeting: "Good choice! Now let's configure data sources.",
    question: "Which sources should I prioritize for credibility?",
    hint: "Select one or more source types for comprehensive coverage",
  },
  4: {
    greeting: "Sources configured! One more thing to optimize.",
    question: "How thorough should the investigation be?",
    hint: "Balance between speed and comprehensiveness",
  },
  5: {
    greeting: "Almost ready! I found relevant research templates.",
    question: "Would you like to use a pre-built template?",
    hint: "Templates provide structured workflows for common research scenarios",
  },
  6: {
    greeting: "Perfect! Here's your research configuration.",
    question: "Ready to begin your intelligence gathering?",
    hint: "Review your selections and click Execute to start",
  },
};

// ============================================
// STEP INDICATOR COMPONENT
// ============================================

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs text-muted-foreground">
          {STEPS[currentStep - 1].title}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all",
              currentStep > step.id
                ? "bg-primary text-primary-foreground"
                : currentStep === step.id
                ? "bg-primary/20 text-primary border-2 border-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {currentStep > step.id ? (
              <Check className="w-4 h-4" />
            ) : (
              step.id
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// ZAHRA AVATAR COMPONENT
// ============================================

interface ZahraAvatarProps {
  personality: ResearchPersonality;
  size?: 'sm' | 'md' | 'lg';
}

const ZahraAvatar: React.FC<ZahraAvatarProps> = ({ personality, size = 'md' }) => {
  const config = RESEARCH_PERSONALITIES[personality];
  const sizes = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
  };

  return (
    <motion.div
      className={cn(
        "relative rounded-full flex items-center justify-center font-bold text-white shadow-xl",
        sizes[size]
      )}
      style={{
        background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
        boxShadow: `0 0 30px ${config.color}40`,
      }}
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span className="select-none drop-shadow-lg">Z</span>
      <motion.div
        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 flex items-center justify-center"
        style={{ borderColor: config.color, color: config.color }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <config.icon className="w-3 h-3" />
      </motion.div>
    </motion.div>
  );
};

// ============================================
// ZAHRA DIALOG PANEL
// ============================================

interface ZahraDialogPanelProps {
  step: WorkflowStep;
  personality: ResearchPersonality;
  topic?: string;
}

const ZahraDialogPanel: React.FC<ZahraDialogPanelProps> = ({ step, personality, topic }) => {
  const dialog = ZAHRA_DIALOGS[step];
  const config = RESEARCH_PERSONALITIES[personality];

  return (
    <div className="flex items-start gap-4">
      <ZahraAvatar personality={personality} size="md" />
      <div className="flex-1 space-y-2">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl rounded-tl-sm bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
        >
          <p className="text-sm text-muted-foreground mb-2">
            {step === 2 && topic ? `Researching "${topic}"` : dialog.greeting}
          </p>
          <p className="font-medium" style={{ color: config.color }}>
            {dialog.question}
          </p>
        </motion.div>
        <p className="text-xs text-muted-foreground px-2">
          💡 {dialog.hint}
        </p>
      </div>
    </div>
  );
};

// ============================================
// RESEARCH SUMMARY COMPONENT
// ============================================

interface ResearchSummaryProps {
  state: ResearchWorkflowState;
}

const ResearchSummary: React.FC<ResearchSummaryProps> = ({ state }) => {
  const researchTypeInfo = RESEARCH_TYPES.find(t => t.id === state.researchType);
  const depthInfo = ANALYSIS_DEPTHS.find(d => d.id === state.analysisDepth);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="w-4 h-4 text-primary" />
          Research Configuration
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <span className="text-xs text-muted-foreground">Topic</span>
            <span className="text-sm font-medium text-right max-w-[200px] truncate">{state.topic}</span>
          </div>
          
          {researchTypeInfo && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Type</span>
              <Badge variant="secondary" className="gap-1">
                <researchTypeInfo.icon className="w-3 h-3" />
                {researchTypeInfo.name}
              </Badge>
            </div>
          )}
          
          <div className="flex items-start justify-between">
            <span className="text-xs text-muted-foreground">Sources</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
              {state.sourcePreferences.map(s => (
                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>
          
          {depthInfo && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Depth</span>
              <div className="flex items-center gap-2 text-sm">
                <depthInfo.icon className="w-3 h-3 text-muted-foreground" />
                {depthInfo.name}
                <span className="text-xs text-muted-foreground">({depthInfo.time})</span>
              </div>
            </div>
          )}
          
          {state.selectedTemplate && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Template</span>
              <Badge variant="default" className="text-xs">{state.selectedTemplate}</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// MAIN ZAHRA COMPONENT
// ============================================

export const ZAHRA2_0Agent: React.FC<ZAHRA2_0AgentProps> = ({
  className,
  onResearchTriggered,
  onViewChange,
  onTemplateSelected,
  onMinimize,
}) => {
  const [state, setState] = useState<ResearchWorkflowState>({
    currentStep: 1,
    topic: '',
    researchType: null,
    sourcePreferences: ['news', 'corporate'],
    analysisDepth: 'standard',
    selectedTemplate: null,
  });

  const [personality, setPersonality] = useState<ResearchPersonality>('curious');

  // Update personality based on step
  useEffect(() => {
    const personalityMap: Record<WorkflowStep, ResearchPersonality> = {
      1: 'curious',
      2: 'analytical',
      3: 'thoughtful',
      4: 'efficient',
      5: 'analytical',
      6: 'confident',
    };
    setPersonality(personalityMap[state.currentStep]);
  }, [state.currentStep]);

  const goToStep = (step: WorkflowStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const nextStep = () => {
    if (state.currentStep < 6) {
      setState(prev => ({ ...prev, currentStep: (prev.currentStep + 1) as WorkflowStep }));
    }
  };

  const prevStep = () => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: (prev.currentStep - 1) as WorkflowStep }));
    }
  };

  const resetWorkflow = () => {
    setState({
      currentStep: 1,
      topic: '',
      researchType: null,
      sourcePreferences: ['news', 'corporate'],
      analysisDepth: 'standard',
      selectedTemplate: null,
    });
  };

  const handleExecute = () => {
    if (!state.topic.trim()) return;

    // Build the research query
    const researchTypeInfo = RESEARCH_TYPES.find(t => t.id === state.researchType);
    const query = `${researchTypeInfo?.name || 'Research'}: ${state.topic}`;

    // Navigate to appropriate view based on research type
    if (state.researchType === 'leads' && onViewChange) {
      onViewChange('leads');
    } else if (state.researchType === 'scraping' && onViewChange) {
      onViewChange('scraper');
    } else if (state.researchType === 'hypothesis' && onViewChange) {
      onViewChange('hypothesis');
    } else if (state.selectedTemplate && onTemplateSelected) {
      onTemplateSelected(state.selectedTemplate, { topic: state.topic });
    } else if (onResearchTriggered) {
      onResearchTriggered(query);
    }

    // Reset for next research
    resetWorkflow();
  };

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 1: return state.topic.trim().length > 0;
      case 2: return state.researchType !== null;
      case 3: return state.sourcePreferences.length > 0;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  const toggleSource = (source: SourceType) => {
    setState(prev => ({
      ...prev,
      sourcePreferences: prev.sourcePreferences.includes(source)
        ? prev.sourcePreferences.filter(s => s !== source)
        : [...prev.sourcePreferences, source],
    }));
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Input
              value={state.topic}
              onChange={(e) => setState(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g., Tesla's market position, AI in healthcare, Competitor pricing strategies..."
              className="h-12 text-base"
              onKeyDown={(e) => e.key === 'Enter' && canProceed() && nextStep()}
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {['Tesla competitors', 'AI market trends 2025', 'SaaS pricing strategies'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, topic: suggestion }))}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid gap-3">
            {RESEARCH_TYPES.map((type) => (
              <motion.button
                key={type.id}
                onClick={() => setState(prev => ({ ...prev, researchType: type.id }))}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                  state.researchType === type.id
                    ? "border-primary bg-primary/10 shadow-lg"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
                  type.color
                )}>
                  <type.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{type.name}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
                {state.researchType === type.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </motion.button>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="grid grid-cols-2 gap-3">
            {SOURCE_TYPES.map((source) => {
              const isSelected = state.sourcePreferences.includes(source.id);
              return (
                <motion.button
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <source.icon className={cn(
                    "w-6 h-6",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{source.name}</span>
                  <span className="text-xs text-muted-foreground text-center">{source.description}</span>
                  {isSelected && (
                    <Badge variant="default" className="text-xs">Selected</Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        );

      case 4:
        return (
          <div className="space-y-3">
            {ANALYSIS_DEPTHS.map((depth) => (
              <motion.button
                key={depth.id}
                onClick={() => setState(prev => ({ ...prev, analysisDepth: depth.id }))}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                  state.analysisDepth === depth.id
                    ? "border-primary bg-primary/10 shadow-lg"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  state.analysisDepth === depth.id ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <depth.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{depth.name}</span>
                    <Badge variant="outline" className="text-xs">{depth.time}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{depth.description}</div>
                </div>
                {state.analysisDepth === depth.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </motion.button>
            ))}
          </div>
        );

      case 5:
        const templates = state.researchType ? TEMPLATE_SUGGESTIONS[state.researchType] : [];
        return (
          <div className="space-y-4">
            {templates.length > 0 ? (
              <>
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <motion.button
                      key={template.id}
                      onClick={() => setState(prev => ({ 
                        ...prev, 
                        selectedTemplate: prev.selectedTemplate === template.id ? null : template.id 
                      }))}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                        state.selectedTemplate === template.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <LayoutTemplate className={cn(
                        "w-5 h-5",
                        state.selectedTemplate === template.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                      {state.selectedTemplate === template.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </motion.button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setState(prev => ({ ...prev, selectedTemplate: null }))}
                >
                  Skip template selection
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <LayoutTemplate className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No templates available for this research type</p>
                <Button variant="ghost" className="mt-4" onClick={nextStep}>
                  Continue without template
                </Button>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <ResearchSummary state={state} />
            <Button
              size="lg"
              className="w-full gap-2 h-12"
              onClick={handleExecute}
            >
              <Play className="w-5 h-5" />
              Execute Research
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn("flex flex-col h-full bg-card/95 backdrop-blur-xl border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">ZAHRA</h3>
            <p className="text-xs text-muted-foreground">Orkestra Research Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetWorkflow}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          {onMinimize && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMinimize}>
              <Minimize2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="px-4 py-3 border-b border-border/30">
        <StepIndicator currentStep={state.currentStep} totalSteps={6} />
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* ZAHRA Dialog */}
          <ZahraDialogPanel 
            step={state.currentStep} 
            personality={personality}
            topic={state.topic}
          />

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-t border-border/50">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={state.currentStep === 1}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        
        {state.currentStep < 6 && (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

// ============================================
// MOBILE BUTTON COMPONENT
// ============================================

interface ZahraMobileButtonProps {
  onResearchTriggered?: (query: string) => void;
  onViewChange?: (view: ViewType) => void;
}

export const ZahraMobileButton: React.FC<ZahraMobileButtonProps> = ({ 
  onResearchTriggered,
  onViewChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          className="xl:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-2xl shadow-primary/40 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(var(--primary), 0.4)',
              '0 0 40px rgba(var(--primary), 0.6)',
              '0 0 20px rgba(var(--primary), 0.4)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xl font-bold text-primary-foreground">Z</span>
        </motion.button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <ZAHRA2_0Agent 
          className="h-full border-0 rounded-none"
          onResearchTriggered={(query) => {
            onResearchTriggered?.(query);
            setIsOpen(false);
          }}
          onViewChange={(view) => {
            onViewChange?.(view);
            setIsOpen(false);
          }}
          onMinimize={() => setIsOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
};

export default ZAHRA2_0Agent;
