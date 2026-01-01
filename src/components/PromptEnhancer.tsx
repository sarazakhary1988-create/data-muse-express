import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Check, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PromptEnhancerProps {
  query: string;
  onEnhanced: (enhancedQuery: string) => void;
  disabled?: boolean;
  timeContext?: string;
}

export const PromptEnhancer = ({ query, onEnhanced, disabled, timeContext }: PromptEnhancerProps) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);

  const handleEnhance = async () => {
    if (!query.trim() || isEnhancing) return;

    setIsEnhancing(true);
    setIsEnhanced(false);

    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { 
          description: query,
          // Include time context in the enhancement request
          geographic_focus: timeContext || undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.enhanced_description) {
        onEnhanced(data.enhanced_description);
        setIsEnhanced(true);
        toast.success('Query enhanced with AI');
        
        // Reset enhanced state after a delay
        setTimeout(() => setIsEnhanced(false), 3000);
      } else {
        throw new Error('No enhanced query returned');
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error('Failed to enhance query. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEnhance}
            disabled={disabled || isEnhancing || !query.trim()}
            className={`gap-1.5 h-7 px-2 text-xs transition-all ${
              isEnhanced 
                ? 'text-emerald-500 hover:text-emerald-600' 
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <AnimatePresence mode="wait">
              {isEnhancing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </motion.div>
              ) : isEnhanced ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Check className="w-3.5 h-3.5" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
            <span className="hidden sm:inline">
              {isEnhancing ? 'Enhancing...' : isEnhanced ? 'Enhanced!' : 'AI Enhance'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              AI Prompt Enhancement
            </p>
            <p className="text-xs text-muted-foreground">
              Use AI to improve your query for better, more accurate research results. 
              The AI will make your query more specific and comprehensive.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
