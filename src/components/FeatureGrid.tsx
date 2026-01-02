import { motion } from 'framer-motion';
import { Layers, Zap, FileText, Globe, TrendingUp, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export const FeatureGrid = () => {
  const { t, isRTL } = useLanguage();

  const features = [
    {
      icon: Globe,
      titleKey: 'wideResearch',
      descKey: 'wideResearchDesc',
    },
    {
      icon: Zap,
      titleKey: 'realTimeScraping',
      descKey: 'realTimeScrapingDesc',
    },
    {
      icon: Layers,
      titleKey: 'multiSourceAnalysis',
      descKey: 'multiSourceAnalysisDesc',
    },
    {
      icon: FileText,
      titleKey: 'structuredReports',
      descKey: 'structuredReportsDesc',
    },
    {
      icon: TrendingUp,
      titleKey: 'smartRanking',
      descKey: 'smartRankingDesc',
    },
    {
      icon: Shield,
      titleKey: 'dataAccuracy',
      descKey: 'dataAccuracyDesc',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12" dir={isRTL ? 'rtl' : 'ltr'}>
      {features.map((feature, index) => (
        <motion.div
          key={feature.titleKey}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          <Card 
            variant="glass" 
            className="p-5 h-full hover:border-primary/30 hover:bg-card/80 transition-all group cursor-default"
          >
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-colors flex-shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {t.features?.[feature.titleKey as keyof typeof t.features] || feature.titleKey}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.features?.[feature.descKey as keyof typeof t.features] || feature.descKey}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
