import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ResearchTask {
  id: string;
  query: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: ResearchResult[];
  createdAt: Date;
  completedAt?: Date;
}

export interface ResearchResult {
  id: string;
  title: string;
  url: string;
  content: string;
  summary: string;
  relevanceScore: number;
  extractedAt: Date;
  metadata: {
    author?: string;
    publishDate?: string;
    wordCount?: number;
    domain?: string;
  };
}

export interface Report {
  id: string;
  title: string;
  taskId: string;
  format: 'markdown' | 'html' | 'json' | 'csv' | 'pdf';
  content: string;
  createdAt: Date;
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface DeepVerifySource {
  name: string;
  url: string;
  status: 'pending' | 'mapping' | 'scraping' | 'completed' | 'failed';
  pagesFound?: number;
}

export interface DeepVerifySourceConfig {
  id: string;
  name: string;
  baseUrl: string;
  category: 'official' | 'regulator' | 'news' | 'international';
  searchTerms: string[];
  enabled: boolean;
}

// Default Deep Verify sources configuration
export const DEFAULT_DEEP_VERIFY_SOURCES: DeepVerifySourceConfig[] = [
  { 
    id: 'saudi-exchange',
    baseUrl: 'https://www.saudiexchange.sa', 
    name: 'Saudi Exchange',
    category: 'official',
    searchTerms: ['IPO', 'listing', 'new listing', 'TASI', 'NOMU', '2025', 'announce'],
    enabled: true
  },
  { 
    id: 'tadawul',
    baseUrl: 'https://www.tadawul.com.sa', 
    name: 'Tadawul',
    category: 'official',
    searchTerms: ['IPO', 'listing', 'companies', 'market', 'securities'],
    enabled: true
  },
  { 
    id: 'cma-saudi',
    baseUrl: 'https://cma.org.sa', 
    name: 'CMA Saudi',
    category: 'regulator',
    searchTerms: ['approval', 'IPO', 'listing', 'prospectus', 'offering', 'securities'],
    enabled: true
  },
  { 
    id: 'argaam',
    baseUrl: 'https://www.argaam.com', 
    name: 'Argaam',
    category: 'news',
    searchTerms: ['IPO', 'listing', 'TASI', 'NOMU', 'market', 'companies', 'saudi'],
    enabled: true
  },
  { 
    id: 'mubasher',
    baseUrl: 'https://english.mubasher.info', 
    name: 'Mubasher',
    category: 'news',
    searchTerms: ['IPO', 'listing', 'saudi', 'tadawul', 'market'],
    enabled: true
  },
  { 
    id: 'bloomberg-me',
    baseUrl: 'https://www.bloomberg.com/middle-east', 
    name: 'Bloomberg ME',
    category: 'international',
    searchTerms: ['saudi', 'IPO', 'listing', 'tadawul', 'riyadh'],
    enabled: false
  },
  { 
    id: 'reuters-me',
    baseUrl: 'https://www.reuters.com/world/middle-east', 
    name: 'Reuters ME',
    category: 'international',
    searchTerms: ['saudi', 'IPO', 'listing', 'stock', 'market'],
    enabled: false
  },
];

interface ResearchStore {
  tasks: ResearchTask[];
  currentTask: ResearchTask | null;
  reports: Report[];
  isSearching: boolean;
  searchQuery: string;
  deepVerifyMode: boolean;
  deepVerifySources: DeepVerifySource[];
  deepVerifySourceConfigs: DeepVerifySourceConfig[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  addTask: (task: ResearchTask) => void;
  updateTask: (id: string, updates: Partial<ResearchTask>) => void;
  setCurrentTask: (task: ResearchTask | null) => void;
  addReport: (report: Report) => void;
  setIsSearching: (isSearching: boolean) => void;
  setDeepVerifyMode: (enabled: boolean) => void;
  setDeepVerifySources: (sources: DeepVerifySource[]) => void;
  updateDeepVerifySource: (name: string, updates: Partial<DeepVerifySource>) => void;
  clearDeepVerifySources: () => void;
  toggleSourceEnabled: (id: string) => void;
  setAllSourcesEnabled: (enabled: boolean) => void;
  resetSourceConfigs: () => void;
  clearTasks: () => void;
}

export const useResearchStore = create<ResearchStore>()(
  persist(
    (set) => ({
      tasks: [],
      currentTask: null,
      reports: [],
      isSearching: false,
      searchQuery: '',
      deepVerifyMode: false,
      deepVerifySources: [],
      deepVerifySourceConfigs: DEFAULT_DEEP_VERIFY_SOURCES,
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      addTask: (task) => set((state) => ({ 
        tasks: [task, ...state.tasks],
        currentTask: task 
      })),
      
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) => 
          t.id === id ? { ...t, ...updates } : t
        ),
        currentTask: state.currentTask?.id === id 
          ? { ...state.currentTask, ...updates } 
          : state.currentTask
      })),
      
      setCurrentTask: (task) => set({ currentTask: task }),
      
      addReport: (report) => set((state) => ({ 
        reports: [report, ...state.reports] 
      })),
      
      setIsSearching: (isSearching) => set({ isSearching }),
      
      setDeepVerifyMode: (enabled) => set({ deepVerifyMode: enabled }),
      
      setDeepVerifySources: (sources) => set({ deepVerifySources: sources }),
      
      updateDeepVerifySource: (name, updates) => set((state) => ({
        deepVerifySources: state.deepVerifySources.map((s) =>
          s.name === name ? { ...s, ...updates } : s
        )
      })),
      
      clearDeepVerifySources: () => set({ deepVerifySources: [] }),
      
      toggleSourceEnabled: (id) => set((state) => ({
        deepVerifySourceConfigs: state.deepVerifySourceConfigs.map((s) =>
          s.id === id ? { ...s, enabled: !s.enabled } : s
        )
      })),
      
      setAllSourcesEnabled: (enabled) => set((state) => ({
        deepVerifySourceConfigs: state.deepVerifySourceConfigs.map((s) => ({ ...s, enabled }))
      })),
      
      resetSourceConfigs: () => set({ deepVerifySourceConfigs: DEFAULT_DEEP_VERIFY_SOURCES }),
      
      clearTasks: () => set({ tasks: [], currentTask: null, reports: [] }),
    }),
    {
      name: 'research-store',
      partialize: (state) => ({ 
        deepVerifyMode: state.deepVerifyMode,
        deepVerifySourceConfigs: state.deepVerifySourceConfigs 
      }),
    }
  )
);
