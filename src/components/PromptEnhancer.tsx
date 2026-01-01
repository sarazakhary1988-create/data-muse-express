import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Check, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface PromptEnhancerProps {
  query: string;
  onEnhanced: (enhancedQuery: string) => void;
  disabled?: boolean;
  timeContext?: string;
}

export const PromptEnhancer = ({ query, onEnhanced, disabled, timeContext }: PromptEnhancerProps) => {
  const { t, isRTL } = useLanguage();
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
          geographic_focus: timeContext || undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.enhanced_description) {
        onEnhanced(data.enhanced_description);
        setIsEnhanced(true);
        toast.success(isRTL ? 'تم تحسين الاستعلام بالذكاء الاصطناعي' : 'Query enhanced with AI');
        
        setTimeout(() => setIsEnhanced(false), 3000);
      } else {
        throw new Error('No enhanced query returned');
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error(isRTL ? 'فشل تحسين الاستعلام. يرجى المحاولة مرة أخرى.' : 'Failed to enhance query. Please try again.');
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
              {isEnhancing 
                ? (isRTL ? 'جاري التحسين...' : 'Enhancing...') 
                : isEnhanced 
                  ? (isRTL ? 'تم التحسين!' : 'Enhanced!') 
                  : t.search.enhancePrompt}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              {isRTL ? 'تحسين الاستعلام بالذكاء الاصطناعي' : 'AI Prompt Enhancement'}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.search.enhancePromptDesc}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
