import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface MultiPerspectiveAnalysisProps {
  topic: string;
  supportingPoints: string[];
  opposingPoints: string[];
  conclusion?: string;
}

export const MultiPerspectiveAnalysis = ({
  topic,
  supportingPoints,
  opposingPoints,
  conclusion,
}: MultiPerspectiveAnalysisProps) => {
  const { language, isRTL } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeView, setActiveView] = useState<'both' | 'for' | 'against'>('both');

  const isArabic = language === 'ar';

  const content = {
    en: {
      title: 'Multi-Perspective Analysis',
      subtitle: "Let's explore both sides of this topic",
      supporting: 'Supporting Evidence',
      opposing: "Devil's Advocate",
      conclusion: 'Balanced Conclusion',
      showBoth: 'Both Sides',
      showFor: 'Supporting',
      showAgainst: 'Opposing',
    },
    ar: {
      title: 'تحليل متعدد الزوايا',
      subtitle: 'خلنا نشوف الموضوع من كل الجوانب',
      supporting: 'أدلة مؤيدة',
      opposing: 'محامي الشيطان',
      conclusion: 'خلاصة متوازنة',
      showBoth: 'الجهتين',
      showFor: 'المؤيد',
      showAgainst: 'المعارض',
    },
  };

  const t = content[isArabic ? 'ar' : 'en'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div
        className="p-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Topic */}
            <div className="px-4 py-3 border-b border-border">
              <Badge variant="outline" className="mb-2">Topic</Badge>
              <p className="font-medium">{topic}</p>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 p-4 border-b border-border">
              {(['both', 'for', 'against'] as const).map((view) => (
                <Button
                  key={view}
                  variant={activeView === view ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveView(view)}
                >
                  {view === 'both' && t.showBoth}
                  {view === 'for' && t.showFor}
                  {view === 'against' && t.showAgainst}
                </Button>
              ))}
            </div>

            {/* Evidence Columns */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supporting */}
              {(activeView === 'both' || activeView === 'for') && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {t.supporting}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {supportingPoints.map((point, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-sm"
                      >
                        <span className="text-green-500 font-bold mr-2">+</span>
                        {point}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Opposing */}
              {(activeView === 'both' || activeView === 'against') && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {t.opposing}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {opposingPoints.map((point, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-sm"
                      >
                        <span className="text-red-500 font-bold mr-2">−</span>
                        {point}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Conclusion */}
            {conclusion && (
              <div className="px-4 pb-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="font-medium">{t.conclusion}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{conclusion}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
