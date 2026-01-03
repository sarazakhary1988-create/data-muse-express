import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, Send, Sparkles, 
  Flame, Trophy, Star, Award, ChevronRight, Copy, 
  Share2, Bookmark, MessageCircle, Zap, Brain,
  HelpCircle, AlertCircle, Smile, Target, X, 
  Search, Trash2, Globe, User, ChevronLeft, Check,
  Play, Pause, SkipForward, Settings, Moon, Sun, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/hooks/useAgentStore';
import { useResearchEngine } from '@/hooks/useResearchEngine';
import { useResearchStore } from '@/store/researchStore';
import { toast } from '@/hooks/use-toast';

// ============================================
// EXACT COLOR PALETTE FROM DESIGN
// ============================================

const PERSONALITY_COLORS = {
  curious: '#00D9FF',    // Cyan
  confused: '#FF9F40',   // Orange
  frustrated: '#FF4E8F', // Pink
  anxious: '#9C27B0',    // Purple
  delighted: '#FFD700',  // Gold
  confident: '#26C281',  // Green-Cyan
} as const;

// ============================================
// TYPES
// ============================================

export type ZahraPersonality = keyof typeof PERSONALITY_COLORS;
type VoiceGender = 'female' | 'male';
type VoiceLanguage = 'en' | 'ar';

interface ZahraMessage {
  id: string;
  role: 'user' | 'zahra';
  content: string;
  timestamp: Date;
  personality?: ZahraPersonality;
  confidence?: number;
}

interface VoiceSettings {
  language: VoiceLanguage;
  gender: VoiceGender;
  enabled: boolean;
  speed: number;
}

interface ExtendedSettings {
  theme: 'light' | 'dark' | 'system';
  showOnboarding: boolean;
}

interface OnboardingStep {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  personality: ZahraPersonality;
  example: string;
  exampleAr: string;
}

// ============================================
// PERSONALITY CONFIGS
// ============================================

const PERSONALITY_CONFIGS: Record<ZahraPersonality, {
  name: string;
  nameAr: string;
  color: string;
  icon: React.ReactNode;
  keywords: string[];
  greetings: { en: string[]; ar: string[] };
  suggestions: { en: string[]; ar: string[] };
}> = {
  curious: {
    name: 'Curious',
    nameAr: 'فضولية',
    color: PERSONALITY_COLORS.curious,
    icon: <HelpCircle className="w-4 h-4" />,
    keywords: ['what', 'how', 'why', 'when', 'where', 'who', 'tell me', 'explain', 'wonder', 'learn', 'ما', 'كيف', 'لماذا', 'متى', 'أين'],
    greetings: {
      en: ["Ooh, fascinating question! Let me explore...", "I'm curious about this too! Diving in..."],
      ar: ["سؤال رائع! دعني أستكشف...", "أنا فضولية أيضاً! سأبحث..."],
    },
    suggestions: {
      en: ["Tell me more", "What about...", "Explore deeper"],
      ar: ["أخبرني المزيد", "ماذا عن...", "استكشف أكثر"],
    },
  },
  confused: {
    name: 'Confused',
    nameAr: 'محتارة',
    color: PERSONALITY_COLORS.confused,
    icon: <AlertCircle className="w-4 h-4" />,
    keywords: ["don't understand", 'unclear', 'confusing', 'lost', 'help me understand', 'what do you mean', 'لا أفهم', 'غير واضح', 'محتار'],
    greetings: {
      en: ["Hmm, let me think about this differently...", "I'm not quite sure, but let me try..."],
      ar: ["دعني أفكر في هذا بشكل مختلف...", "لست متأكدة، لكن دعني أحاول..."],
    },
    suggestions: {
      en: ["Can you clarify?", "Did you mean...?", "Let me rephrase"],
      ar: ["هل يمكنك التوضيح؟", "هل تقصد...؟", "دعني أعيد الصياغة"],
    },
  },
  frustrated: {
    name: 'Frustrated',
    nameAr: 'محبطة',
    color: PERSONALITY_COLORS.frustrated,
    icon: <Zap className="w-4 h-4" />,
    keywords: ['not working', 'broken', 'error', 'failed', 'wrong', 'fix', 'problem', 'issue', 'bug', 'لا يعمل', 'خطأ', 'مشكلة'],
    greetings: {
      en: ["I see the problem! Let me work on this...", "This is tricky, but I won't give up!"],
      ar: ["أرى المشكلة! دعني أعمل على هذا...", "هذا صعب، لكنني لن أستسلم!"],
    },
    suggestions: {
      en: ["Try different approach", "Start fresh", "Break it down"],
      ar: ["جرب طريقة مختلفة", "ابدأ من جديد", "قسمها"],
    },
  },
  anxious: {
    name: 'Anxious',
    nameAr: 'قلقة',
    color: PERSONALITY_COLORS.anxious,
    icon: <Brain className="w-4 h-4" />,
    keywords: ['worried', 'concerned', 'afraid', 'nervous', 'unsure', 'risky', 'careful', 'قلق', 'خائف', 'متوتر'],
    greetings: {
      en: ["I want to be careful with this...", "Let me double-check everything..."],
      ar: ["أريد أن أكون حذرة...", "دعني أتحقق مرة أخرى..."],
    },
    suggestions: {
      en: ["Verify this", "Check alternatives", "Be thorough"],
      ar: ["تحقق من هذا", "راجع البدائل", "كن دقيقاً"],
    },
  },
  delighted: {
    name: 'Delighted',
    nameAr: 'سعيدة',
    color: PERSONALITY_COLORS.delighted,
    icon: <Smile className="w-4 h-4" />,
    keywords: ['thank', 'great', 'awesome', 'love', 'perfect', 'amazing', 'wonderful', 'excellent', 'شكراً', 'رائع', 'ممتاز'],
    greetings: {
      en: ["Wonderful! I'm so glad to help!", "This is exciting! Let me share..."],
      ar: ["رائع! سعيدة بمساعدتك!", "هذا مثير! دعني أشارك..."],
    },
    suggestions: {
      en: ["Explore more", "Share this", "Celebrate!"],
      ar: ["استكشف المزيد", "شارك هذا", "احتفل!"],
    },
  },
  confident: {
    name: 'Confident',
    nameAr: 'واثقة',
    color: PERSONALITY_COLORS.confident,
    icon: <Target className="w-4 h-4" />,
    keywords: ['yes', 'correct', 'right', 'exactly', 'agree', 'sure', 'definitely', 'absolutely', 'نعم', 'صحيح', 'بالتأكيد'],
    greetings: {
      en: ["I can confirm this with confidence!", "Based on my analysis, here's what I found..."],
      ar: ["يمكنني تأكيد هذا بثقة!", "بناءً على تحليلي، إليك ما وجدته..."],
    },
    suggestions: {
      en: ["I recommend", "Proceed with", "Here's the best approach"],
      ar: ["أوصي بـ", "تابع مع", "إليك أفضل طريقة"],
    },
  },
};

// ============================================
// ONBOARDING STEPS
// ============================================

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Meet ZAHRA 2.0',
    titleAr: 'تعرف على زهراء 2.0',
    description: 'Your emotionally intelligent AI research companion with 6 personality states that adapt to your needs.',
    descriptionAr: 'مساعدتك الذكية في البحث مع 6 حالات شخصية تتكيف مع احتياجاتك.',
    personality: 'curious',
    example: 'I adapt my responses based on your emotions and questions!',
    exampleAr: 'أتكيف مع ردودي بناءً على مشاعرك وأسئلتك!',
  },
  {
    id: 'curious',
    title: 'Curious Mode 🔍',
    titleAr: 'وضع الفضول 🔍',
    description: 'When you ask questions, I become curious and eager to explore with you!',
    descriptionAr: 'عندما تسأل أسئلة، أصبح فضولية وحريصة على الاستكشاف معك!',
    personality: 'curious',
    example: 'Try asking: "What is quantum computing?" → I light up cyan!',
    exampleAr: 'جرب السؤال: "ما هي الحوسبة الكمية؟" → أتوهج باللون السماوي!',
  },
  {
    id: 'confused',
    title: 'Confused Mode 🤔',
    titleAr: 'وضع الحيرة 🤔',
    description: 'When things are unclear, I show I need more context to help you better.',
    descriptionAr: 'عندما تكون الأمور غير واضحة، أظهر أنني بحاجة لمزيد من السياق.',
    personality: 'confused',
    example: 'Say: "I don\'t understand this..." → I turn orange and ask for clarity.',
    exampleAr: 'قل: "لا أفهم هذا..." → أتحول للون البرتقالي وأطلب التوضيح.',
  },
  {
    id: 'frustrated',
    title: 'Problem-Solving Mode ⚡',
    titleAr: 'وضع حل المشكلات ⚡',
    description: 'When facing problems, I show determination to solve them with you!',
    descriptionAr: 'عند مواجهة المشكلات، أظهر عزمي على حلها معك!',
    personality: 'frustrated',
    example: 'Say: "This isn\'t working!" → I turn pink and troubleshoot.',
    exampleAr: 'قل: "هذا لا يعمل!" → أتحول للون الوردي وأبدأ استكشاف الأخطاء.',
  },
  {
    id: 'anxious',
    title: 'Careful Mode 💭',
    titleAr: 'وضع الحذر 💭',
    description: 'For sensitive or risky topics, I proceed with careful consideration.',
    descriptionAr: 'للمواضيع الحساسة أو الخطرة، أتابع بحذر ودقة.',
    personality: 'anxious',
    example: 'Say: "I\'m worried about..." → I turn purple and think carefully.',
    exampleAr: 'قل: "أنا قلق بشأن..." → أتحول للون البنفسجي وأفكر بعناية.',
  },
  {
    id: 'delighted',
    title: 'Celebration Mode 🎉',
    titleAr: 'وضع الاحتفال 🎉',
    description: 'When you share good news or express gratitude, I celebrate with you!',
    descriptionAr: 'عندما تشارك أخباراً جيدة أو تعبر عن امتنانك، أحتفل معك!',
    personality: 'delighted',
    example: 'Say: "This is amazing!" → I glow gold with joy!',
    exampleAr: 'قل: "هذا مذهل!" → أتوهج بالذهبي من الفرح!',
  },
  {
    id: 'confident',
    title: 'Confident Mode ✓',
    titleAr: 'وضع الثقة ✓',
    description: 'When I have verified, high-confidence answers, I speak with certainty.',
    descriptionAr: 'عندما تكون لدي إجابات موثقة وعالية الثقة، أتحدث بيقين.',
    personality: 'confident',
    example: 'After research: "I can confirm..." → I shine green-cyan!',
    exampleAr: 'بعد البحث: "يمكنني التأكيد..." → أتألق باللون الأخضر السماوي!',
  },
  {
    id: 'voice',
    title: 'Voice Settings 🎙️',
    titleAr: 'إعدادات الصوت 🎙️',
    description: 'Choose your preferred voice language and gender. You can also adjust speed.',
    descriptionAr: 'اختر لغة الصوت والجنس المفضل لديك. يمكنك أيضاً ضبط السرعة.',
    personality: 'confident',
    example: 'English/Arabic with Male/Female voices available! Adjust speed as you like.',
    exampleAr: 'الإنجليزية/العربية مع أصوات ذكورية/أنثوية متاحة! اضبط السرعة كما تريد.',
  },
  {
    id: 'features',
    title: 'Key Features 🚀',
    titleAr: 'الميزات الرئيسية 🚀',
    description: 'Research integration, conversation memory, gamification with XP & badges, and more!',
    descriptionAr: 'دمج البحث، ذاكرة المحادثة، التلعيب مع XP والشارات، والمزيد!',
    personality: 'delighted',
    example: 'Say "research [topic]" to start deep research. Earn XP for each query!',
    exampleAr: 'قل "بحث [موضوع]" لبدء بحث عميق. اكسب XP لكل استعلام!',
  },
];

// ============================================
// STORAGE HELPERS
// ============================================

const ZAHRA_MEMORY_KEY = 'zahra-v2-memory';
const ZAHRA_SETTINGS_KEY = 'zahra-v2-settings';
const ZAHRA_ONBOARDING_KEY = 'zahra-v2-onboarding';

const saveMessages = (messages: ZahraMessage[]) => {
  try {
    localStorage.setItem(ZAHRA_MEMORY_KEY, JSON.stringify(messages.slice(-50)));
  } catch (e) {
    console.warn('Failed to save messages:', e);
  }
};

const loadMessages = (): ZahraMessage[] => {
  try {
    const stored = localStorage.getItem(ZAHRA_MEMORY_KEY);
    if (stored) {
      return JSON.parse(stored).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
  } catch (e) {}
  return [];
};

const saveSettings = (settings: VoiceSettings) => {
  localStorage.setItem(ZAHRA_SETTINGS_KEY, JSON.stringify(settings));
};

const loadSettings = (): VoiceSettings => {
  try {
    const stored = localStorage.getItem(ZAHRA_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return { language: 'en', gender: 'female', enabled: true, speed: 1.0 };
};

const hasCompletedOnboarding = (): boolean => {
  return localStorage.getItem(ZAHRA_ONBOARDING_KEY) === 'true';
};

const completeOnboarding = () => {
  localStorage.setItem(ZAHRA_ONBOARDING_KEY, 'true');
};

const resetOnboarding = () => {
  localStorage.removeItem(ZAHRA_ONBOARDING_KEY);
};

// ============================================
// AI CHAT STREAMING
// ============================================

const ZAHRA_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zahra-chat`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function streamZahraChat({
  messages,
  personality,
  onDelta,
  onDone,
  onError,
}: {
  messages: ChatMessage[];
  personality: string;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const response = await fetch(ZAHRA_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, personality }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const content = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {}
      }
    }
    onDone();
  } catch (error) {
    onError(error instanceof Error ? error.message : 'AI error');
  }
}

// ============================================
// PERSONALITY DETECTION (Sentiment-based, returns null if no match)
// ============================================

function detectPersonality(text: string): ZahraPersonality | null {
  const lowerText = text.toLowerCase();
  
  // Score-based detection for better accuracy
  const scores: Record<ZahraPersonality, number> = {
    curious: 0,
    confused: 0,
    frustrated: 0,
    anxious: 0,
    delighted: 0,
    confident: 0,
  };
  
  // Check keywords for each personality
  for (const [personality, config] of Object.entries(PERSONALITY_CONFIGS)) {
    for (const kw of config.keywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        scores[personality as ZahraPersonality] += 1;
      }
    }
  }
  
  // Find highest scoring personality
  const maxScore = Math.max(...Object.values(scores));
  
  // Only return a personality if there's at least one keyword match
  if (maxScore === 0) {
    return null; // No personality detected
  }
  
  // Get the personality with highest score
  const detected = Object.entries(scores).find(([_, score]) => score === maxScore);
  return detected ? detected[0] as ZahraPersonality : null;
}

// ============================================
// VOICE HOOK
// ============================================

function useZahraVoice(settings: VoiceSettings) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const getVoice = useCallback(() => {
    const voices = speechSynthesis.getVoices();
    const langCode = settings.language === 'ar' ? 'ar' : 'en';
    
    // Find matching voice
    const matchingVoices = voices.filter(v => 
      v.lang.startsWith(langCode) && 
      (settings.gender === 'female' ? !v.name.toLowerCase().includes('male') : v.name.toLowerCase().includes('male'))
    );
    
    return matchingVoices[0] || voices.find(v => v.lang.startsWith(langCode)) || voices[0];
  }, [settings.language, settings.gender]);

  const speak = useCallback((text: string) => {
    if (!settings.enabled || !text) return;
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getVoice();
    if (voice) utterance.voice = voice;
    
    utterance.lang = settings.language === 'ar' ? 'ar-SA' : 'en-US';
    utterance.pitch = settings.gender === 'female' ? 1.1 : 0.9;
    utterance.rate = (settings.speed || 1.0) * (settings.language === 'ar' ? 0.9 : 1.0);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthesis.speak(utterance);
  }, [settings, getVoice]);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Speech recognition not supported", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = settings.language === 'ar' ? 'ar-SA' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => { setIsListening(true); setTranscript(''); };
    recognition.onresult = (e: any) => setTranscript(e.results[e.results.length - 1][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [settings.language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { speak, stopSpeaking, startListening, stopListening, isSpeaking, isListening, transcript };
}

// ============================================
// VOICE WAVEFORM COMPONENT
// ============================================

interface VoiceWaveformProps {
  isActive: boolean;
  color: string;
  mode: 'speaking' | 'listening';
  audioLevels?: number[];
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ isActive, color, mode, audioLevels = [] }) => {
  const [levels, setLevels] = useState<number[]>(Array(16).fill(0.1));
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isActive) {
      setLevels(Array(16).fill(0.1));
      return;
    }

    if (mode === 'listening') {
      // Real microphone visualization
      const setupMicrophoneAnalyser = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.4;
          
          source.connect(analyser);
          analyserRef.current = analyser;
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const updateLevels = () => {
            if (!analyserRef.current) return;
            
            analyserRef.current.getByteFrequencyData(dataArray);
            
            const newLevels: number[] = [];
            const step = Math.floor(dataArray.length / 16);
            for (let i = 0; i < 16; i++) {
              const value = dataArray[i * step] / 255;
              newLevels.push(Math.max(0.1, value));
            }
            
            setLevels(newLevels);
            animationRef.current = requestAnimationFrame(updateLevels);
          };
          
          updateLevels();
        } catch (error) {
          console.warn('Microphone access denied, using simulated visualization');
          simulateWaveform();
        }
      };
      
      setupMicrophoneAnalyser();
    } else {
      // Simulated speaking visualization
      simulateWaveform();
    }

    function simulateWaveform() {
      const updateSimulated = () => {
        setLevels(prev => 
          prev.map((_, i) => {
            const base = 0.3 + Math.sin(Date.now() / 200 + i * 0.5) * 0.3;
            const random = Math.random() * 0.4;
            return Math.min(1, base + random);
          })
        );
        animationRef.current = requestAnimationFrame(updateSimulated);
      };
      updateSimulated();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      analyserRef.current = null;
    };
  }, [isActive, mode]);

  return (
    <div className="flex items-center justify-center gap-0.5 h-12 px-2">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}60`,
          }}
          animate={{ 
            height: isActive ? level * 40 : 4,
            opacity: isActive ? 0.6 + level * 0.4 : 0.3,
          }}
          transition={{ 
            type: "spring",
            stiffness: 400,
            damping: 15,
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// PARTICLE EFFECT COMPONENT
// ============================================

interface ParticleProps {
  color: string;
  index: number;
  isActive: boolean;
}

const Particle: React.FC<ParticleProps> = ({ color, index, isActive }) => {
  const angle = (index / 12) * Math.PI * 2;
  const radius = 60 + Math.random() * 20;
  const duration = 2 + Math.random() * 2;
  const size = 4 + Math.random() * 6;
  
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        left: '50%',
        top: '50%',
      }}
      initial={{ 
        x: 0, 
        y: 0, 
        opacity: 0,
        scale: 0 
      }}
      animate={isActive ? {
        x: [0, Math.cos(angle) * radius, Math.cos(angle + 0.5) * (radius + 20), 0],
        y: [0, Math.sin(angle) * radius, Math.sin(angle + 0.5) * (radius + 20), 0],
        opacity: [0, 0.8, 0.6, 0],
        scale: [0, 1.2, 0.8, 0],
      } : {
        x: Math.cos(angle) * 40,
        y: Math.sin(angle) * 40,
        opacity: 0.3,
        scale: 0.5,
      }}
      transition={{
        duration: isActive ? duration : 3,
        repeat: Infinity,
        delay: index * 0.15,
        ease: "easeInOut",
      }}
    />
  );
};

interface ParticleFieldProps {
  color: string;
  isActive: boolean;
  particleCount?: number;
}

const ParticleField: React.FC<ParticleFieldProps> = ({ color, isActive, particleCount = 12 }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {Array.from({ length: particleCount }).map((_, i) => (
        <Particle key={i} color={color} index={i} isActive={isActive} />
      ))}
    </div>
  );
};

// ============================================
// SPARKLE BURST COMPONENT
// ============================================

interface SparkleProps {
  color: string;
  index: number;
  totalSparkles: number;
}

const Sparkle: React.FC<SparkleProps> = ({ color, index, totalSparkles }) => {
  const angle = (index / totalSparkles) * Math.PI * 2;
  const distance = 80 + Math.random() * 40;
  const size = 3 + Math.random() * 5;
  const rotation = Math.random() * 360;
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        width: size,
        height: size,
      }}
      initial={{ 
        x: 0, 
        y: 0, 
        opacity: 1,
        scale: 0,
        rotate: 0,
      }}
      animate={{ 
        x: Math.cos(angle) * distance, 
        y: Math.sin(angle) * distance, 
        opacity: [1, 1, 0],
        scale: [0, 1.5, 0],
        rotate: rotation,
      }}
      transition={{
        duration: 0.8,
        ease: "easeOut",
        delay: index * 0.02,
      }}
    >
      {/* Star shape */}
      <svg viewBox="0 0 24 24" fill={color} className="w-full h-full drop-shadow-lg" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
      </svg>
    </motion.div>
  );
};

interface SparkleBurstProps {
  color: string;
  trigger: number; // Changes to trigger new burst
}

const SparkleBurst: React.FC<SparkleBurstProps> = ({ color, trigger }) => {
  const [sparkles, setSparkles] = useState<number[]>([]);
  const sparkleCount = 16;

  useEffect(() => {
    if (trigger > 0) {
      // Create new burst
      setSparkles(Array.from({ length: sparkleCount }, (_, i) => i));
      
      // Clear after animation
      const timer = setTimeout(() => {
        setSparkles([]);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
      <AnimatePresence>
        {sparkles.map(i => (
          <Sparkle key={`${trigger}-${i}`} color={color} index={i} totalSparkles={sparkleCount} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// ZAHRA AVATAR COMPONENT
// ============================================

interface ZahraAvatarProps {
  personality: ZahraPersonality;
  isSpeaking: boolean;
  isListening: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWaveform?: boolean;
  showParticles?: boolean;
}

const ZahraAvatar: React.FC<ZahraAvatarProps> = ({ 
  personality, 
  isSpeaking, 
  isListening, 
  size = 'lg',
  showWaveform = true,
  showParticles = true
}) => {
  const color = PERSONALITY_COLORS[personality];
  const [sparkleTrigger, setSparkleTrigger] = useState(0);
  const prevPersonalityRef = useRef(personality);
  
  // Trigger sparkle burst on personality change
  useEffect(() => {
    if (prevPersonalityRef.current !== personality) {
      setSparkleTrigger(prev => prev + 1);
      prevPersonalityRef.current = personality;
    }
  }, [personality]);
  
  const sizes = {
    sm: { outer: 'w-12 h-12', inner: 'w-10 h-10 text-sm', particles: 6 },
    md: { outer: 'w-20 h-20', inner: 'w-16 h-16 text-xl', particles: 8 },
    lg: { outer: 'w-28 h-28', inner: 'w-24 h-24 text-3xl', particles: 12 },
    xl: { outer: 'w-36 h-36', inner: 'w-32 h-32 text-4xl', particles: 16 },
  };

  const isActive = isSpeaking || isListening;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative flex items-center justify-center", sizes[size].outer)}>
        {/* Sparkle Burst on personality change */}
        <SparkleBurst color={color} trigger={sparkleTrigger} />
        
        {/* Particle Effects */}
        {showParticles && (
          <ParticleField 
            color={color} 
            isActive={isActive} 
            particleCount={sizes[size].particles}
          />
        )}
        
        {/* Ripple effects */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${color}` }}
            animate={isActive ? {
              scale: [1, 1.3 + i * 0.15],
              opacity: [0.4 - i * 0.1, 0],
            } : { scale: 1, opacity: 0.2 - i * 0.05 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* Main avatar */}
        <motion.div
          className={cn(
            "relative rounded-full flex items-center justify-center font-bold text-white shadow-2xl z-10",
            sizes[size].inner
          )}
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            boxShadow: `0 0 40px ${color}50`,
          }}
          animate={{
            scale: isSpeaking ? [1, 1.05, 1] : isListening ? [1, 1.02, 1] : 1,
          }}
          transition={{ duration: isSpeaking ? 0.4 : 2, repeat: Infinity }}
        >
          <span className="select-none drop-shadow-lg">Z</span>
          
          {/* Personality indicator */}
          <motion.div
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border-2 flex items-center justify-center"
            style={{ borderColor: color, color }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
          >
            {PERSONALITY_CONFIGS[personality].icon}
          </motion.div>
        </motion.div>
      </div>

      {/* Voice Waveform Visualization */}
      {showWaveform && (
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="w-full max-w-48"
            >
              <VoiceWaveform
                isActive={isActive}
                color={color}
                mode={isListening ? 'listening' : 'speaking'}
              />
              <motion.p
                className="text-xs text-center mt-1 font-medium"
                style={{ color }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {isListening ? 'Listening...' : 'Speaking...'}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

// ============================================
// MESSAGE CARD COMPONENT
// ============================================

interface MessageCardProps {
  message: ZahraMessage;
  isStreaming?: boolean;
  language: VoiceLanguage;
  onCopy: () => void;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, isStreaming, language, onCopy }) => {
  const isZahra = message.role === 'zahra';
  const config = message.personality ? PERSONALITY_CONFIGS[message.personality] : null;
  const color = config?.color || PERSONALITY_COLORS.curious;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex", isZahra ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl p-4 shadow-lg",
          isZahra ? "rounded-tl-sm" : "rounded-tr-sm bg-primary/10"
        )}
        style={isZahra ? {
          background: `linear-gradient(135deg, ${color}15, ${color}08)`,
          border: `1px solid ${color}30`,
        } : undefined}
      >
        {/* Header */}
        {isZahra && config && (
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="text-xs font-medium"
              style={{ borderColor: color, color }}
            >
              {config.icon}
              <span className="ml-1">{language === 'ar' ? config.nameAr : config.name}</span>
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Content */}
        <p className={cn("text-sm leading-relaxed", language === 'ar' && "text-right" )} dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {message.content || (isStreaming && <span className="text-muted-foreground italic">Thinking...</span>)}
          {isStreaming && message.content && (
            <motion.span
              className="inline-block w-0.5 h-4 ml-0.5 align-middle"
              style={{ backgroundColor: color }}
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </p>

        {/* Confidence & Actions */}
        {isZahra && message.content && !isStreaming && (
          <div className="mt-3 flex items-center justify-between">
            {message.confidence && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <Progress value={message.confidence * 100} className="w-16 h-1.5" />
                <span className="text-xs font-medium">{Math.round(message.confidence * 100)}%</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onCopy} className="h-7 px-2 ml-auto">
              <Copy className="w-3 h-3 mr-1" />
              <span className="text-xs">Copy</span>
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// SUGGESTIONS COMPONENT
// ============================================

interface SuggestionsProps {
  personality: ZahraPersonality;
  language: VoiceLanguage;
  onSelect: (suggestion: string) => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({ personality, language, onSelect }) => {
  const config = PERSONALITY_CONFIGS[personality];
  const suggestions = config.suggestions[language];
  const color = config.color;

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s, i) => (
        <motion.button
          key={s}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(s)}
          className="px-3 py-1.5 rounded-full text-xs border transition-all"
          style={{ borderColor: `${color}50`, color, background: `${color}10` }}
        >
          <ChevronRight className="w-3 h-3 inline mr-1" />
          {s}
        </motion.button>
      ))}
    </div>
  );
};

// ============================================
// GAMIFICATION METRICS
// ============================================

interface MetricsProps {
  compact?: boolean;
}

const Metrics: React.FC<MetricsProps> = ({ compact }) => {
  const { researchStreak, level, xp, badges, totalQueries } = useAgentStore();
  const xpProgress = (xp % 1000) / 10;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="font-bold">{researchStreak}</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="font-bold">Lv.{level}</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-primary" />
          <span className="font-bold">{xp}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Progress
          </h3>
          <Badge variant="secondary">
            <Award className="w-3 h-3 mr-1" />
            {badges.length} Badges
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 rounded-xl bg-background/60">
            <Flame className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <div className="text-xl font-bold">{researchStreak}</div>
            <div className="text-xs text-muted-foreground">Streak</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-background/60">
            <Trophy className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <div className="text-xl font-bold">{level}</div>
            <div className="text-xs text-muted-foreground">Level</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-background/60">
            <MessageCircle className="w-5 h-5 mx-auto text-primary mb-1" />
            <div className="text-xl font-bold">{totalQueries}</div>
            <div className="text-xs text-muted-foreground">Queries</div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">XP to Level {level + 1}</span>
            <span className="font-medium">{1000 - (xp % 1000)} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// SETTINGS DROPDOWN COMPONENT
// ============================================

interface SettingsDropdownProps {
  voiceSettings: VoiceSettings;
  onVoiceChange: (settings: VoiceSettings) => void;
  onShowOnboarding: () => void;
  language: VoiceLanguage;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ 
  voiceSettings, 
  onVoiceChange, 
  onShowOnboarding,
  language,
}) => {
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-background border shadow-lg z-50" align="end">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </h4>
          
          <Separator />
          
          {/* Language */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {language === 'ar' ? 'اللغة' : 'Language'}
            </label>
            <Select
              value={voiceSettings.language}
              onValueChange={(v) => onVoiceChange({ ...voiceSettings, language: v as VoiceLanguage })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="ar">🇸🇦 العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Gender */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {language === 'ar' ? 'الصوت' : 'Voice Gender'}
            </label>
            <Select
              value={voiceSettings.gender}
              onValueChange={(v) => onVoiceChange({ ...voiceSettings, gender: v as VoiceGender })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="female">👩 {language === 'ar' ? 'أنثى' : 'Female'}</SelectItem>
                <SelectItem value="male">👨 {language === 'ar' ? 'ذكر' : 'Male'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Voice Speed */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                {language === 'ar' ? 'سرعة الصوت' : 'Voice Speed'}
              </span>
              <span className="font-medium">{voiceSettings.speed?.toFixed(1) || '1.0'}x</span>
            </label>
            <Slider
              value={[voiceSettings.speed || 1.0]}
              min={0.5}
              max={2.0}
              step={0.1}
              onValueChange={([v]) => onVoiceChange({ ...voiceSettings, speed: v })}
              className="py-2"
            />
          </div>
          
          {/* Voice Enabled */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              {voiceSettings.enabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              {language === 'ar' ? 'تفعيل الصوت' : 'Voice Enabled'}
            </label>
            <Switch
              checked={voiceSettings.enabled}
              onCheckedChange={(enabled) => onVoiceChange({ ...voiceSettings, enabled })}
            />
          </div>
          
          <Separator />
          
          {/* Theme */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              {isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              {language === 'ar' ? 'الوضع الداكن' : 'Dark Mode'}
            </label>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
          
          <Separator />
          
          {/* Show Onboarding */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={onShowOnboarding}
          >
            <HelpCircle className="w-3 h-3 mr-1" />
            {language === 'ar' ? 'عرض الجولة التعليمية' : 'Show Tour Again'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ============================================
// ONBOARDING COMPONENT
// ============================================

interface OnboardingProps {
  voiceSettings: VoiceSettings;
  onVoiceChange: (settings: VoiceSettings) => void;
  onComplete: () => void;
  onSkip: () => void;
  language: VoiceLanguage;
}

const Onboarding: React.FC<OnboardingProps> = ({ voiceSettings, onVoiceChange, onComplete, onSkip, language }) => {
  const [step, setStep] = useState(0);
  const currentStep = ONBOARDING_STEPS[step];
  const color = PERSONALITY_COLORS[currentStep.personality];
  const isLastStep = step === ONBOARDING_STEPS.length - 1;
  const isVoiceStep = currentStep.id === 'voice';
  const isRtl = language === 'ar';

  return (
    <Card className="w-full max-w-lg mx-auto overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-2" style={{ background: `linear-gradient(135deg, ${color}20, transparent)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="icon" onClick={() => setStep(s => s - 1)}>
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            )}
            <CardTitle className="text-lg">{isRtl ? currentStep.titleAr : currentStep.title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onSkip}>
            {isRtl ? 'تخطي' : 'Skip'}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">{step + 1}/{ONBOARDING_STEPS.length}</span>
          <Progress value={((step + 1) / ONBOARDING_STEPS.length) * 100} className="h-1.5 flex-1" />
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <ZahraAvatar personality={currentStep.personality} isSpeaking={false} isListening={false} size="xl" />
          
          <p className="mt-6 text-muted-foreground">
            {isRtl ? currentStep.descriptionAr : currentStep.description}
          </p>
          
          <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm w-full" style={{ borderLeft: isRtl ? 'none' : `3px solid ${color}`, borderRight: isRtl ? `3px solid ${color}` : 'none' }}>
            💡 {isRtl ? currentStep.exampleAr : currentStep.example}
          </div>

          {isVoiceStep && (
            <div className="mt-6 space-y-4 w-full">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isRtl ? 'اللغة' : 'Language'}
                  </label>
                  <Select
                    value={voiceSettings.language}
                    onValueChange={(v) => onVoiceChange({ ...voiceSettings, language: v as VoiceLanguage })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isRtl ? 'الصوت' : 'Voice'}
                  </label>
                  <Select
                    value={voiceSettings.gender}
                    onValueChange={(v) => onVoiceChange({ ...voiceSettings, gender: v as VoiceGender })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="female">👩 {isRtl ? 'أنثى' : 'Female'}</SelectItem>
                      <SelectItem value="male">👨 {isRtl ? 'ذكر' : 'Male'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                  <span>{isRtl ? 'سرعة الصوت' : 'Voice Speed'}</span>
                  <span className="font-medium">{voiceSettings.speed?.toFixed(1) || '1.0'}x</span>
                </label>
                <Slider
                  value={[voiceSettings.speed || 1.0]}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onValueChange={([v]) => onVoiceChange({ ...voiceSettings, speed: v })}
                />
              </div>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex gap-1.5 mt-6">
            {ONBOARDING_STEPS.map((_, i) => (
              <motion.div
                key={i}
                className="h-1.5 rounded-full cursor-pointer"
                style={{ 
                  width: i === step ? 24 : 8,
                  backgroundColor: i === step ? color : `${color}30`,
                }}
                onClick={() => setStep(i)}
                whileHover={{ scale: 1.2 }}
              />
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            {!isLastStep ? (
              <Button onClick={() => setStep(s => s + 1)} style={{ backgroundColor: color }} className="text-white">
                {isRtl ? 'التالي' : 'Next'} 
                {isRtl ? <ChevronLeft className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            ) : (
              <Button onClick={onComplete} style={{ backgroundColor: color }} className="text-white">
                <Check className="w-4 h-4 mr-1" /> 
                {isRtl ? 'ابدأ الآن' : 'Get Started'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// MAIN ZAHRA 2.0 COMPONENT
// ============================================

interface ZAHRA2_0AgentProps {
  onResearchTriggered?: (query: string) => void;
  className?: string;
  compact?: boolean;
  onMinimize?: () => void;
}

export const ZAHRA2_0Agent: React.FC<ZAHRA2_0AgentProps> = ({
  onResearchTriggered,
  className,
  compact = false,
  onMinimize,
}) => {
  // State
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(loadSettings);
  const [personality, setPersonality] = useState<ZahraPersonality | null>(null);
  const [messages, setMessages] = useState<ZahraMessage[]>(() => loadMessages());
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { addQuery, addXP } = useAgentStore();
  const { startResearch } = useResearchEngine();
  const { isSearching, currentTask } = useResearchStore();
  
  const voice = useZahraVoice(voiceSettings);
  
  // Use detected personality or fallback to 'curious' for display
  const displayPersonality = personality || 'curious';
  const config = PERSONALITY_CONFIGS[displayPersonality];

  // Persist settings
  useEffect(() => { saveSettings(voiceSettings); }, [voiceSettings]);
  useEffect(() => { saveMessages(messages); }, [messages]);
  
  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle onboarding
  const handleOnboardingComplete = () => {
    completeOnboarding();
    setShowOnboarding(false);
  };
  
  // Show onboarding from settings
  const handleShowOnboarding = () => {
    resetOnboarding();
    setShowOnboarding(true);
  };

  // Process message
  const processMessage = useCallback(async (content: string) => {
    if (!content.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setIsTyping(true);
    
    const userMsg: ZahraMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const detectedPersonality = detectPersonality(content);
    setPersonality(detectedPersonality);

    // Check for research intent
    const wantsResearch = content.toLowerCase().includes('research') || 
                          content.toLowerCase().includes('بحث');
    
    if (wantsResearch) {
      const ackMsg: ZahraMessage = {
        id: (Date.now() + 1).toString(),
        role: 'zahra',
        content: voiceSettings.language === 'ar' 
          ? '🔍 سأبدأ البحث عن هذا الموضوع...'
          : '🔍 Starting research on this topic...',
        timestamp: new Date(),
        personality: 'curious',
        confidence: 0.9,
      };
      setMessages(prev => [...prev, ackMsg]);
      setIsTyping(false);
      
      try {
        onResearchTriggered?.(content);
        await startResearch(content);
        setPersonality('confident');
        addXP(25);
      } catch (e) {
        setPersonality('frustrated');
      }
      setIsProcessing(false);
      return;
    }

    // AI Chat
    const msgId = (Date.now() + 1).toString();
    let fullContent = '';
    
    const placeholder: ZahraMessage = {
      id: msgId,
      role: 'zahra',
      content: '',
      timestamp: new Date(),
      personality: detectedPersonality,
      confidence: 0.85,
    };
    setMessages(prev => [...prev, placeholder]);

    const history: ChatMessage[] = messages.slice(-8).map(m => ({
      role: m.role === 'zahra' ? 'assistant' : 'user',
      content: m.content,
    }));
    history.push({ role: 'user', content: content.trim() });

    await streamZahraChat({
      messages: history,
      personality: detectedPersonality,
      onDelta: (delta) => {
        fullContent += delta;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m));
      },
      onDone: () => {
        setIsTyping(false);
        setIsProcessing(false);
        addQuery();
        addXP(5);
        if (voiceSettings.enabled && fullContent) voice.speak(fullContent);
      },
      onError: (err) => {
        setIsTyping(false);
        setIsProcessing(false);
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `❌ ${err}`, personality: 'frustrated' } : m));
        toast({ title: "Error", description: err, variant: "destructive" });
      },
    });
  }, [isProcessing, messages, voiceSettings, voice, addQuery, addXP, startResearch, onResearchTriggered]);

  // Voice transcript handler
  useEffect(() => {
    if (voice.transcript && !voice.isListening) {
      processMessage(voice.transcript);
    }
  }, [voice.transcript, voice.isListening, processMessage]);

  const handleSend = () => processMessage(input);
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };
  const handleClear = () => { setMessages([]); localStorage.removeItem(ZAHRA_MEMORY_KEY); };

  // Show onboarding
  if (showOnboarding) {
    return (
      <div className={cn("flex items-center justify-center p-4 h-full", className)}>
        <Onboarding
          voiceSettings={voiceSettings}
          onVoiceChange={setVoiceSettings}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
          language={voiceSettings.language}
        />
      </div>
    );
  }

  return (
    <Card className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Header */}
      <div
        className="p-4 border-b flex items-center gap-3"
        style={{ background: `linear-gradient(to right, ${config.color}15, transparent)` }}
      >
        <ZahraAvatar
          personality={displayPersonality}
          isSpeaking={voice.isSpeaking}
          isListening={voice.isListening}
          size={compact ? "sm" : "md"}
          showWaveform={false}
          showParticles={!compact}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">ZAHRA 2.0</h2>
            {/* Only show personality badge when detected */}
            <AnimatePresence mode="wait">
              {personality && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <Badge style={{ backgroundColor: `${config.color}20`, color: config.color, borderColor: config.color }}>
                    {config.icon}
                    <span className="ml-1">{voiceSettings.language === 'ar' ? config.nameAr : config.name}</span>
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!compact && <Metrics compact />}
        </div>

        <div className="flex items-center gap-1">
          {/* Settings dropdown */}
          <SettingsDropdown
            voiceSettings={voiceSettings}
            onVoiceChange={setVoiceSettings}
            onShowOnboarding={handleShowOnboarding}
            language={voiceSettings.language}
          />
          
          {/* Voice toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setVoiceSettings(s => ({ ...s, enabled: !s.enabled }))}
            title={voiceSettings.enabled ? 'Disable voice' : 'Enable voice'}
          >
            {voiceSettings.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          {/* Clear */}
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear} title="Clear conversation">
              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
          
          {/* Minimize button */}
          {onMinimize && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMinimize} title="Minimize">
              <Minus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Research progress */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-primary/10 border-b flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Researching... {currentTask?.progress || 0}%</span>
            <Progress value={currentTask?.progress || 0} className="flex-1 h-1.5" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <ZahraAvatar personality="curious" isSpeaking={false} isListening={false} size="xl" />
              <h3 className="mt-6 text-lg font-semibold">
                {voiceSettings.language === 'ar' ? 'مرحباً! أنا زهراء' : "Hi! I'm ZAHRA 2.0"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                {voiceSettings.language === 'ar' 
                  ? 'مساعدتك الذكية في البحث. اسألني أي شيء!'
                  : 'Your intelligent research companion. Ask me anything!'}
              </p>
              <div className="mt-6">
                <Suggestions personality="curious" language={voiceSettings.language} onSelect={processMessage} />
              </div>
            </motion.div>
          ) : (
            messages.map((msg, i) => (
              <MessageCard
                key={msg.id}
                message={msg}
                isStreaming={isTyping && i === messages.length - 1 && msg.role === 'zahra'}
                language={voiceSettings.language}
                onCopy={() => { navigator.clipboard.writeText(msg.content); toast({ title: "Copied!" }); }}
              />
            ))
          )}
          
          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && messages[messages.length - 1]?.role !== 'zahra' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 p-3"
              >
                <ZahraAvatar personality={displayPersonality} isSpeaking={false} isListening={false} size="sm" showWaveform={false} showParticles={false} />
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                      animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {voiceSettings.language === 'ar' ? 'زهراء تفكر...' : 'ZAHRA is thinking...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {messages.length > 0 && !isProcessing && !compact && (
        <div className="px-4 pb-2">
          <Suggestions personality={displayPersonality} language={voiceSettings.language} onSelect={processMessage} />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background/50">
        <AnimatePresence>
          {voice.isListening && voice.transcript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 p-2 rounded-lg bg-primary/10 text-sm"
            >
              🎤 {voice.transcript}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {/* Mic button */}
          <Button
            variant={voice.isListening ? "default" : "outline"}
            size="icon"
            onClick={voice.isListening ? voice.stopListening : voice.startListening}
            style={voice.isListening ? { backgroundColor: config.color } : undefined}
          >
            {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={voiceSettings.language === 'ar' ? 'اسأل زهراء...' : 'Ask ZAHRA...'}
            disabled={isProcessing || voice.isListening}
            className="flex-1"
            dir={voiceSettings.language === 'ar' ? 'rtl' : 'ltr'}
          />

          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            style={{ backgroundColor: config.color }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metrics panel */}
      {!compact && (
        <div className="p-4 border-t">
          <Metrics />
        </div>
      )}
    </Card>
  );
};

// ============================================
// MOBILE FLOATING BUTTON
// ============================================

interface ZahraMobileButtonProps {
  onResearchTriggered?: (query: string) => void;
}

export const ZahraMobileButton: React.FC<ZahraMobileButtonProps> = ({ onResearchTriggered }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          className="fixed bottom-6 right-6 z-50 xl:hidden w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${PERSONALITY_COLORS.curious}, ${PERSONALITY_COLORS.confident})`,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              `0 4px 20px ${PERSONALITY_COLORS.curious}40`,
              `0 4px 30px ${PERSONALITY_COLORS.curious}60`,
              `0 4px 20px ${PERSONALITY_COLORS.curious}40`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </motion.button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ZAHRA2_0Agent 
              compact 
              className="h-full border-0 rounded-none" 
              onResearchTriggered={onResearchTriggered}
              onMinimize={() => setIsOpen(false)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ZAHRA2_0Agent;
