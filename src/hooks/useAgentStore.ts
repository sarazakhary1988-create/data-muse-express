import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentGender = 'male' | 'female' | 'other';
export type AgentMood = 'happy' | 'excited' | 'thinking' | 'surprised' | 'celebratory' | 'helpful' | 'concerned' | 'tired';

interface AgentSettings {
  agentName: string;
  agentGender: AgentGender;
  hasCompletedOnboarding: boolean;
  researchStreak: number;
  totalQueries: number;
  totalReports: number;
  level: number;
  xp: number;
  badges: string[];
  lastActiveDate: string;
  currentMood: AgentMood;
  preferences: {
    voiceEnabled: boolean;
    predictionsEnabled: boolean;
    gamificationEnabled: boolean;
    emotionalFeedback: boolean;
  };
}

interface AgentStore extends AgentSettings {
  setAgentName: (name: string) => void;
  setAgentGender: (gender: AgentGender) => void;
  setMood: (mood: AgentMood) => void;
  completeOnboarding: () => void;
  incrementStreak: () => void;
  addQuery: () => void;
  addReport: () => void;
  addXP: (amount: number) => void;
  addBadge: (badge: string) => void;
  updatePreferences: (prefs: Partial<AgentSettings['preferences']>) => void;
  resetAgent: () => void;
}

const calculateLevel = (xp: number): number => {
  return Math.floor(xp / 1000) + 1;
};

const defaultSettings: AgentSettings = {
  agentName: '',
  agentGender: 'other',
  hasCompletedOnboarding: false,
  researchStreak: 0,
  totalQueries: 0,
  totalReports: 0,
  level: 1,
  xp: 0,
  badges: [],
  lastActiveDate: '',
  currentMood: 'happy',
  preferences: {
    voiceEnabled: false,
    predictionsEnabled: true,
    gamificationEnabled: true,
    emotionalFeedback: true,
  },
};

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setAgentName: (name) => set({ agentName: name }),

      setAgentGender: (gender) => set({ agentGender: gender }),

      setMood: (mood) => set({ currentMood: mood }),

      completeOnboarding: () => {
        set({ 
          hasCompletedOnboarding: true,
          lastActiveDate: new Date().toISOString().split('T')[0],
        });
      },

      incrementStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        const lastActive = get().lastActiveDate;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (lastActive === yesterday) {
          set((state) => ({
            researchStreak: state.researchStreak + 1,
            lastActiveDate: today,
          }));
        } else if (lastActive !== today) {
          set({ researchStreak: 1, lastActiveDate: today });
        }
      },

      addQuery: () => {
        const state = get();
        const newTotal = state.totalQueries + 1;
        const xpGain = 10;
        const newXP = state.xp + xpGain;
        const newLevel = calculateLevel(newXP);

        const badges = [...state.badges];
        
        if (newTotal >= 1 && !badges.includes('firstSearch')) {
          badges.push('firstSearch');
        }
        if (newTotal >= 10 && !badges.includes('researcher')) {
          badges.push('researcher');
        }
        if (newTotal >= 50 && !badges.includes('powerUser')) {
          badges.push('powerUser');
        }
        if (newTotal >= 100 && !badges.includes('expert')) {
          badges.push('expert');
        }

        set({
          totalQueries: newTotal,
          xp: newXP,
          level: newLevel,
          badges,
        });

        get().incrementStreak();
      },

      addReport: () => {
        const state = get();
        const newTotal = state.totalReports + 1;
        const xpGain = 50;
        const newXP = state.xp + xpGain;
        const newLevel = calculateLevel(newXP);

        const badges = [...state.badges];
        
        if (newTotal >= 1 && !badges.includes('firstReport')) {
          badges.push('firstReport');
        }
        if (newTotal >= 10 && !badges.includes('reportMaster')) {
          badges.push('reportMaster');
        }
        if (newTotal >= 25 && !badges.includes('citationMaster')) {
          badges.push('citationMaster');
        }

        set({
          totalReports: newTotal,
          xp: newXP,
          level: newLevel,
          badges,
        });
      },

      addXP: (amount) => {
        set((state) => {
          const newXP = state.xp + amount;
          return {
            xp: newXP,
            level: calculateLevel(newXP),
          };
        });
      },

      addBadge: (badge) => {
        set((state) => {
          if (!state.badges.includes(badge)) {
            return { badges: [...state.badges, badge] };
          }
          return state;
        });
      },

      updatePreferences: (prefs) => {
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        }));
      },

      resetAgent: () => set(defaultSettings),
    }),
    {
      name: 'agent-store',
    }
  )
);
