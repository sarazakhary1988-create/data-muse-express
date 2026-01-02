import { useState, useCallback, useEffect, useRef } from 'react';
import { useAgentStore, AgentGender } from './useAgentStore';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// Web Speech API types - using any to avoid TypeScript issues with browser APIs
interface SpeechRecognitionType {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: any) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}

interface VoiceConfig {
  lang: string;
  voiceName?: string;
  pitch: number;
  rate: number;
}

const getVoiceConfig = (language: string, gender: AgentGender): VoiceConfig => {
  const isArabic = language === 'ar';
  
  if (isArabic) {
    return {
      lang: 'ar-SA',
      voiceName: gender === 'male' ? 'ar-SA' : 'ar-SA',
      pitch: gender === 'male' ? 0.9 : 1.1,
      rate: 0.9,
    };
  }
  
  return {
    lang: 'en-US',
    voiceName: gender === 'male' ? 'Alex' : 'Samantha',
    pitch: gender === 'male' ? 0.85 : 1.1,
    rate: 1.0,
  };
};

export const useVoice = () => {
  const { language } = useLanguage();
  const { agentGender, preferences, updatePreferences } = useAgentStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Find best matching voice
  const findVoice = useCallback((config: VoiceConfig): SpeechSynthesisVoice | null => {
    const voices = availableVoices;
    
    // Try to find by name first
    if (config.voiceName) {
      const byName = voices.find(v => v.name.includes(config.voiceName!));
      if (byName) return byName;
    }
    
    // Then by language
    const byLang = voices.filter(v => v.lang.startsWith(config.lang.split('-')[0]));
    if (byLang.length > 0) {
      return byLang[0];
    }
    
    return voices[0] || null;
  }, [availableVoices]);

  // Text to Speech
  const speak = useCallback((text: string) => {
    if (!preferences.voiceEnabled || !text) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const config = getVoiceConfig(language, agentGender);
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voice = findVoice(config);
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = config.lang;
    utterance.pitch = config.pitch;
    utterance.rate = config.rate;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [preferences.voiceEnabled, language, agentGender, findVoice]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Speech to Text
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const current = event.results[event.results.length - 1];
      setTranscript(current[0].transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Toggle voice
  const toggleVoice = useCallback(() => {
    updatePreferences({ voiceEnabled: !preferences.voiceEnabled });
  }, [preferences.voiceEnabled, updatePreferences]);

  return {
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleVoice,
    isSpeaking,
    isListening,
    transcript,
    voiceEnabled: preferences.voiceEnabled,
    availableVoices,
  };
};
