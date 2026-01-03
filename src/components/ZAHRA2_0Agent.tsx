import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, Send, Sparkles, 
  Flame, Trophy, Star, Award, ChevronRight, Copy, 
  Share2, Bookmark, MessageCircle, Zap, Brain,
  HelpCircle, AlertCircle, Heart, Smile, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useVoice } from '@/hooks/useVoice';
import { useAgentStore } from '@/hooks/useAgentStore';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// ============================================
// TYPES & CONSTANTS
// ============================================

export type ZahraPersonality = 
  | 'curious' 
  | 'confused' 
  | 'frustrated' 
  | 'anxious' 
  | 'delighted' 
  | 'confident';

interface PersonalityConfig {
  name: string;
  color: string;
  bgGradient: string;
  icon: React.ReactNode;
  voicePitch: number;
  voiceRate: number;
  greetings: string[];
  suggestions: string[];
}

const PERSONALITY_CONFIGS: Record<ZahraPersonality, PersonalityConfig> = {
  curious: {
    name: 'Curious',
    color: 'hsl(187, 85%, 43%)', // cyan
    bgGradient: 'from-cyan-500/20 to-cyan-600/10',
    icon: <HelpCircle className="w-5 h-5" />,
    voicePitch: 1.1,
    voiceRate: 1.05,
    greetings: [
      "Ooh, that's interesting! Let me dig into that...",
      "What a fascinating question! I'm on it.",
      "Hmm, I wonder... Let me explore this for you!",
    ],
    suggestions: [
      "Want to explore related topics?",
      "Should we dive deeper?",
      "What else are you curious about?",
    ],
  },
  confused: {
    name: 'Confused',
    color: 'hsl(24, 94%, 53%)', // orange
    bgGradient: 'from-orange-500/20 to-orange-600/10',
    icon: <AlertCircle className="w-5 h-5" />,
    voicePitch: 1.0,
    voiceRate: 0.9,
    greetings: [
      "Hmm, I'm not quite sure I understand...",
      "Let me think about that differently...",
      "Could you help me understand better?",
    ],
    suggestions: [
      "Can you clarify what you mean?",
      "Did you mean something else?",
      "Let me try a different approach",
    ],
  },
  frustrated: {
    name: 'Frustrated',
    color: 'hsl(330, 80%, 60%)', // pink
    bgGradient: 'from-pink-500/20 to-pink-600/10',
    icon: <Zap className="w-5 h-5" />,
    voicePitch: 0.9,
    voiceRate: 0.85,
    greetings: [
      "I'm having trouble with this, but I won't give up!",
      "This is tricky... let me try harder.",
      "Hmm, not finding what we need yet...",
    ],
    suggestions: [
      "Let's try a simpler query",
      "Maybe rephrase the question?",
      "Should we break this down?",
    ],
  },
  anxious: {
    name: 'Anxious',
    color: 'hsl(270, 70%, 60%)', // purple
    bgGradient: 'from-purple-500/20 to-purple-600/10',
    icon: <Brain className="w-5 h-5" />,
    voicePitch: 1.05,
    voiceRate: 1.1,
    greetings: [
      "This is complex... I want to get it right for you.",
      "I'm carefully analyzing this...",
      "Let me double-check my findings...",
    ],
    suggestions: [
      "Should I verify this further?",
      "Want me to find more sources?",
      "Let me cross-reference this",
    ],
  },
  delighted: {
    name: 'Delighted',
    color: 'hsl(45, 93%, 47%)', // gold
    bgGradient: 'from-yellow-500/20 to-amber-500/10',
    icon: <Smile className="w-5 h-5" />,
    voicePitch: 1.2,
    voiceRate: 1.1,
    greetings: [
      "Amazing! I found exactly what you need!",
      "This is wonderful! Look what I discovered!",
      "I'm so happy to share this with you!",
    ],
    suggestions: [
      "Want to celebrate with more research?",
      "Should I find similar insights?",
      "This is exciting! What's next?",
    ],
  },
  confident: {
    name: 'Confident',
    color: 'hsl(168, 76%, 42%)', // cyan-green/teal
    bgGradient: 'from-teal-500/20 to-emerald-500/10',
    icon: <Target className="w-5 h-5" />,
    voicePitch: 0.95,
    voiceRate: 1.0,
    greetings: [
      "I've verified this thoroughly. Here's what I found.",
      "Based on strong evidence, I can confirm...",
      "I'm certain about this. Let me explain.",
    ],
    suggestions: [
      "I recommend exploring this next",
      "Based on the evidence, try this",
      "Here's what the data suggests",
    ],
  },
};

interface ZahraMessage {
  id: string;
  role: 'user' | 'zahra';
  content: string;
  timestamp: Date;
  personality?: ZahraPersonality;
  confidence?: number;
}

interface DetectionContext {
  querySuccess: boolean;
  confidence: number;
  errorCount: number;
  userSentiment: 'positive' | 'neutral' | 'negative';
  isNewTopic: boolean;
}

// ============================================
// PERSONALITY DETECTION
// ============================================

const detectPersonality = (context: DetectionContext): ZahraPersonality => {
  if (context.isNewTopic) return 'curious';
  if (context.errorCount > 2) return 'frustrated';
  if (context.confidence < 0.4) return 'confused';
  if (context.confidence < 0.6) return 'anxious';
  if (context.querySuccess && context.confidence > 0.8) return 'confident';
  if (context.userSentiment === 'positive') return 'delighted';
  return 'curious';
};

const detectSentiment = (text: string): 'positive' | 'neutral' | 'negative' => {
  const positiveWords = ['thanks', 'great', 'awesome', 'love', 'amazing', 'perfect', 'good', 'nice', 'excellent'];
  const negativeWords = ['bad', 'wrong', 'hate', 'terrible', 'awful', 'no', 'not', 'never', 'fail'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};

// ============================================
// ZAHRA AVATAR COMPONENT
// ============================================

interface ZahraAvatarProps {
  personality: ZahraPersonality;
  isSpeaking: boolean;
  isListening: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ZahraAvatar: React.FC<ZahraAvatarProps> = ({ 
  personality, 
  isSpeaking, 
  isListening,
  size = 'lg' 
}) => {
  const config = PERSONALITY_CONFIGS[personality];
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  };

  const innerSizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
      {/* Ripple layers */}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute inset-0 rounded-full"
          style={{ 
            border: `2px solid ${config.color}`,
            opacity: 0.3 - index * 0.1,
          }}
          animate={isSpeaking || isListening ? {
            scale: [1, 1.2 + index * 0.15, 1],
            opacity: [0.3 - index * 0.1, 0, 0.3 - index * 0.1],
          } : {
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: isSpeaking || isListening ? 1 + index * 0.3 : 3,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
      
      {/* Main avatar circle */}
      <motion.div
        className={cn(
          "relative rounded-full flex items-center justify-center font-bold text-white shadow-xl",
          innerSizeClasses[size]
        )}
        style={{ 
          background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
          boxShadow: `0 0 30px ${config.color}40`,
        }}
        animate={isSpeaking ? {
          scale: [1, 1.05, 1],
        } : isListening ? {
          scale: [1, 1.02, 1],
        } : {
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: isSpeaking ? 0.5 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <span className="select-none">Z</span>
        
        {/* State indicator */}
        <motion.div
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center bg-background border-2"
          style={{ borderColor: config.color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <div style={{ color: config.color }}>
            {config.icon}
          </div>
        </motion.div>
      </motion.div>

      {/* Listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            className="absolute -bottom-8 flex gap-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-4 rounded-full bg-primary"
                animate={{ scaleY: [1, 2, 1] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// MESSAGE CARD COMPONENT
// ============================================

interface ZahraMessageCardProps {
  message: ZahraMessage;
  onCopy?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

const ZahraMessageCard: React.FC<ZahraMessageCardProps> = ({ 
  message, 
  onCopy, 
  onShare, 
  onSave 
}) => {
  const config = message.personality ? PERSONALITY_CONFIGS[message.personality] : null;
  const isZahra = message.role === 'zahra';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "w-full flex",
        isZahra ? "justify-start" : "justify-end"
      )}
    >
      <Card
        className={cn(
          "max-w-[85%] overflow-hidden transition-all duration-300",
          isZahra ? "rounded-tl-none" : "rounded-tr-none",
          isZahra && config && `bg-gradient-to-br ${config.bgGradient}`
        )}
        style={isZahra && config ? {
          borderColor: `${config.color}40`,
          borderWidth: '1px',
        } : undefined}
      >
        <CardContent className="p-4">
          {/* Message header */}
          <div className="flex items-center gap-2 mb-2">
            {isZahra && config && (
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ 
                  borderColor: config.color,
                  color: config.color,
                }}
              >
                {config.icon}
                <span className="ml-1">{config.name}</span>
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {/* Message content */}
          <p className="text-sm leading-relaxed">{message.content}</p>
          
          {/* Confidence indicator for Zahra messages */}
          {isZahra && message.confidence !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <Progress 
                value={message.confidence * 100} 
                className="h-1.5 flex-1 max-w-24"
              />
              <span className="text-xs font-medium">{Math.round(message.confidence * 100)}%</span>
            </div>
          )}
          
          {/* Actions for Zahra messages */}
          {isZahra && (
            <div className="mt-3 flex gap-1">
              <Button variant="ghost" size="sm" onClick={onCopy} className="h-7 px-2">
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Copy</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onShare} className="h-7 px-2">
                <Share2 className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Share</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onSave} className="h-7 px-2">
                <Bookmark className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Save</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ============================================
// SUGGESTIONS COMPONENT
// ============================================

interface ZahraSuggestionsProps {
  personality: ZahraPersonality;
  onSuggestionClick: (suggestion: string) => void;
  customSuggestions?: string[];
}

const ZahraSuggestions: React.FC<ZahraSuggestionsProps> = ({ 
  personality, 
  onSuggestionClick,
  customSuggestions 
}) => {
  const config = PERSONALITY_CONFIGS[personality];
  const suggestions = customSuggestions || config.suggestions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2"
    >
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSuggestionClick(suggestion)}
          className="px-3 py-1.5 rounded-full text-sm border transition-all hover:shadow-md"
          style={{
            borderColor: `${config.color}60`,
            color: config.color,
            background: `${config.color}10`,
          }}
        >
          <ChevronRight className="w-3 h-3 inline mr-1" />
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
};

// ============================================
// METRICS COMPONENT
// ============================================

interface ZahraMetricsProps {
  compact?: boolean;
}

const ZahraMetrics: React.FC<ZahraMetricsProps> = ({ compact = false }) => {
  const { 
    researchStreak, 
    level, 
    xp, 
    badges, 
    totalQueries 
  } = useAgentStore();
  
  const xpProgress = (xp % 1000) / 10;
  const xpToNextLevel = 1000 - (xp % 1000);

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="font-medium">{researchStreak}</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="font-medium">Lv.{level}</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-primary" />
          <span className="font-medium">{xp} XP</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Your Progress
          </h3>
          <Badge variant="secondary" className="gap-1">
            <Award className="w-3 h-3" />
            {badges.length} Badges
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Streak */}
          <div className="text-center p-2 rounded-lg bg-background/50">
            <Flame className="w-6 h-6 mx-auto text-orange-500 mb-1" />
            <div className="text-2xl font-bold">{researchStreak}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>

          {/* Level */}
          <div className="text-center p-2 rounded-lg bg-background/50">
            <Trophy className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
            <div className="text-2xl font-bold">{level}</div>
            <div className="text-xs text-muted-foreground">Level</div>
          </div>

          {/* Queries */}
          <div className="text-center p-2 rounded-lg bg-background/50">
            <MessageCircle className="w-6 h-6 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{totalQueries}</div>
            <div className="text-xs text-muted-foreground">Queries</div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">XP Progress</span>
            <span className="font-medium">{xpToNextLevel} XP to Level {level + 1}</span>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </div>

        {/* Recent Badges */}
        {badges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="text-sm text-muted-foreground mb-2">Recent Badges</div>
            <div className="flex gap-2 flex-wrap">
              {badges.slice(-3).map((badge) => (
                <Badge key={badge} variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1 text-yellow-500" />
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================
// VOICE CONTROLS COMPONENT
// ============================================

interface ZahraVoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  onToggleListen: () => void;
  onToggleVoice: () => void;
  onStopSpeaking: () => void;
  personality: ZahraPersonality;
}

const ZahraVoiceControls: React.FC<ZahraVoiceControlsProps> = ({
  isListening,
  isSpeaking,
  voiceEnabled,
  onToggleListen,
  onToggleVoice,
  onStopSpeaking,
  personality,
}) => {
  const config = PERSONALITY_CONFIGS[personality];

  return (
    <div className="flex items-center gap-2">
      {/* Microphone button */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant={isListening ? "default" : "outline"}
          size="icon"
          onClick={onToggleListen}
          className={cn(
            "relative transition-all",
            isListening && "ring-2 ring-offset-2 ring-primary"
          )}
          style={isListening ? { 
            backgroundColor: config.color,
          } : undefined}
        >
          {isListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          
          {/* Listening pulse */}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-md"
              style={{ backgroundColor: config.color }}
              animate={{ opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </Button>
      </motion.div>

      {/* Voice output toggle */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant={voiceEnabled ? "default" : "outline"}
          size="icon"
          onClick={isSpeaking ? onStopSpeaking : onToggleVoice}
          className={cn(
            "transition-all",
            isSpeaking && "animate-pulse"
          )}
        >
          {voiceEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>
      </motion.div>
    </div>
  );
};

// ============================================
// MAIN ZAHRA 2.0 AGENT COMPONENT
// ============================================

interface ZAHRA2_0AgentProps {
  onMessage?: (message: ZahraMessage) => void;
  onPersonalityChange?: (personality: ZahraPersonality) => void;
  className?: string;
}

export const ZAHRA2_0Agent: React.FC<ZAHRA2_0AgentProps> = ({
  onMessage,
  onPersonalityChange,
  className,
}) => {
  const { t, isRTL } = useLanguage();
  const { 
    speak, 
    stopSpeaking, 
    startListening, 
    stopListening, 
    isSpeaking, 
    isListening, 
    transcript,
    voiceEnabled,
    toggleVoice,
  } = useVoice();
  const { addQuery, addXP } = useAgentStore();

  // State
  const [personality, setPersonality] = useState<ZahraPersonality>('curious');
  const [messages, setMessages] = useState<ZahraMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);

  const config = PERSONALITY_CONFIGS[personality];

  // Handle personality change
  const updatePersonality = useCallback((newPersonality: ZahraPersonality) => {
    setPersonality(newPersonality);
    onPersonalityChange?.(newPersonality);
  }, [onPersonalityChange]);

  // Process user input and generate response
  const processMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsProcessing(true);
    
    // Add user message
    const userMessage: ZahraMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Detect sentiment and update personality
    const sentiment = detectSentiment(content);
    const isNewTopic = messages.length === 0 || content.length > 50;
    
    // Simulate processing with random confidence
    const confidence = Math.random() * 0.4 + 0.5; // 0.5 - 0.9
    const success = confidence > 0.6;

    const newPersonality = detectPersonality({
      querySuccess: success,
      confidence,
      errorCount: success ? 0 : errorCount + 1,
      userSentiment: sentiment,
      isNewTopic,
    });

    if (!success) {
      setErrorCount(prev => prev + 1);
    } else {
      setErrorCount(0);
    }

    updatePersonality(newPersonality);

    // Simulate response delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Generate Zahra's response
    const responseConfig = PERSONALITY_CONFIGS[newPersonality];
    const greeting = responseConfig.greetings[Math.floor(Math.random() * responseConfig.greetings.length)];
    
    const zahraMessage: ZahraMessage = {
      id: (Date.now() + 1).toString(),
      role: 'zahra',
      content: `${greeting} Based on your question about "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}", I've analyzed the available information and here's what I found...`,
      timestamp: new Date(),
      personality: newPersonality,
      confidence,
    };

    setMessages(prev => [...prev, zahraMessage]);
    setIsProcessing(false);
    setConversationCount(prev => prev + 1);

    // Update gamification
    addQuery();
    addXP(5);

    // Speak the response if voice is enabled
    if (voiceEnabled) {
      speak(zahraMessage.content);
    }

    onMessage?.(zahraMessage);
  }, [messages.length, errorCount, voiceEnabled, speak, addQuery, addXP, onMessage, updatePersonality]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript && !isListening) {
      processMessage(transcript);
    }
  }, [transcript, isListening, processMessage]);

  // Handle send
  const handleSend = useCallback(() => {
    processMessage(inputValue);
  }, [inputValue, processMessage]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    processMessage(suggestion);
  }, [processMessage]);

  // Toggle listening
  const handleToggleListen = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Copy message
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  return (
    <Card className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center gap-4"
        style={{ background: `linear-gradient(to right, ${config.color}10, transparent)` }}
      >
        <ZahraAvatar 
          personality={personality}
          isSpeaking={isSpeaking}
          isListening={isListening}
          size="md"
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">ZAHRA 2.0</h2>
            <Badge 
              style={{ 
                backgroundColor: `${config.color}20`,
                color: config.color,
                borderColor: config.color,
              }}
            >
              {config.icon}
              <span className="ml-1">{config.name}</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Your intelligent research companion
          </p>
        </div>

        <ZahraMetrics compact />
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <ZahraAvatar 
                personality={personality}
                isSpeaking={isSpeaking}
                isListening={isListening}
                size="lg"
              />
              <h3 className="mt-6 text-lg font-semibold">
                Hi! I'm ZAHRA 2.0
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                I'm your emotionally intelligent research assistant. Ask me anything and I'll help you discover insights with verified information.
              </p>
              
              <div className="mt-6">
                <ZahraSuggestions 
                  personality={personality}
                  onSuggestionClick={handleSuggestionClick}
                  customSuggestions={[
                    "Tell me about AI advancements",
                    "Research market trends",
                    "Explain quantum computing",
                  ]}
                />
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((message) => (
                <ZahraMessageCard
                  key={message.id}
                  message={message}
                  onCopy={() => handleCopy(message.content)}
                  onShare={() => {}}
                  onSave={() => {}}
                />
              ))}
              
              {/* Processing indicator */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 p-4"
                  >
                    <ZahraAvatar 
                      personality={personality}
                      isSpeaking={false}
                      isListening={false}
                      size="sm"
                    />
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ y: [0, -8, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ZAHRA is thinking...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {messages.length > 0 && !isProcessing && (
        <div className="px-4 pb-2">
          <ZahraSuggestions 
            personality={personality}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t bg-background/50">
        {/* Voice transcript indicator */}
        <AnimatePresence>
          {isListening && transcript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 p-2 rounded-lg bg-primary/10 text-sm"
            >
              <span className="text-muted-foreground">Hearing: </span>
              <span className="font-medium">{transcript}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <ZahraVoiceControls
            isListening={isListening}
            isSpeaking={isSpeaking}
            voiceEnabled={voiceEnabled}
            onToggleListen={handleToggleListen}
            onToggleVoice={toggleVoice}
            onStopSpeaking={stopSpeaking}
            personality={personality}
          />

          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask ZAHRA anything..."
            disabled={isProcessing || isListening}
            className="flex-1"
            dir={isRTL ? 'rtl' : 'ltr'}
          />

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isProcessing}
              style={{ backgroundColor: config.color }}
              className="text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Metrics panel (expanded) */}
      <div className="p-4 border-t">
        <ZahraMetrics />
      </div>
    </Card>
  );
};

export default ZAHRA2_0Agent;
