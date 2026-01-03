import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, TrendingUp, Users, Link, Lightbulb, Sparkles,
  ChevronRight, ChevronLeft, Check, ArrowRight, X,
  BookOpen, Newspaper, Building2, Globe, Database,
  Zap, Clock, Target, FileText, Play, Minimize2,
  LayoutTemplate, Brain, Settings2, RotateCcw, Mic, MicOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ViewType } from '@/components/Sidebar';
import { toast } from '@/hooks/use-toast';

// ============================================
// TYPES
// ============================================

type ResearchType = 'market' | 'competitor' | 'leads' | 'scraping' | 'hypothesis';
type SourceType = 'academic' | 'news' | 'social' | 'government' | 'corporate';
type AnalysisDepth = 'quick' | 'standard' | 'deep';
type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;
type AvatarPersona = 'researcher' | 'analyst' | 'expert' | 'specialist';
type AvatarExpression = 'default' | 'active' | 'complete';

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
// AVATAR PERSONA CONFIGURATION
// ============================================

const AVATAR_PERSONAS = {
  researcher: {
    name: 'Dr. ZAHRA',
    role: 'Professional Researcher',
    description: 'Expert in comprehensive research methodology',
    primaryColor: '#9333EA', // purple-600
    secondaryColor: '#7C3AED', // primary purple
    accentColor: '#C084FC', // purple-400
  },
  analyst: {
    name: 'ZAHRA Analytics',
    role: 'Data Analyst',
    description: 'Precision-focused data specialist',
    primaryColor: '#3B82F6', // blue-500
    secondaryColor: '#06B6D4', // cyan-500
    accentColor: '#67E8F9', // cyan-300
  },
  expert: {
    name: 'ZAHRA Strategist',
    role: 'Market Expert',
    description: 'Strategic market intelligence',
    primaryColor: '#8B5CF6', // violet-500
    secondaryColor: '#EC4899', // pink-500
    accentColor: '#F472B6', // pink-400
  },
  specialist: {
    name: 'ZAHRA Scout',
    role: 'Lead Specialist',
    description: 'Methodical lead intelligence',
    primaryColor: '#10B981', // emerald-500
    secondaryColor: '#14B8A6', // teal-500
    accentColor: '#5EEAD4', // teal-300
  },
} as const;

// Map research types to appropriate avatar personas
const RESEARCH_TYPE_AVATAR_MAP: Record<ResearchType, AvatarPersona> = {
  market: 'expert',
  competitor: 'researcher',
  leads: 'specialist',
  scraping: 'analyst',
  hypothesis: 'analyst',
};

// Map workflow steps to default avatar personas
const STEP_AVATAR_MAP: Record<WorkflowStep, AvatarPersona> = {
  1: 'researcher',
  2: 'researcher',
  3: 'analyst',
  4: 'analyst',
  5: 'researcher',
  6: 'expert',
};

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
// ILLUSTRATED AVATAR COMPONENT
// ============================================

interface ZahraIllustratedAvatarProps {
  persona: AvatarPersona;
  expression?: AvatarExpression;
  size?: 'sm' | 'md' | 'lg';
  isHovered?: boolean;
}

const ZahraIllustratedAvatar: React.FC<ZahraIllustratedAvatarProps> = ({ 
  persona, 
  expression = 'default',
  size = 'md',
  isHovered = false,
}) => {
  const config = AVATAR_PERSONAS[persona];
  const [localHover, setLocalHover] = useState(false);
  const isActive = isHovered || localHover;
  
  const sizes = {
    sm: { container: 48, face: 32, badge: 16 },
    md: { container: 64, face: 44, badge: 20 },
    lg: { container: 96, face: 64, badge: 28 },
  };
  
  const s = sizes[size];

  // Expression-based eye states
  const eyeStates = {
    default: { scaleY: 1, translateY: 0 },
    active: { scaleY: 0.8, translateY: 1 },
    complete: { scaleY: 1.1, translateY: -0.5 },
  };

  const eyeState = eyeStates[expression];

  // Persona-specific features
  const renderPersonaFeatures = () => {
    switch (persona) {
      case 'researcher':
        return (
          <>
            {/* Glasses */}
            <motion.ellipse
              cx="38"
              cy="42"
              rx="8"
              ry="7"
              fill="none"
              stroke={config.accentColor}
              strokeWidth="1.5"
              opacity={0.9}
            />
            <motion.ellipse
              cx="62"
              cy="42"
              rx="8"
              ry="7"
              fill="none"
              stroke={config.accentColor}
              strokeWidth="1.5"
              opacity={0.9}
            />
            <motion.line x1="46" y1="42" x2="54" y2="42" stroke={config.accentColor} strokeWidth="1.5" opacity={0.9} />
            {/* Book icon in corner */}
            <motion.g transform="translate(70, 65)" animate={isActive ? { rotate: 5 } : { rotate: 0 }}>
              <rect x="0" y="0" width="10" height="12" rx="1" fill={config.primaryColor} opacity={0.8} />
              <line x1="5" y1="2" x2="5" y2="10" stroke="white" strokeWidth="0.5" opacity={0.6} />
            </motion.g>
          </>
        );
      case 'analyst':
        return (
          <>
            {/* Headset */}
            <motion.path
              d="M28 38 Q28 25 50 25 Q72 25 72 38"
              fill="none"
              stroke={config.accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <motion.circle cx="28" cy="42" r="5" fill={config.secondaryColor} opacity={0.9} />
            <motion.circle cx="72" cy="42" r="5" fill={config.secondaryColor} opacity={0.9} />
            {/* Data chart icon */}
            <motion.g transform="translate(68, 64)" animate={isActive ? { scaleY: [1, 1.2, 1] } : {}}>
              <rect x="0" y="6" width="3" height="6" fill={config.primaryColor} opacity={0.8} />
              <rect x="4" y="3" width="3" height="9" fill={config.primaryColor} opacity={0.9} />
              <rect x="8" y="0" width="3" height="12" fill={config.primaryColor} />
            </motion.g>
          </>
        );
      case 'expert':
        return (
          <>
            {/* Confident expression lines */}
            <motion.path
              d="M32 36 L36 34"
              stroke={config.accentColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.6}
            />
            <motion.path
              d="M64 34 L68 36"
              stroke={config.accentColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.6}
            />
            {/* Trending arrow */}
            <motion.g transform="translate(66, 62)" animate={isActive ? { y: -2 } : { y: 0 }}>
              <motion.path
                d="M0 12 L6 6 L12 8 L18 0"
                fill="none"
                stroke={config.primaryColor}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <motion.polygon points="14,0 18,0 18,4" fill={config.primaryColor} />
            </motion.g>
          </>
        );
      case 'specialist':
        return (
          <>
            {/* Focused eyebrows */}
            <motion.line
              x1="34" y1="32" x2="42" y2="34"
              stroke={config.accentColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <motion.line
              x1="58" y1="34" x2="66" y2="32"
              stroke={config.accentColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Target crosshair */}
            <motion.g 
              transform="translate(66, 62)" 
              animate={isActive ? { scale: 1.1, rotate: 45 } : { scale: 1, rotate: 0 }}
            >
              <circle cx="8" cy="8" r="7" fill="none" stroke={config.primaryColor} strokeWidth="1.5" />
              <circle cx="8" cy="8" r="3" fill={config.primaryColor} opacity={0.6} />
              <line x1="8" y1="0" x2="8" y2="4" stroke={config.primaryColor} strokeWidth="1.5" />
              <line x1="8" y1="12" x2="8" y2="16" stroke={config.primaryColor} strokeWidth="1.5" />
              <line x1="0" y1="8" x2="4" y2="8" stroke={config.primaryColor} strokeWidth="1.5" />
              <line x1="12" y1="8" x2="16" y2="8" stroke={config.primaryColor} strokeWidth="1.5" />
            </motion.g>
          </>
        );
    }
  };

  return (
    <motion.div
      className="relative cursor-pointer"
      style={{ width: s.container, height: s.container }}
      onMouseEnter={() => setLocalHover(true)}
      onMouseLeave={() => setLocalHover(false)}
      animate={isActive ? { scale: 1.05 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: config.primaryColor }}
        animate={{ 
          opacity: isActive ? 0.4 : 0.2,
          scale: isActive ? 1.2 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Main avatar SVG */}
      <svg
        viewBox="0 0 100 100"
        className="relative z-10"
        style={{ width: s.container, height: s.container }}
      >
        <defs>
          <linearGradient id={`grad-${persona}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.primaryColor} />
            <stop offset="100%" stopColor={config.secondaryColor} />
          </linearGradient>
          <radialGradient id={`shine-${persona}`} cx="30%" cy="30%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Background circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          fill={`url(#grad-${persona})`}
          animate={{ 
            r: isActive ? 48 : 46,
          }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Shine overlay */}
        <circle cx="50" cy="50" r="46" fill={`url(#shine-${persona})`} />
        
        {/* Face base */}
        <ellipse cx="50" cy="52" rx="28" ry="30" fill="#FDF4E3" opacity={0.95} />
        
        {/* Eyes */}
        <motion.g
          animate={{ 
            scaleY: eyeState.scaleY,
            translateY: eyeState.translateY,
          }}
          style={{ originY: '42px' }}
        >
          <motion.ellipse
            cx="40"
            cy="44"
            rx="4"
            ry="5"
            fill="#2D2D2D"
            animate={isActive ? { scaleX: 1.1 } : { scaleX: 1 }}
          />
          <motion.ellipse
            cx="60"
            cy="44"
            rx="4"
            ry="5"
            fill="#2D2D2D"
            animate={isActive ? { scaleX: 1.1 } : { scaleX: 1 }}
          />
          {/* Eye highlights */}
          <circle cx="42" cy="42" r="1.5" fill="white" opacity={0.9} />
          <circle cx="62" cy="42" r="1.5" fill="white" opacity={0.9} />
        </motion.g>
        
        {/* Smile */}
        <motion.path
          d={expression === 'complete' 
            ? "M38 58 Q50 68 62 58" 
            : expression === 'active'
            ? "M40 60 Q50 64 60 60"
            : "M42 58 Q50 62 58 58"
          }
          fill="none"
          stroke="#2D2D2D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Blush */}
        <motion.ellipse
          cx="32"
          cy="54"
          rx="5"
          ry="3"
          fill={config.accentColor}
          opacity={isActive ? 0.4 : 0.2}
        />
        <motion.ellipse
          cx="68"
          cy="54"
          rx="5"
          ry="3"
          fill={config.accentColor}
          opacity={isActive ? 0.4 : 0.2}
        />
        
        {/* Hair */}
        <motion.path
          d="M26 40 Q26 22 50 20 Q74 22 74 40 Q70 32 50 30 Q30 32 26 40"
          fill={persona === 'analyst' ? '#4A5568' : persona === 'expert' ? '#744210' : persona === 'specialist' ? '#1A365D' : '#2D3748'}
        />
        
        {/* Persona-specific features */}
        {renderPersonaFeatures()}
      </svg>
      
      {/* Status indicator badge */}
      <motion.div
        className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center shadow-lg"
        style={{ 
          width: s.badge, 
          height: s.badge,
          background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})`,
        }}
        animate={isActive ? { scale: 1.2 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          animate={{ rotate: isActive ? 360 : 0 }}
          transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: 'linear' }}
        >
          <Sparkles className="text-white" style={{ width: s.badge * 0.6, height: s.badge * 0.6 }} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// ZAHRA DIALOG PANEL
// ============================================

interface ZahraDialogPanelProps {
  step: WorkflowStep;
  persona: AvatarPersona;
  expression: AvatarExpression;
  topic?: string;
}

const ZahraDialogPanel: React.FC<ZahraDialogPanelProps> = ({ step, persona, expression, topic }) => {
  const dialog = ZAHRA_DIALOGS[step];
  const config = AVATAR_PERSONAS[persona];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex items-start gap-4">
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <ZahraIllustratedAvatar 
          persona={persona} 
          expression={expression}
          size="md" 
          isHovered={isHovered}
        />
      </div>
      <div className="flex-1 space-y-2">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl rounded-tl-sm bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
        >
          {/* Persona info */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold" style={{ color: config.primaryColor }}>
              {config.name}
            </span>
            <span className="text-xs text-muted-foreground">• {config.role}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {step === 2 && topic ? `Researching "${topic}"` : dialog.greeting}
          </p>
          <p className="font-medium" style={{ color: config.primaryColor }}>
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

  const [avatarExpression, setAvatarExpression] = useState<AvatarExpression>('default');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Determine current persona based on research type selection or workflow step
  const currentPersona: AvatarPersona = state.researchType 
    ? RESEARCH_TYPE_AVATAR_MAP[state.researchType]
    : STEP_AVATAR_MAP[state.currentStep];

  // Voice recognition setup
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Speech recognition is not supported in your browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
      setAvatarExpression('active');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        setState(prev => ({ ...prev, topic: prev.topic + final }));
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimTranscript('');
      setAvatarExpression('default');
      if (event.error === 'no-speech') {
        toast({
          title: "No speech detected",
          description: "Please try speaking again.",
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      setAvatarExpression('default');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
    setAvatarExpression('default');
  }, []);

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Update expression based on user activity
  useEffect(() => {
    if (state.currentStep === 6) {
      setAvatarExpression('complete');
    } else if (state.topic.length > 0 || state.researchType || state.sourcePreferences.length > 0) {
      setAvatarExpression('active');
    } else {
      setAvatarExpression('default');
    }
  }, [state.currentStep, state.topic, state.researchType, state.sourcePreferences]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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
    stopListening();
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
            <div className="relative">
              <Input
                value={isListening ? state.topic + interimTranscript : state.topic}
                onChange={(e) => setState(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., Tesla's market position, AI in healthcare..."
                className={cn(
                  "h-12 text-base pr-12 transition-all",
                  isListening && "border-primary ring-2 ring-primary/30"
                )}
                onKeyDown={(e) => e.key === 'Enter' && canProceed() && nextStep()}
                autoFocus
                disabled={isListening}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={isListening ? "default" : "ghost"}
                      size="icon"
                      onClick={toggleVoiceInput}
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 transition-all",
                        isListening && "bg-primary text-primary-foreground animate-pulse"
                      )}
                    >
                      {isListening ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isListening ? "Stop listening" : "Speak your research topic"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Voice listening indicator */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30"
              >
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: [4, 16, 4] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-sm text-primary font-medium">Listening...</span>
              </motion.div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {['Tesla competitors', 'AI market trends 2025', 'SaaS pricing strategies'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, topic: suggestion }))}
                  className="text-xs"
                  disabled={isListening}
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
            persona={currentPersona}
            expression={avatarExpression}
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
