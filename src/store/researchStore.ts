import { create } from 'zustand';

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

interface ResearchStore {
  tasks: ResearchTask[];
  currentTask: ResearchTask | null;
  reports: Report[];
  isSearching: boolean;
  searchQuery: string;
  deepVerifyMode: boolean;
  deepVerifySources: DeepVerifySource[];
  
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
  clearTasks: () => void;
}

export const useResearchStore = create<ResearchStore>((set) => ({
  tasks: [],
  currentTask: null,
  reports: [],
  isSearching: false,
  searchQuery: '',
  deepVerifyMode: false,
  deepVerifySources: [],
  
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
  
  clearTasks: () => set({ tasks: [], currentTask: null, reports: [] }),
}));
