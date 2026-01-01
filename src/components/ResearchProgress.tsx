import { motion } from 'framer-motion';
import { Check, Loader2, Globe, Brain, FileSearch, FileText, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ResearchStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  description: string;
}

interface ResearchProgressProps {
  steps: ResearchStep[];
  currentProgress: number;
}

const stepIcons = {
  analyze: Brain,
  search: Globe,
  extract: FileSearch,
  compile: FileText,
};

export const ResearchProgress = ({ steps, currentProgress }: ResearchProgressProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Research Progress</h3>
          <span className="text-sm text-muted-foreground">{Math.round(currentProgress)}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${currentProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

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
