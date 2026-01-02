import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
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
  Move,
  Maximize2,
  Minimize2,
  Users,
  Video,
  Bell,
  Newspaper,
  Wand2,
  Gamepad2,
  Scale,
  FileText,
  Activity,
  Cpu,
  Eye,
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  History,
  Send,
  Smile,
  ThumbsUp,
  Rocket,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useResearchStore } from '@/store/researchStore';
import { useAgentStore } from '@/hooks/useAgentStore';

interface AIAssistantPanelProps {
  agentName: string;
  lastQuery?: string;
  onSuggestedSearch?: (query: string) => void;
}

type AgentMood = 'happy' | 'excited' | 'thinking' | 'surprised' | 'celebratory' | 'helpful' | 'concerned';
type PanelSize = 'small' | 'medium' | 'large';

interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
  type?: 'greeting' | 'suggestion' | 'alert' | 'insight' | 'celebration';
}

// 3D Animated Avatar Component
const AnimatedAvatar = ({ mood, isThinking }: { mood: AgentMood; isThinking: boolean }) => {
  const [eyeState, setEyeState] = useState<'open' | 'closed'>('open');
  
  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeState('closed');
      setTimeout(() => setEyeState('open'), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  const getMoodConfig = () => {
    switch (mood) {
      case 'excited':
        return { eyeSize: 'scale-110', mouthPath: 'M 10 22 Q 18 30 26 22', eyeColor: '#FFD700', bgGlow: 'from-yellow-400 to-orange-500' };
      case 'thinking':
        return { eyeSize: 'scale-100', mouthPath: 'M 12 24 L 24 24', eyeColor: '#60A5FA', bgGlow: 'from-blue-400 to-purple-500' };
      case 'surprised':
        return { eyeSize: 'scale-125', mouthPath: 'M 14 22 Q 18 28 22 22', eyeColor: '#F472B6', bgGlow: 'from-pink-400 to-purple-500' };
      case 'celebratory':
        return { eyeSize: 'scale-110', mouthPath: 'M 8 20 Q 18 32 28 20', eyeColor: '#34D399', bgGlow: 'from-green-400 to-emerald-500' };
      case 'concerned':
        return { eyeSize: 'scale-95', mouthPath: 'M 12 26 Q 18 22 24 26', eyeColor: '#FB923C', bgGlow: 'from-orange-400 to-red-400' };
      case 'helpful':
        return { eyeSize: 'scale-105', mouthPath: 'M 10 22 Q 18 28 26 22', eyeColor: '#818CF8', bgGlow: 'from-indigo-400 to-violet-500' };
      default:
        return { eyeSize: 'scale-100', mouthPath: 'M 10 22 Q 18 26 26 22', eyeColor: '#22D3EE', bgGlow: 'from-cyan-400 to-teal-500' };
    }
  };

  const config = getMoodConfig();

  return (
    <motion.div
      className="relative w-16 h-16"
      animate={{
        scale: [1, 1.02, 1],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Background glow */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.bgGlow} blur-lg opacity-60`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Main face */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-white/20 shadow-2xl overflow-hidden"
        style={{
          boxShadow: `0 0 30px ${config.eyeColor}40, inset 0 0 20px rgba(255,255,255,0.1)`
        }}
      >
        {/* Face SVG */}
        <svg viewBox="0 0 36 36" className="w-full h-full">
          {/* Left Eye */}
          <motion.ellipse
            cx="12"
            cy="14"
            rx={eyeState === 'closed' ? 3 : 3}
            ry={eyeState === 'closed' ? 0.5 : 4}
            fill={config.eyeColor}
            className={config.eyeSize}
            animate={isThinking ? { x: [0, -1, 1, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Left Eye Shine */}
          {eyeState === 'open' && (
            <circle cx="13" cy="12" r="1" fill="white" opacity="0.8" />
          )}
          
          {/* Right Eye */}
          <motion.ellipse
            cx="24"
            cy="14"
            rx={eyeState === 'closed' ? 3 : 3}
            ry={eyeState === 'closed' ? 0.5 : 4}
            fill={config.eyeColor}
            className={config.eyeSize}
            animate={isThinking ? { x: [0, 1, -1, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Right Eye Shine */}
          {eyeState === 'open' && (
            <circle cx="25" cy="12" r="1" fill="white" opacity="0.8" />
          )}
          
          {/* Mouth */}
          <motion.path
            d={config.mouthPath}
            stroke={config.eyeColor}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            animate={mood === 'celebratory' ? { y: [0, -1, 0] } : {}}
            transition={{ duration: 0.3, repeat: Infinity }}
          />
          
          {/* Thinking indicator */}
          {isThinking && (
            <motion.g>
              {[0, 1, 2].map((i) => (
                <motion.circle
                  key={i}
                  cx={30 + i * 4}
                  cy={8}
                  r="1.5"
                  fill={config.eyeColor}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    y: [0, -2, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.g>
          )}
        </svg>
      </motion.div>
      
      {/* Celebration particles */}
      {mood === 'celebratory' && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i],
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, (Math.random() - 0.5) * 60],
                y: [0, -40 - Math.random() * 20],
                opacity: [1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
};

// Live Market Ticker
const LiveMarketTicker = ({ isArabic }: { isArabic: boolean }) => {
  const [stocks, setStocks] = useState([
    { symbol: 'AAPL', price: 178.52, change: 2.34 },
    { symbol: 'MSFT', price: 374.21, change: -1.12 },
    { symbol: 'GOOGL', price: 139.88, change: 0.87 },
    { symbol: 'TSLA', price: 248.50, change: 3.21 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prev => prev.map(stock => ({
        ...stock,
        price: stock.price + (Math.random() - 0.5) * 2,
        change: stock.change + (Math.random() - 0.5) * 0.5,
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-3 overflow-x-auto py-2 px-1">
      {stocks.map(stock => (
        <motion.div
          key={stock.symbol}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono ${
            stock.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
          whileHover={{ scale: 1.05 }}
        >
          <span className="font-bold">{stock.symbol}</span>
          <span>${stock.price.toFixed(2)}</span>
          <span>{stock.change >= 0 ? '↑' : '↓'}{Math.abs(stock.change).toFixed(2)}%</span>
        </motion.div>
      ))}
    </div>
  );
};

// Animated Chart Component
const MiniAnimatedChart = () => {
  const [data, setData] = useState([40, 60, 45, 70, 55, 80, 65]);
  
  return (
    <div className="flex items-end gap-1 h-12 px-2">
      {data.map((value, i) => (
        <motion.div
          key={i}
          className="w-3 bg-gradient-to-t from-primary to-accent rounded-t"
          initial={{ height: 0 }}
          animate={{ height: `${value}%` }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
        />
      ))}
    </div>
  );
};

export const AIAssistantPanel = ({ agentName, lastQuery, onSuggestedSearch }: AIAssistantPanelProps) => {
  const { language, isRTL } = useLanguage();
  const { runHistory } = useResearchStore();
  const agentStore = useAgentStore();
  
  // Panel state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [panelSize, setPanelSize] = useState<PanelSize>('medium');
  const [opacity, setOpacity] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Agent state
  const [mood, setMood] = useState<AgentMood>('happy');
  const [isThinking, setIsThinking] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [predictedQuery, setPredictedQuery] = useState('');
  const [currentTip, setCurrentTip] = useState(0);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const dragControls = useDragControls();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isArabic = language === 'ar';

  // Content translations
  const content = {
    en: {
      greeting: `Hey there! I'm ${agentName}`,
      welcomeBack: `Welcome back! Ready to research?`,
      readyToHelp: "Ready to supercharge your research!",
      tips: [
        "💡 Try comparing competitors for deeper insights",
        "📅 Add specific dates for more accurate data",
        "🎯 Use company + keyword for targeted results",
        "🔍 I can analyze sentiment in your research",
        "📊 Ask me to generate charts from data",
      ],
      features: {
        predictive: { title: 'Predictive Research', desc: 'I predicted your next search!' },
        emotional: { title: 'Emotional Analytics', desc: 'I sense your excitement! 🎉' },
        ghostWriter: { title: 'Ghost Writer', desc: "I'll write in your style" },
        multiAgent: { title: 'Multi-Agent', desc: 'Bringing in specialist...' },
        marketData: { title: 'Live Market', desc: 'Real-time prices' },
        charts: { title: 'Data Viz', desc: 'Interactive charts' },
        timeTravel: { title: 'Research History', desc: 'Revisit past research' },
        competitor: { title: 'Competitor Analysis', desc: 'vs Top 3 competitors' },
        citation: { title: 'Citation Master', desc: 'APA, MLA, Chicago formats' },
        voice: { title: 'Voice Mode', desc: 'Speak to research' },
        sentiment: { title: 'Sentiment', desc: 'Research tone: Analytical' },
        gamification: { title: 'Achievements', desc: 'Badge unlocked!' },
        debate: { title: 'AI Debates', desc: "Devil's advocate view" },
        alerts: { title: 'Real-time Alerts', desc: 'Breaking news!' },
        schedule: { title: 'Smart Schedule', desc: 'Best time: 9 AM' },
        video: { title: 'Video Report', desc: 'Generate MP4' },
        collab: { title: 'Collaboration', desc: 'Share research' },
        ar: { title: 'AR View', desc: '3D visualization' },
        confidence: { title: 'Confidence', desc: 'Prediction: 97%' },
        brainDump: { title: 'Brain Dump', desc: 'Structure your ideas' },
        api: { title: 'API Connect', desc: 'Bloomberg, Reuters...' },
        translate: { title: 'Translate', desc: 'Cross-language research' },
      },
      emotions: {
        happy: "Let's find some amazing insights!",
        excited: "Ooh, this is going to be interesting!",
        thinking: "Hmm, analyzing the best approach...",
        surprised: "Wow, I found something unexpected!",
        celebratory: "🎉 Great job! Research complete!",
        helpful: "I've got great suggestions for you!",
        concerned: "Having trouble? Let me help!",
      },
      actions: {
        send: 'Send',
        resize: 'Resize',
        move: 'Move',
        close: 'Close',
        expand: 'Expand',
        collapse: 'Collapse',
      },
    },
    ar: {
      greeting: `هلا والله! أنا ${agentName}`,
      welcomeBack: 'أهلاً فيك! مستعد للبحث؟',
      readyToHelp: 'حاضر أساعدك في البحث!',
      tips: [
        '💡 جرب تقارن بين المنافسين عشان تحصل رؤى أعمق',
        '📅 حط تواريخ محددة للبيانات الأدق',
        '🎯 استخدم اسم الشركة مع كلمة مفتاحية',
        '🔍 أقدر أحلل المشاعر في بحثك',
        '📊 اطلب مني أسوي رسوم بيانية',
      ],
      features: {
        predictive: { title: 'بحث تنبؤي', desc: 'توقعت بحثك الجاي!' },
        emotional: { title: 'تحليل المشاعر', desc: 'حاسس إنك متحمس! 🎉' },
        ghostWriter: { title: 'كاتب خفي', desc: 'بكتب بأسلوبك' },
        multiAgent: { title: 'وكلاء متعددين', desc: 'جايب المختص...' },
        marketData: { title: 'بيانات السوق', desc: 'أسعار فورية' },
        charts: { title: 'رسوم بيانية', desc: 'تفاعلية' },
        timeTravel: { title: 'تاريخ البحث', desc: 'ارجع للسابق' },
        competitor: { title: 'تحليل المنافسين', desc: 'مقارنة أفضل 3' },
        citation: { title: 'خبير الاستشهاد', desc: 'APA, MLA, Chicago' },
        voice: { title: 'الصوت', desc: 'تكلم للبحث' },
        sentiment: { title: 'المشاعر', desc: 'نبرة تحليلية' },
        gamification: { title: 'الإنجازات', desc: 'شارة جديدة!' },
        debate: { title: 'مناظرات AI', desc: 'وجهة نظر معاكسة' },
        alerts: { title: 'تنبيهات فورية', desc: 'أخبار عاجلة!' },
        schedule: { title: 'جدول ذكي', desc: 'أفضل وقت: 9 صباحاً' },
        video: { title: 'تقرير فيديو', desc: 'إنشاء MP4' },
        collab: { title: 'تعاون', desc: 'شارك البحث' },
        ar: { title: 'عرض AR', desc: 'تصور ثلاثي الأبعاد' },
        confidence: { title: 'الثقة', desc: 'توقع: 97%' },
        brainDump: { title: 'تفريغ الأفكار', desc: 'نظم أفكارك' },
        api: { title: 'ربط API', desc: 'بلومبيرغ، رويترز...' },
        translate: { title: 'ترجمة', desc: 'بحث متعدد اللغات' },
      },
      emotions: {
        happy: 'يالله نلقى رؤى حلوة!',
        excited: 'أووه، هذا بيكون ممتع!',
        thinking: 'خلني أحلل أحسن طريقة...',
        surprised: 'واو، لقيت شي ما توقعته!',
        celebratory: '🎉 أحسنت! البحث اكتمل!',
        helpful: 'عندي اقتراحات حلوة لك!',
        concerned: 'تحتاج مساعدة؟ خلني أساعدك!',
      },
      actions: {
        send: 'إرسال',
        resize: 'تغيير الحجم',
        move: 'تحريك',
        close: 'إغلاق',
        expand: 'توسيع',
        collapse: 'تصغير',
      },
    },
  };

  const t = content[isArabic ? 'ar' : 'en'];

  // Auto-trigger entrance after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsExpanded(true);
      
      // Add welcome message
      const welcomeMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'agent',
        content: isArabic 
          ? `هلا والله! أنا ${agentName}! شنو اخبارك؟ حاضر أساعدك اليوم!`
          : `Hi! I'm ${agentName}! Welcome back! How can I help you today?`,
        timestamp: new Date(),
        type: 'greeting',
      };
      setMessages([welcomeMsg]);
      setMood('happy');
      
      // Check if user researched yesterday
      if (runHistory.length > 0) {
        setTimeout(() => {
          const suggestionMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: isArabic 
              ? `شفت إنك بحثت عن "${runHistory[runHistory.length - 1]?.query || 'موضوع'}" أمس. تبي تكمل؟`
              : `I noticed you researched "${runHistory[runHistory.length - 1]?.query || 'a topic'}" recently. Want to continue?`,
            timestamp: new Date(),
            type: 'suggestion',
          };
          setMessages(prev => [...prev, suggestionMsg]);
        }, 2000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [agentName, isArabic, runHistory]);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % t.tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [t.tips.length]);

  // Detect user struggles (simulate)
  useEffect(() => {
    let clickCount = 0;
    const handleClick = () => {
      clickCount++;
      if (clickCount >= 3 && isVisible) {
        setMood('concerned');
        const helpMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'agent',
          content: isArabic
            ? 'شفتك تحاول كثير... تحتاج مساعدة؟ خلني أوجهك!'
            : "I noticed you're clicking around... Need help? Let me guide you!",
          timestamp: new Date(),
          type: 'suggestion',
        };
        setMessages(prev => [...prev, helpMsg]);
        clickCount = 0;
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isVisible, isArabic]);

  // Predictive suggestions
  useEffect(() => {
    if (lastQuery) {
      if (lastQuery.toLowerCase().includes('microsoft') || lastQuery.toLowerCase().includes('مايكروسوفت')) {
        setPredictedQuery(isArabic ? 'مقارنة مايكروسوفت مع أبل وجوجل' : 'Compare Microsoft vs Apple vs Google');
        setShowPrediction(true);
        setMood('excited');
      } else if (lastQuery.toLowerCase().includes('apple') || lastQuery.toLowerCase().includes('أبل')) {
        setPredictedQuery(isArabic ? 'تحليل المنافسين لشركة أبل' : 'Apple Competitor Analysis 2024');
        setShowPrediction(true);
        setMood('excited');
      }
    }
  }, [lastQuery, isArabic]);

  // Handle sending messages
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsThinking(true);
    setMood('thinking');

    // Simulate AI response
    setTimeout(() => {
      setIsThinking(false);
      setMood('helpful');
      
      const responses = isArabic ? [
        'فكرة حلوة! خلني أبحث لك عن هالموضوع...',
        'ممتاز! أقدر أساعدك في هذا. خلني أحلل البيانات...',
        'تمام! بشتغل على هذا الحين. انتظر شوي...',
        'اها، فهمت طلبك. بدور على أفضل المصادر...',
      ] : [
        "Great idea! Let me research that for you...",
        "Excellent! I can help with that. Analyzing data now...",
        "On it! Working on this right now. Give me a moment...",
        "Got it! Searching for the best sources for you...",
      ];

      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 1500);
  }, [inputMessage, isArabic]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePredictedSearch = () => {
    if (onSuggestedSearch && predictedQuery) {
      onSuggestedSearch(predictedQuery);
      setShowPrediction(false);
      setMood('celebratory');
    }
  };

  const getSizeClasses = () => {
    switch (panelSize) {
      case 'small': return 'w-72 max-h-96';
      case 'large': return 'w-[450px] max-h-[700px]';
      default: return 'w-96 max-h-[550px]';
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={{ 
        opacity: isExpanded ? opacity / 100 : 1, 
        y: 0, 
        scale: 1,
        x: position.x,
      }}
      exit={{ opacity: 0, y: 100, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`fixed bottom-4 ${isRTL ? 'left-4' : 'right-4'} z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ opacity: opacity / 100 }}
    >
      {/* Collapsed View - Just the Avatar */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className="relative"
          >
            <AnimatedAvatar mood={mood} isThinking={isThinking} />
            {/* Notification badge */}
            {showPrediction && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
              >
                1
              </motion.div>
            )}
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
            className={`${getSizeClasses()} bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden`}
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Header with Avatar */}
            <div className="relative bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 p-4">
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-teal-500/20 to-purple-500/20"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                style={{ backgroundSize: '200% 200%' }}
              />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AnimatedAvatar mood={mood} isThinking={isThinking} />
                  <div>
                    <h3 className="font-bold text-white text-lg">{agentName}</h3>
                    <motion.p
                      key={mood}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-white/70"
                    >
                      {t.emotions[mood]}
                    </motion.p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Size toggle */}
                  <button
                    onClick={() => setPanelSize(prev => prev === 'small' ? 'medium' : prev === 'medium' ? 'large' : 'small')}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                    title={t.actions.resize}
                  >
                    {panelSize === 'large' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  
                  {/* Move handle */}
                  <button
                    onPointerDown={(e) => dragControls.start(e)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white cursor-move"
                    title={t.actions.move}
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  
                  {/* Close */}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                    title={t.actions.close}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Live Market Ticker */}
            <div className="border-b border-white/5 bg-black/20">
              <LiveMarketTicker isArabic={isArabic} />
            </div>

            {/* Main Content */}
            <ScrollArea className="h-80">
              <div className="p-4 space-y-4">
                {/* Feature Pills */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'predictive', icon: Brain, color: 'from-purple-500 to-pink-500' },
                    { key: 'emotional', icon: Heart, color: 'from-red-500 to-orange-500' },
                    { key: 'charts', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
                    { key: 'alerts', icon: Bell, color: 'from-yellow-500 to-orange-500' },
                    { key: 'collab', icon: Users, color: 'from-green-500 to-teal-500' },
                  ].map(({ key, icon: Icon, color }) => (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveFeature(activeFeature === key ? null : key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r ${color} text-white shadow-lg ${
                        activeFeature === key ? 'ring-2 ring-white/50' : ''
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{t.features[key as keyof typeof t.features].title}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Active Feature Panel */}
                <AnimatePresence>
                  {activeFeature && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white/5 rounded-xl p-3 border border-white/10"
                    >
                      <h4 className="text-sm font-semibold text-white mb-2">
                        {t.features[activeFeature as keyof typeof t.features].title}
                      </h4>
                      <p className="text-xs text-white/60 mb-3">
                        {t.features[activeFeature as keyof typeof t.features].desc}
                      </p>
                      
                      {activeFeature === 'charts' && <MiniAnimatedChart />}
                      
                      {activeFeature === 'emotional' && (
                        <div className="flex gap-2">
                          {['😊', '🤔', '😮', '🎉', '💡'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                const moods: AgentMood[] = ['happy', 'thinking', 'surprised', 'celebratory', 'helpful'];
                                setMood(moods[['😊', '🤔', '😮', '🎉', '💡'].indexOf(emoji)]);
                              }}
                              className="w-8 h-8 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Predictive Suggestion */}
                {showPrediction && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm text-white">{t.features.predictive.title}</span>
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">AI</Badge>
                    </div>
                    <p className="text-xs text-white/60 mb-2">{t.features.predictive.desc}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white truncate flex-1">{predictedQuery}</span>
                      <Button size="sm" onClick={handlePredictedSearch} className="bg-primary hover:bg-primary/80">
                        <Search className="w-3 h-3 mr-1" />
                        {isArabic ? 'ابحث' : 'Search'}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Chat Messages */}
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-white/10 text-white rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-white/60 text-sm"
                    >
                      <motion.div
                        className="flex gap-1"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </motion.div>
                      <span>{agentName} {isArabic ? 'يفكر...' : 'is thinking...'}</span>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Rotating Tips */}
                <div className="p-3 bg-accent/10 rounded-xl border border-accent/20">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentTip}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm text-white/80"
                    >
                      {t.tips[currentTip]}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Gamification Stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-orange-500/20 rounded-lg">
                    <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{agentStore.researchStreak}</div>
                    <div className="text-[10px] text-white/60">{isArabic ? 'سلسلة' : 'Streak'}</div>
                  </div>
                  <div className="text-center p-2 bg-blue-500/20 rounded-lg">
                    <Star className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{agentStore.level}</div>
                    <div className="text-[10px] text-white/60">{isArabic ? 'مستوى' : 'Level'}</div>
                  </div>
                  <div className="text-center p-2 bg-purple-500/20 rounded-lg">
                    <Zap className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{agentStore.xp}</div>
                    <div className="text-[10px] text-white/60">XP</div>
                  </div>
                  <div className="text-center p-2 bg-green-500/20 rounded-lg">
                    <Trophy className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{agentStore.badges.length}</div>
                    <div className="text-[10px] text-white/60">{isArabic ? 'شارات' : 'Badges'}</div>
                  </div>
                </div>

                {/* Opacity Slider */}
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                  <Eye className="w-4 h-4 text-white/60" />
                  <Slider
                    value={[opacity]}
                    onValueChange={(v) => setOpacity(v[0])}
                    min={30}
                    max={100}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-xs text-white/60 w-8">{opacity}%</span>
                </div>
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-3 border-t border-white/10 bg-black/20">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isArabic ? 'اكتب رسالتك...' : 'Type a message...'}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
                <Button size="icon" onClick={handleSendMessage} className="bg-primary hover:bg-primary/80">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Quick Reactions */}
              <div className="flex gap-1 mt-2">
                {['👍', '🚀', '💡', '❓'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setInputMessage(emoji);
                      handleSendMessage();
                    }}
                    className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
