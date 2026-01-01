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

interface ResearchStore {
  tasks: ResearchTask[];
  currentTask: ResearchTask | null;
  reports: Report[];
  isSearching: boolean;
  searchQuery: string;
  deepVerifyMode: boolean;
  
  // Actions
  setSearchQuery: (query: string) => void;
  addTask: (task: ResearchTask) => void;
  updateTask: (id: string, updates: Partial<ResearchTask>) => void;
  setCurrentTask: (task: ResearchTask | null) => void;
  addReport: (report: Report) => void;
  setIsSearching: (isSearching: boolean) => void;
  setDeepVerifyMode: (enabled: boolean) => void;
  clearTasks: () => void;
}

export const useResearchStore = create<ResearchStore>((set) => ({
  tasks: [],
  currentTask: null,
  reports: [],
  isSearching: false,
  searchQuery: '',
  deepVerifyMode: false,
  
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
  
  clearTasks: () => set({ tasks: [], currentTask: null, reports: [] }),
}));
