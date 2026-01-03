import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, Send, Sparkles, 
  Flame, Trophy, Star, Award, ChevronRight, Copy, 
  Share2, Bookmark, MessageCircle, Zap, Brain,
  HelpCircle, AlertCircle, Smile, Target, X, 
  Search, Trash2, Globe, User, ChevronLeft, Check,
  Play, Pause, SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  personality: ZahraPersonality;
  example: string;
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
    description: 'Your emotionally intelligent AI research companion with 6 personality states.',
    personality: 'curious',
    example: 'Hi! I adapt my personality based on how you interact with me.',
  },
  {
    id: 'curious',
    title: 'Curious Mode',
    description: 'When you ask questions, I become curious and eager to explore!',
    personality: 'curious',
    example: 'What is quantum computing? → I light up cyan and dive deep!',
  },
  {
    id: 'confused',
    title: 'Confused Mode',
    description: 'When things are unclear, I show I need more context.',
    personality: 'confused',
    example: '"I don\'t understand..." → I turn orange and ask for clarity.',
  },
  {
    id: 'frustrated',
    title: 'Frustrated Mode',
    description: 'When facing problems, I show determination to solve them!',
    personality: 'frustrated',
    example: '"This isn\'t working!" → I turn pink and troubleshoot.',
  },
  {
    id: 'anxious',
    title: 'Anxious Mode',
    description: 'For sensitive topics, I show careful consideration.',
    personality: 'anxious',
    example: '"I\'m worried about..." → I turn purple and think carefully.',
  },
  {
    id: 'delighted',
    title: 'Delighted Mode',
    description: 'When you\'re happy, I celebrate with you!',
    personality: 'delighted',
    example: '"This is amazing!" → I glow gold with joy!',
  },
  {
    id: 'confident',
    title: 'Confident Mode',
    description: 'When I have verified answers, I speak with confidence.',
    personality: 'confident',
    example: '"I can confirm..." → I shine green-cyan!',
  },
  {
    id: 'voice',
    title: 'Voice Settings',
    description: 'Choose your preferred voice language and gender.',
    personality: 'confident',
    example: 'English/Arabic with Male/Female voices available!',
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
  return { language: 'en', gender: 'female', enabled: true };
};

const hasCompletedOnboarding = (): boolean => {
  return localStorage.getItem(ZAHRA_ONBOARDING_KEY) === 'true';
};

const completeOnboarding = () => {
  localStorage.setItem(ZAHRA_ONBOARDING_KEY, 'true');
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
// PERSONALITY DETECTION
// ============================================

function detectPersonality(text: string): ZahraPersonality {
  const lowerText = text.toLowerCase();
  
  for (const [personality, config] of Object.entries(PERSONALITY_CONFIGS)) {
    if (config.keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      return personality as ZahraPersonality;
    }
  }
  
  // Default based on punctuation
  if (lowerText.includes('?')) return 'curious';
  if (lowerText.includes('!') && (lowerText.includes('great') || lowerText.includes('thank'))) return 'delighted';
  
  return 'curious';
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
    utterance.rate = settings.language === 'ar' ? 0.9 : 1.0;
    
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
// ZAHRA AVATAR COMPONENT
// ============================================

interface ZahraAvatarProps {
  personality: ZahraPersonality;
  isSpeaking: boolean;
  isListening: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWaveform?: boolean;
}

const ZahraAvatar: React.FC<ZahraAvatarProps> = ({ 
  personality, 
  isSpeaking, 
  isListening, 
  size = 'lg',
  showWaveform = true 
}) => {
  const color = PERSONALITY_COLORS[personality];
  
  const sizes = {
    sm: { outer: 'w-12 h-12', inner: 'w-10 h-10 text-sm' },
    md: { outer: 'w-20 h-20', inner: 'w-16 h-16 text-xl' },
    lg: { outer: 'w-28 h-28', inner: 'w-24 h-24 text-3xl' },
    xl: { outer: 'w-36 h-36', inner: 'w-32 h-32 text-4xl' },
  };

  const isActive = isSpeaking || isListening;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative flex items-center justify-center", sizes[size].outer)}>
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
            "relative rounded-full flex items-center justify-center font-bold text-white shadow-2xl",
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
// ONBOARDING COMPONENT
// ============================================

interface OnboardingProps {
  voiceSettings: VoiceSettings;
  onVoiceChange: (settings: VoiceSettings) => void;
  onComplete: () => void;
  onSkip: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ voiceSettings, onVoiceChange, onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const currentStep = ONBOARDING_STEPS[step];
  const color = PERSONALITY_COLORS[currentStep.personality];
  const isLastStep = step === ONBOARDING_STEPS.length - 1;
  const isVoiceStep = currentStep.id === 'voice';

  return (
    <Card className="w-full max-w-lg mx-auto overflow-hidden">
      <CardHeader className="pb-2" style={{ background: `linear-gradient(135deg, ${color}20, transparent)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="icon" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <CardTitle className="text-lg">{currentStep.title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
        </div>
        <Progress value={(step / (ONBOARDING_STEPS.length - 1)) * 100} className="h-1 mt-2" />
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <ZahraAvatar personality={currentStep.personality} isSpeaking={false} isListening={false} size="xl" />
          
          <p className="mt-6 text-muted-foreground">{currentStep.description}</p>
          
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm w-full" style={{ borderLeft: `3px solid ${color}` }}>
            {currentStep.example}
          </div>

          {isVoiceStep && (
            <div className="mt-6 grid grid-cols-2 gap-4 w-full">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Language</label>
                <Select
                  value={voiceSettings.language}
                  onValueChange={(v) => onVoiceChange({ ...voiceSettings, language: v as VoiceLanguage })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Voice</label>
                <Select
                  value={voiceSettings.gender}
                  onValueChange={(v) => onVoiceChange({ ...voiceSettings, gender: v as VoiceGender })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">👩 Female</SelectItem>
                    <SelectItem value="male">👨 Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            {!isLastStep ? (
              <Button onClick={() => setStep(s => s + 1)} style={{ backgroundColor: color }}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={onComplete} style={{ backgroundColor: color }}>
                <Check className="w-4 h-4 mr-1" /> Get Started
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
}

export const ZAHRA2_0Agent: React.FC<ZAHRA2_0AgentProps> = ({
  onResearchTriggered,
  className,
  compact = false,
}) => {
  // State
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(loadSettings);
  const [personality, setPersonality] = useState<ZahraPersonality>('curious');
  const [messages, setMessages] = useState<ZahraMessage[]>(() => loadMessages());
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { addQuery, addXP } = useAgentStore();
  const { startResearch } = useResearchEngine();
  const { isSearching, currentTask } = useResearchStore();
  
  const voice = useZahraVoice(voiceSettings);
  const config = PERSONALITY_CONFIGS[personality];

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
          personality={personality}
          isSpeaking={voice.isSpeaking}
          isListening={voice.isListening}
          size={compact ? "sm" : "md"}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">ZAHRA 2.0</h2>
            <Badge style={{ backgroundColor: `${config.color}20`, color: config.color, borderColor: config.color }}>
              {config.icon}
              <span className="ml-1">{voiceSettings.language === 'ar' ? config.nameAr : config.name}</span>
            </Badge>
          </div>
          {!compact && <Metrics compact />}
        </div>

        <div className="flex items-center gap-1">
          {/* Language toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVoiceSettings(s => ({ ...s, language: s.language === 'en' ? 'ar' : 'en' }))}
            title={voiceSettings.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
          >
            <Globe className="w-4 h-4" />
          </Button>
          
          {/* Voice toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVoiceSettings(s => ({ ...s, enabled: !s.enabled }))}
          >
            {voiceSettings.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          {/* Clear */}
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
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
                <ZahraAvatar personality={personality} isSpeaking={false} isListening={false} size="sm" />
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
          <Suggestions personality={personality} language={voiceSettings.language} onSelect={processMessage} />
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
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-bold text-lg">ZAHRA 2.0</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ZAHRA2_0Agent compact className="h-full border-0 rounded-none" onResearchTriggered={onResearchTriggered} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ZAHRA2_0Agent;
