import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Wand2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface BrainDumpAnalyzerProps {
  onResearchPlan: (plan: { topic: string; questions: string[]; keywords: string[] }) => void;
}

export const BrainDumpAnalyzer = ({ onResearchPlan }: BrainDumpAnalyzerProps) => {
  const { language, isRTL } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<{
    topic: string;
    questions: string[];
    keywords: string[];
    entities: string[];
  } | null>(null);

  const isArabic = language === 'ar';

  const content = {
    en: {
      title: 'Brain Dump Analyzer',
      subtitle: 'Dump your unstructured thoughts and I\'ll build a research plan',
      placeholder: 'Type anything... companies, questions, ideas, concerns, competitors, whatever is on your mind about your research topic...',
      analyze: 'Analyze & Structure',
      analyzing: 'Analyzing your thoughts...',
      detectedTopic: 'Detected Topic',
      suggestedQuestions: 'Suggested Research Questions',
      keyEntities: 'Key Entities',
      keywords: 'Keywords',
      startResearch: 'Start Researching This',
      clear: 'Clear',
    },
    ar: {
      title: 'محلل الأفكار',
      subtitle: 'اكتب أفكارك بأي شكل وأنا أرتبها لك خطة بحث',
      placeholder: 'اكتب أي شي... شركات، أسئلة، أفكار، منافسين، أي شي يخطر على بالك عن الموضوع...',
      analyze: 'حلل ورتب',
      analyzing: 'أحلل أفكارك...',
      detectedTopic: 'الموضوع المكتشف',
      suggestedQuestions: 'أسئلة بحث مقترحة',
      keyEntities: 'الجهات الرئيسية',
      keywords: 'كلمات مفتاحية',
      startResearch: 'ابدأ البحث',
      clear: 'امسح',
    },
  };

  const t = content[isArabic ? 'ar' : 'en'];

  const analyzeText = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);

    // Simulate AI analysis (in production, this would call the AI API)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simple extraction logic
    const words = inputText.toLowerCase().split(/\s+/);
    
    // Detect companies
    const companyPatterns = ['microsoft', 'apple', 'google', 'amazon', 'tesla', 'netflix', 'meta', 'facebook', 'twitter', 'openai', 'anthropic'];
    const detectedCompanies = companyPatterns.filter((c) => inputText.toLowerCase().includes(c));

    // Detect question patterns
    const hasQuestionWords = /\b(what|how|why|when|where|who|which|شنو|ليش|متى|وين|كيف)\b/i.test(inputText);

    // Generate topic
    const topic = detectedCompanies.length > 0
      ? isArabic
        ? `تحليل ${detectedCompanies.join(' و ')}`
        : `Analysis of ${detectedCompanies.join(' and ')}`
      : isArabic
        ? 'بحث عام'
        : 'General Research';

    // Generate questions
    const questions = detectedCompanies.length > 0
      ? isArabic
        ? [
            `شنو استراتيجية ${detectedCompanies[0]} الحالية؟`,
            `شنو مركزهم في السوق؟`,
            `شنو المنافسين الرئيسيين؟`,
          ]
        : [
            `What is ${detectedCompanies[0]}'s current strategy?`,
            `What is their market position?`,
            `Who are their main competitors?`,
          ]
      : isArabic
        ? ['شنو الموضوع الرئيسي؟', 'شنو المصادر المتاحة؟']
        : ['What is the main topic?', 'What sources are available?'];

    // Extract keywords
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'over', 'after'];
    const keywords = [...new Set(words.filter((w) => w.length > 3 && !stopWords.includes(w)))].slice(0, 8);

    setAnalyzedData({
      topic,
      questions,
      keywords,
      entities: detectedCompanies,
    });

    setIsAnalyzing(false);
  };

  const handleStartResearch = () => {
    if (analyzedData) {
      onResearchPlan({
        topic: analyzedData.topic,
        questions: analyzedData.questions,
        keywords: analyzedData.keywords,
      });
    }
  };

  const handleClear = () => {
    setInputText('');
    setAnalyzedData(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{t.title}</h3>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 space-y-4">
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t.placeholder}
          className="min-h-32 resize-none"
        />

        <div className="flex gap-2">
          <Button
            onClick={analyzeText}
            disabled={!inputText.trim() || isAnalyzing}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.analyzing}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                {t.analyze}
              </>
            )}
          </Button>
          {analyzedData && (
            <Button variant="outline" onClick={handleClear}>
              {t.clear}
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {analyzedData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-border"
        >
          <div className="p-4 space-y-4">
            {/* Topic */}
            <div>
              <span className="text-xs text-muted-foreground">{t.detectedTopic}</span>
              <h4 className="font-semibold text-lg">{analyzedData.topic}</h4>
            </div>

            {/* Entities */}
            {analyzedData.entities.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-2">{t.keyEntities}</span>
                <div className="flex flex-wrap gap-2">
                  {analyzedData.entities.map((entity) => (
                    <Badge key={entity} variant="secondary" className="capitalize">
                      {entity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Questions */}
            <div>
              <span className="text-xs text-muted-foreground block mb-2">{t.suggestedQuestions}</span>
              <div className="space-y-2">
                {analyzedData.questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <span className="text-xs text-muted-foreground block mb-2">{t.keywords}</span>
              <div className="flex flex-wrap gap-1">
                {analyzedData.keywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Start Research Button */}
            <Button
              onClick={handleStartResearch}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {t.startResearch}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
