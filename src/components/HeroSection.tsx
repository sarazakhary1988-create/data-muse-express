import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export const HeroSection = () => {
  const { t, isRTL } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-8"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        {t.hero.badge}
      </motion.div>
      
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
        {isRTL ? (
          <>
            {t.hero.title}
          </>
        ) : (
          <>
            Research <span className="gradient-text">Anything</span>
            <br />
            with AI Precision
          </>
        )}
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        {t.hero.subtitle}
      </p>
    </motion.div>
  );
};
