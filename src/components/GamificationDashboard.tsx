import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Flame, 
  Star, 
  Zap, 
  Target, 
  Award,
  BookOpen,
  FileText,
  TrendingUp,
  Medal,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAgentStore } from '@/hooks/useAgentStore';

export const GamificationDashboard = () => {
  const { language, isRTL } = useLanguage();
  const { 
    agentName, 
    researchStreak, 
    totalQueries, 
    totalReports, 
    level, 
    xp, 
    badges 
  } = useAgentStore();

  const isArabic = language === 'ar';
  const xpToNextLevel = level * 1000;
  const xpProgress = ((xp % 1000) / 1000) * 100;

  const content = {
    en: {
      title: 'Research Achievements',
      subtitle: `${agentName}'s Performance Dashboard`,
      level: 'Level',
      streak: 'Day Streak',
      queries: 'Queries',
      reports: 'Reports',
      xpToNext: 'XP to next level',
      badges: 'Earned Badges',
      noBadges: 'Complete research to earn badges!',
      badgeNames: {
        firstSearch: 'First Search',
        researcher: 'Researcher',
        powerUser: 'Power User',
        expert: 'Expert',
        firstReport: 'First Report',
        reportMaster: 'Report Master',
        citationMaster: 'Citation Master',
        speedRunner: 'Speed Runner',
        streakWeek: 'Week Streak',
        streakMonth: 'Month Streak',
      },
      badgeDescs: {
        firstSearch: 'Completed your first search',
        researcher: '10 searches completed',
        powerUser: '50 searches completed',
        expert: '100 searches completed',
        firstReport: 'Generated your first report',
        reportMaster: '10 reports generated',
        citationMaster: '25 reports with citations',
        speedRunner: 'Fast research completion',
        streakWeek: '7-day research streak',
        streakMonth: '30-day research streak',
      },
    },
    ar: {
      title: 'إنجازات البحث',
      subtitle: `لوحة أداء ${agentName}`,
      level: 'المستوى',
      streak: 'سلسلة الأيام',
      queries: 'عمليات البحث',
      reports: 'التقارير',
      xpToNext: 'نقاط للمستوى التالي',
      badges: 'الشارات المكتسبة',
      noBadges: 'اكمل أبحاث لتكسب شارات!',
      badgeNames: {
        firstSearch: 'أول بحث',
        researcher: 'باحث',
        powerUser: 'مستخدم متمكن',
        expert: 'خبير',
        firstReport: 'أول تقرير',
        reportMaster: 'خبير التقارير',
        citationMaster: 'خبير الاستشهادات',
        speedRunner: 'باحث سريع',
        streakWeek: 'سلسلة أسبوع',
        streakMonth: 'سلسلة شهر',
      },
      badgeDescs: {
        firstSearch: 'أكملت أول بحث',
        researcher: '١٠ عمليات بحث',
        powerUser: '٥٠ عملية بحث',
        expert: '١٠٠ عملية بحث',
        firstReport: 'أنشأت أول تقرير',
        reportMaster: '١٠ تقارير',
        citationMaster: '٢٥ تقرير مع استشهادات',
        speedRunner: 'بحث سريع',
        streakWeek: 'سلسلة ٧ أيام',
        streakMonth: 'سلسلة ٣٠ يوم',
      },
    },
  };

  const t = content[isArabic ? 'ar' : 'en'];

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'firstSearch': return <Target className="w-6 h-6" />;
      case 'researcher': return <BookOpen className="w-6 h-6" />;
      case 'powerUser': return <Zap className="w-6 h-6" />;
      case 'expert': return <Star className="w-6 h-6" />;
      case 'firstReport': return <FileText className="w-6 h-6" />;
      case 'reportMaster': return <Award className="w-6 h-6" />;
      case 'citationMaster': return <Medal className="w-6 h-6" />;
      case 'speedRunner': return <TrendingUp className="w-6 h-6" />;
      default: return <Trophy className="w-6 h-6" />;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'firstSearch': return 'from-blue-500 to-cyan-500';
      case 'researcher': return 'from-green-500 to-emerald-500';
      case 'powerUser': return 'from-yellow-500 to-orange-500';
      case 'expert': return 'from-purple-500 to-pink-500';
      case 'firstReport': return 'from-teal-500 to-green-500';
      case 'reportMaster': return 'from-red-500 to-rose-500';
      case 'citationMaster': return 'from-indigo-500 to-violet-500';
      default: return 'from-primary to-accent';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          {t.title}
        </h2>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Level */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 text-center"
        >
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Star className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold">{level}</p>
          <p className="text-xs text-muted-foreground">{t.level}</p>
        </motion.div>

        {/* Streak */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 text-center"
        >
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold">{researchStreak}</p>
          <p className="text-xs text-muted-foreground">{t.streak}</p>
        </motion.div>

        {/* Queries */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-center"
        >
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold">{totalQueries}</p>
          <p className="text-xs text-muted-foreground">{t.queries}</p>
        </motion.div>

        {/* Reports */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center"
        >
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold">{totalReports}</p>
          <p className="text-xs text-muted-foreground">{t.reports}</p>
        </motion.div>
      </div>

      {/* XP Progress */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{t.level} {level}</span>
          <span className="text-xs text-muted-foreground">
            {xp % 1000} / 1000 {t.xpToNext}
          </span>
        </div>
        <Progress value={xpProgress} className="h-3" />
      </div>

      {/* Badges */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t.badges}</h3>
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t.noBadges}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {badges.map((badge) => (
              <motion.div
                key={badge}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className={`p-3 rounded-xl bg-gradient-to-br ${getBadgeColor(badge)} text-white text-center`}
              >
                <div className="flex justify-center mb-2">
                  {getBadgeIcon(badge)}
                </div>
                <p className="text-xs font-semibold">
                  {t.badgeNames[badge as keyof typeof t.badgeNames] || badge}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
