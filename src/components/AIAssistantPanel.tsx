import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Target,
  Zap,
  MessageSquare,
  Brain,
  Trophy,
  Flame,
  Award,
  Star,
  BookOpen,
  Quote,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp,
  Mic,
  Volume2,
  BarChart3,
  Globe,
  Clock,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useResearchStore } from '@/store/researchStore';

interface AIAssistantPanelProps {
  agentName: string;
  lastQuery?: string;
  onSuggestedSearch?: (query: string) => void;
}

export const AIAssistantPanel = ({ agentName, lastQuery, onSuggestedSearch }: AIAssistantPanelProps) => {
  const { language, isRTL } = useLanguage();
  const { runHistory } = useResearchStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);
  const [mood, setMood] = useState<'happy' | 'excited' | 'thinking' | 'helpful'>('happy');
  const [showPrediction, setShowPrediction] = useState(false);
  const [predictedQuery, setPredictedQuery] = useState('');

  const isArabic = language === 'ar';

  // Gulf Arabic expressions and content
  const content = {
    en: {
      greeting: `Hey there! I'm ${agentName}`,
      readyToHelp: "Ready to supercharge your research!",
      tips: [
        "Try comparing competitors for deeper insights",
        "Add specific dates for more accurate data",
        "Use company + keyword for targeted results",
      ],
      predictiveTitle: 'Predictive Suggestion',
      predictiveDesc: 'Based on your research pattern',
      startPredicted: 'Research This',
      gamification: {
        streak: 'Research Streak',
        level: 'Level',
        xp: 'XP',
        badges: 'Badges',
      },
      badges: {
        firstReport: 'First Report',
        powerUser: 'Power User',
        citationMaster: 'Citation Master',
        speedRunner: 'Speed Runner',
      },
      insights: {
        title: 'Live Insights',
        marketUpdate: 'Market update available',
        trendingTopic: 'Trending in your area',
      },
      emotions: {
        happy: "Let's find some amazing data!",
        excited: "Ooh, this is going to be interesting!",
        thinking: "Hmm, let me think about the best approach...",
        helpful: "I've got some great suggestions for you!",
      },
      debates: {
        title: 'Multi-Perspective Analysis',
        viewFor: 'Supporting Evidence',
        viewAgainst: "Devil's Advocate",
      },
    },
    ar: {
      // Gulf Arabic (خليجي)
      greeting: `هلا والله! أنا ${agentName}`,
      readyToHelp: 'حاضر أساعدك في البحث!',
      tips: [
        'جرب تقارن بين المنافسين عشان تحصل رؤى أعمق',
        'حط تواريخ محددة للبيانات الأدق',
        'استخدم اسم الشركة مع كلمة مفتاحية للنتائج المستهدفة',
      ],
      predictiveTitle: 'اقتراح تنبؤي',
      predictiveDesc: 'بناءً على نمط بحثك',
      startPredicted: 'ابحث هذا',
      gamification: {
        streak: 'سلسلة البحث',
        level: 'المستوى',
        xp: 'نقاط الخبرة',
        badges: 'الشارات',
      },
      badges: {
        firstReport: 'أول تقرير',
        powerUser: 'مستخدم متمكن',
        citationMaster: 'خبير الاستشهادات',
        speedRunner: 'باحث سريع',
      },
      insights: {
        title: 'رؤى فورية',
        marketUpdate: 'تحديث السوق متوفر',
        trendingTopic: 'موضوع رائج في منطقتك',
      },
      emotions: {
        happy: 'يالله نلقى بيانات حلوة!',
        excited: 'أووه، هذا بيكون ممتع!',
        thinking: 'خلني أفكر شنو أحسن طريقة...',
        helpful: 'عندي اقتراحات حلوة لك!',
      },
      debates: {
        title: 'تحليل متعدد الزوايا',
        viewFor: 'الأدلة المؤيدة',
        viewAgainst: 'محامي الشيطان',
      },
    },
  };

  const t = content[isArabic ? 'ar' : 'en'];

  // Gamification stats
  const stats = {
    streak: 3,
    level: 2,
    xp: 450,
    xpToNext: 1000,
    badges: ['firstReport', 'powerUser'],
  };

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % t.tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [t.tips.length]);

  // Generate predictive suggestions based on last query
  useEffect(() => {
    if (lastQuery && lastQuery.toLowerCase().includes('microsoft')) {
      setPredictedQuery(isArabic ? 'مقارنة مايكروسوفت مع أبل' : 'Compare Microsoft vs Apple');
      setShowPrediction(true);
      setMood('excited');
    } else if (lastQuery && lastQuery.toLowerCase().includes('apple')) {
      setPredictedQuery(isArabic ? 'تحليل المنافسين لأبل' : 'Apple Competitor Analysis');
      setShowPrediction(true);
      setMood('excited');
    } else if (runHistory.length > 0) {
      setMood('helpful');
    }
  }, [lastQuery, runHistory, isArabic]);

  const handlePredictedSearch = () => {
    if (onSuggestedSearch && predictedQuery) {
      onSuggestedSearch(predictedQuery);
      setShowPrediction(false);
    }
  };

  const getMoodEmoji = () => {
    switch (mood) {
      case 'excited': return '🤩';
      case 'thinking': return '🤔';
      case 'helpful': return '💡';
      default: return '😊';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-4 right-4 z-40 w-80"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Collapsed View */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsExpanded(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform"
          >
            <span className="text-2xl">{getMoodEmoji()}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-accent p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xl">{getMoodEmoji()}</span>
                  </div>
                  <div>
                    <h3 className="font-bold">{t.greeting}</h3>
                    <p className="text-xs text-white/80">{t.readyToHelp}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {/* Mood Message */}
              <motion.div
                key={mood}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-muted/50 rounded-lg text-sm"
              >
                <MessageSquare className="w-4 h-4 inline mr-2 text-primary" />
                {t.emotions[mood]}
              </motion.div>

              {/* Predictive Suggestion */}
              {showPrediction && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-primary/10 border border-primary/20 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{t.predictiveTitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t.predictiveDesc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">{predictedQuery}</span>
                    <Button size="sm" onClick={handlePredictedSearch} className="ml-2">
                      <Search className="w-3 h-3 mr-1" />
                      {t.startPredicted}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Rotating Tips */}
              <div className="p-3 bg-accent/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-accent" />
                  <span className="font-semibold text-sm">
                    {isArabic ? 'نصيحة' : 'Pro Tip'}
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentTip}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm text-muted-foreground"
                  >
                    {t.tips[currentTip]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Gamification */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">{t.gamification.streak}</span>
                  </div>
                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
                    {stats.streak} 🔥
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{t.gamification.level} {stats.level}</span>
                    <span>{stats.xp} / {stats.xpToNext} {t.gamification.xp}</span>
                  </div>
                  <Progress value={(stats.xp / stats.xpToNext) * 100} className="h-2" />
                </div>

                <div className="flex gap-1">
                  {stats.badges.map((badge) => (
                    <div
                      key={badge}
                      className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
                      title={t.badges[badge as keyof typeof t.badges]}
                    >
                      {badge === 'firstReport' && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {badge === 'powerUser' && <Zap className="w-4 h-4 text-blue-500" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Insights */}
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-sm">{t.insights.title}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <BarChart3 className="w-3 h-3 text-green-500" />
                    <span>{t.insights.marketUpdate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="w-3 h-3 text-blue-500" />
                    <span>{t.insights.trendingTopic}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
