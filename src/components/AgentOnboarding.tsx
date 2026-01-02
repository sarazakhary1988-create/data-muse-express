import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Heart, Check, User, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { AgentGender } from '@/hooks/useAgentStore';

interface AgentOnboardingProps {
  onComplete: (agentName: string, gender: AgentGender) => void;
}

export const AgentOnboarding = ({ onComplete }: AgentOnboardingProps) => {
  const { language, isRTL } = useLanguage();
  const [agentName, setAgentName] = useState('');
  const [gender, setGender] = useState<AgentGender>('other');
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const isArabic = language === 'ar';

  const content = {
    en: {
      welcome: 'Welcome to ORKESTRA',
      subtitle: 'Your autonomous AI research companion',
      question: "What shall we call your AI assistant?",
      placeholder: 'Enter a name for your AI...',
      suggestions: ['Atlas', 'Nova', 'Sage', 'Orion', 'Echo'],
      continue: 'Continue',
      genderQuestion: 'Choose your assistant voice',
      genderOptions: {
        male: 'Male Voice',
        female: 'Female Voice',
        other: 'Neutral',
      },
      greeting: (name: string) => `Hello! I'm ${name}, and I'll be your research partner.`,
      features: [
        'Predictive research suggestions',
        'Multi-perspective analysis',
        'Real-time insights',
        'Voice interaction support',
      ],
      letsGo: "Let's Start Researching!",
    },
    ar: {
      welcome: 'أهلاً وسهلاً في أوركسترا',
      subtitle: 'مساعدك الذاتي للبحث بالذكاء الاصطناعي',
      question: 'شنو تبي نسمي مساعدك الذكي؟',
      placeholder: 'اكتب اسم لمساعدك...',
      suggestions: ['نور', 'سلطان', 'ياسر', 'ريما', 'فهد'],
      continue: 'استمر',
      genderQuestion: 'اختر صوت مساعدك',
      genderOptions: {
        male: 'صوت رجالي',
        female: 'صوت نسائي',
        other: 'محايد',
      },
      greeting: (name: string) => `هلا والله! أنا ${name}، حاضر أساعدك في البحث.`,
      features: [
        'اقتراحات بحث تنبؤية',
        'تحليل متعدد الزوايا',
        'رؤى فورية',
        'دعم التفاعل الصوتي',
      ],
      letsGo: 'يالله نبدأ البحث!',
    },
  };

  const t = content[isArabic ? 'ar' : 'en'];

  const handleContinue = () => {
    if (agentName.trim()) {
      setIsAnimating(true);
      setTimeout(() => {
        setStep(1);
        setIsAnimating(false);
      }, 500);
    }
  };

  const handleComplete = () => {
    onComplete(agentName.trim(), gender);
  };

  const handleSuggestion = (name: string) => {
    setAgentName(name);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div
            key="naming"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-lg text-center space-y-8"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Animated Bot Icon with Mesh Gradient */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mx-auto w-24 h-24 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 70%, 50%) 30%, hsl(200, 80%, 50%) 60%, hsl(173, 80%, 40%) 100%)',
              }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <Bot className="w-12 h-12 text-white relative z-10" />
            </motion.div>

            {/* Welcome Text */}
            <div className="space-y-2">
              <h1 
                className="text-3xl md:text-4xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(200, 80%, 50%) 50%, hsl(173, 80%, 40%) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t.welcome}
              </h1>
              <p className="text-muted-foreground text-lg">{t.subtitle}</p>
            </div>

            {/* Naming Question */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t.question}</h2>
              
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder={t.placeholder}
                className="text-center text-lg h-14 bg-muted/50"
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              />

              {/* Name Suggestions */}
              <div className="flex flex-wrap justify-center gap-2">
                {t.suggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleSuggestion(name)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      agentName === name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">{t.genderQuestion}</h3>
              <div className="flex justify-center gap-3">
                {(['male', 'female', 'other'] as AgentGender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                      gender === g
                        ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {g === 'male' ? (
                      <User className="w-5 h-5" />
                    ) : g === 'female' ? (
                      <UserCircle className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                    <span className="font-medium">{t.genderOptions[g]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!agentName.trim() || isAnimating}
              className="w-full h-12 text-lg"
              style={{
                background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(173, 80%, 40%) 100%)',
              }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t.continue}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-lg text-center space-y-8"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Agent Avatar with Mesh Gradient */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto w-32 h-32 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 70%, 50%) 30%, hsl(200, 80%, 50%) 60%, hsl(173, 80%, 40%) 100%)',
                boxShadow: '0 0 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(45, 212, 191, 0.2)',
              }}
            >
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-white/30"
              />
              <span className="text-4xl font-bold text-white relative z-10">
                {agentName.charAt(0).toUpperCase()}
              </span>
            </motion.div>

            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <h1 className="text-2xl font-bold">{t.greeting(agentName)}</h1>
              <p className="text-muted-foreground">
                {isArabic ? 'هذي قدراتي الاستثنائية:' : "Here's what makes me exceptional:"}
              </p>
            </motion.div>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-3 text-left"
            >
              {t.features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(173, 80%, 40%) 100%)',
                    }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Start Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <Button
                onClick={handleComplete}
                className="w-full h-14 text-lg"
                style={{
                  background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(173, 80%, 40%) 100%)',
                }}
              >
                <Heart className="w-5 h-5 mr-2" />
                {t.letsGo}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
