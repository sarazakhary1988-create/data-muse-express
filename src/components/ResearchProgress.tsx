import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Globe, Brain, FileSearch, FileText, AlertCircle, Shield, ShieldCheck, Map, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DeepVerifySource } from '@/store/researchStore';

interface ResearchStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  description: string;
}

interface ResearchProgressProps {
  steps: ResearchStep[];
  currentProgress: number;
  deepVerifyMode?: boolean;
  deepVerifySources?: DeepVerifySource[];
}

const stepIcons = {
  analyze: Brain,
  search: Globe,
  extract: FileSearch,
  compile: FileText,
};

const getSourceStatusIcon = (status: DeepVerifySource['status']) => {
  switch (status) {
    case 'completed':
      return <Check className="w-3 h-3" />;
    case 'mapping':
      return <Map className="w-3 h-3 animate-pulse" />;
    case 'scraping':
      return <Database className="w-3 h-3 animate-pulse" />;
    case 'failed':
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <div className="w-3 h-3 rounded-full border border-current" />;
  }
};

const getSourceStatusColor = (status: DeepVerifySource['status']) => {
  switch (status) {
    case 'completed':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'mapping':
    case 'scraping':
      return 'text-primary bg-primary/10';
    case 'failed':
      return 'text-destructive bg-destructive/10';
    default:
      return 'text-muted-foreground bg-muted/30';
  }
};

const getSourceStatusLabel = (status: DeepVerifySource['status']) => {
  switch (status) {
    case 'completed':
      return 'Done';
    case 'mapping':
      return 'Mapping...';
    case 'scraping':
      return 'Scraping...';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
};

export const ResearchProgress = ({ steps, currentProgress, deepVerifyMode, deepVerifySources }: ResearchProgressProps) => {
  const hasActiveSources = deepVerifySources && deepVerifySources.some(s => s.status === 'mapping' || s.status === 'scraping');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {deepVerifyMode && (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            )}
            <h3 className="text-lg font-semibold">
              {deepVerifyMode ? 'Deep Verify Research' : 'Research Progress'}
            </h3>
          </div>
          <span className="text-sm text-muted-foreground">{Math.round(currentProgress)}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
          <motion.div
            className={`h-full ${deepVerifyMode ? 'bg-gradient-to-r from-emerald-500 to-primary' : 'bg-gradient-to-r from-primary to-accent'}`}
            initial={{ width: 0 }}
            animate={{ width: `${currentProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Deep Verify Sources Panel */}
        <AnimatePresence>
          {deepVerifyMode && deepVerifySources && deepVerifySources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-medium text-emerald-500">Official Sources</h4>
                {hasActiveSources && (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {deepVerifySources.map((source, idx) => (
                  <motion.div
                    key={source.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${getSourceStatusColor(source.status)}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getSourceStatusIcon(source.status)}
                      <span className="font-medium truncate">{source.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {source.pagesFound && source.pagesFound > 0 && (
                        <span className="text-[10px] opacity-70">{source.pagesFound} pages</span>
                      )}
                      <span className="text-[10px] opacity-70">{getSourceStatusLabel(source.status)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                step.status === 'active' 
                  ? 'bg-primary/10 border border-primary/30' 
                  : step.status === 'completed'
                  ? 'bg-accent/5'
                  : 'bg-muted/30'
              }`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                step.status === 'completed' 
                  ? 'bg-accent text-accent-foreground' 
                  : step.status === 'active'
                  ? 'bg-primary text-primary-foreground'
                  : step.status === 'failed'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step.status === 'completed' ? (
                  <Check className="w-5 h-5" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : step.status === 'failed' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${
                  step.status === 'active' ? 'text-primary' : 
                  step.status === 'completed' ? 'text-foreground' : 
                  'text-muted-foreground'
                }`}>
                  {step.label}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export const defaultResearchSteps: ResearchStep[] = [
  {
    id: 'analyze',
    label: 'Analyzing Query',
    status: 'pending',
    description: 'Understanding your research intent and identifying key topics',
  },
  {
    id: 'search',
    label: 'Web Search',
    status: 'pending',
    description: 'Searching multiple sources for relevant information',
  },
  {
    id: 'extract',
    label: 'Content Extraction',
    status: 'pending',
    description: 'Extracting and analyzing content from discovered sources',
  },
  {
    id: 'compile',
    label: 'Compiling Report',
    status: 'pending',
    description: 'Organizing findings into a comprehensive report',
  },
];

export const deepVerifyResearchSteps: ResearchStep[] = [
  {
    id: 'verify',
    label: 'Deep Verify Sources',
    status: 'pending',
    description: 'Crawling official Saudi Exchange and financial sources',
  },
  {
    id: 'search',
    label: 'Web Search',
    status: 'pending',
    description: 'Searching additional sources for relevant information',
  },
  {
    id: 'extract',
    label: 'Content Extraction',
    status: 'pending',
    description: 'Extracting and analyzing content from all sources',
  },
  {
    id: 'compile',
    label: 'Compiling Report',
    status: 'pending',
    description: 'Generating verified report with cited sources',
  },
];
