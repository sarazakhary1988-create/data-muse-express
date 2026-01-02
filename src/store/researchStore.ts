import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AgentState, QualityScore, ExecutionMetrics, ClaimVerification, ResearchPlan } from '@/lib/agent/types';
import { Discrepancy, QualityMetrics, SourceCoverage } from '@/lib/agent/dataConsolidator';
import { TimeFrameValue } from '@/components/TimeFrameFilter';
import { COUNTRY_OPTIONS } from '@/components/CountryFilter';

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
  category: 'official' | 'regulator' | 'news' | 'international' | 'custom';
  searchTerms: string[];
  enabled: boolean;
  isCustom?: boolean;
}

// Report format options
export type ReportFormat = 'detailed' | 'executive' | 'table';

// Strict mode settings
export interface StrictModeSettings {
  enabled: boolean;
  minSources: number;
}

// Research settings
export interface ResearchSettings {
  useDemoData: boolean; // Toggle for demo/synthetic data
  enableDebugPanel: boolean;
  autoRegenerate: boolean; // Auto-regenerate generic reports
}

// Run history entry for tracking research executions
export interface RunHistoryEntry {
  id: string;
  query: string;
  timestamp: Date;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  inputs: {
    query: string;
    country?: string;
    strictMode?: boolean;
    reportFormat: ReportFormat;
  };
  outputs?: {
    reportContent: string;
    sourcesCount: number;
    qualityScore: number;
  };
  error?: string;
}

export const REPORT_FORMAT_OPTIONS: { value: ReportFormat; label: string; description: string }[] = [
  { value: 'detailed', label: 'Detailed Report', description: 'Comprehensive analysis with full context' },
  { value: 'executive', label: 'Executive Summary', description: 'Concise overview for quick decisions' },
  { value: 'table', label: 'Data Table', description: 'Structured data in tabular format' },
];

// Agent state tracking
export interface AgentStateInfo {
  state: AgentState;
  quality: QualityScore;
  metrics: ExecutionMetrics;
  verifications: ClaimVerification[];
  plan: ResearchPlan | null;
  lastDecision: { message: string; confidence: number } | null;
  // Manus-inspired consolidation data
  consolidation: {
    discrepancies: Discrepancy[];
    qualityMetrics: QualityMetrics;
    sourceCoverage: SourceCoverage;
    consolidatedData: Record<string, any>;
  } | null;
  // Search engine results tracking
  searchEngines: {
    engines: string[];
    resultCounts: Record<string, number>;
    searchMethod: string;
    timing?: number;
    // Detailed URL tracking per engine
    urlDetails?: {
      engine: string;
      url: string;
      title: string;
      relevanceScore: number;
      status: 'pending' | 'scraped' | 'failed';
      scrapedAt?: string;
    }[];
  } | null;
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

const defaultQualityScore: QualityScore = {
  overall: 0,
  accuracy: 0,
  completeness: 0,
  freshness: 0,
  sourceQuality: 0,
  claimVerification: 0,
};

const defaultMetrics: ExecutionMetrics = {
  totalTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  averageTaskTime: 0,
  parallelEfficiency: 0,
  retryCount: 0,
};

interface ResearchStore {
  tasks: ResearchTask[];
  currentTask: ResearchTask | null;
  reports: Report[];
  isSearching: boolean;
  searchQuery: string;
  deepVerifyMode: boolean;
  deepVerifySources: DeepVerifySource[];
  deepVerifySourceConfigs: DeepVerifySourceConfig[];
  reportFormat: ReportFormat;
  timeFrameFilter: TimeFrameValue;
  countryFilter: string;
  strictMode: StrictModeSettings;
  
  // New settings
  researchSettings: ResearchSettings;
  runHistory: RunHistoryEntry[];
  lastSuccessfulReport: Report | null;
  currentRunId: string | null;
  debugLogs: string[];
  
  // Agent state
  agentState: AgentStateInfo;
  
  // Report generation state
  reportGenerationStatus: {
    isGenerating: boolean;
    message: string;
    progress: number; // 0-100
  };
  
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
  addCustomSource: (source: Omit<DeepVerifySourceConfig, 'id' | 'isCustom'>) => void;
  updateSource: (id: string, updates: Partial<DeepVerifySourceConfig>) => void;
  deleteSource: (id: string) => void;
  clearTasks: () => void;
  setReportFormat: (format: ReportFormat) => void;
  setTimeFrameFilter: (filter: TimeFrameValue) => void;
  setCountryFilter: (country: string) => void;
  setStrictMode: (settings: StrictModeSettings) => void;
  
  // New actions
  setResearchSettings: (settings: Partial<ResearchSettings>) => void;
  addRunHistory: (entry: RunHistoryEntry) => void;
  updateRunHistory: (id: string, updates: Partial<RunHistoryEntry>) => void;
  setLastSuccessfulReport: (report: Report | null) => void;
  setCurrentRunId: (id: string | null) => void;
  addDebugLog: (log: string) => void;
  clearDebugLogs: () => void;
  cancelCurrentRun: () => void;
  
  // Agent state actions
  setAgentState: (state: AgentState) => void;
  setAgentQuality: (quality: QualityScore) => void;
  setAgentMetrics: (metrics: ExecutionMetrics) => void;
  setAgentVerifications: (verifications: ClaimVerification[]) => void;
  setAgentPlan: (plan: ResearchPlan | null) => void;
  setAgentDecision: (message: string, confidence: number) => void;
  setAgentConsolidation: (consolidation: AgentStateInfo['consolidation']) => void;
  setAgentSearchEngines: (searchEngines: AgentStateInfo['searchEngines']) => void;
  resetAgentState: () => void;
  
  // Report generation actions
  setReportGenerationStatus: (status: { isGenerating: boolean; message: string; progress?: number }) => void;
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
      reportFormat: 'detailed' as ReportFormat,
      timeFrameFilter: { type: 'all' } as TimeFrameValue,
      countryFilter: 'global',
      strictMode: { enabled: true, minSources: 2 } as StrictModeSettings,
      
      // New settings
      researchSettings: {
        useDemoData: false,
        enableDebugPanel: false,
        autoRegenerate: true,
      } as ResearchSettings,
      runHistory: [] as RunHistoryEntry[],
      lastSuccessfulReport: null as Report | null,
      currentRunId: null as string | null,
      debugLogs: [] as string[],
      
      // Agent state
      agentState: {
        state: 'idle' as AgentState,
        quality: defaultQualityScore,
        metrics: defaultMetrics,
        verifications: [],
        plan: null,
        lastDecision: null,
        consolidation: null,
        searchEngines: null,
      },
      
      // Report generation state
      reportGenerationStatus: {
        isGenerating: false,
        message: '',
        progress: 0,
      },
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      addTask: (task) => set((state) => ({
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
      
      addCustomSource: (source) => set((state) => ({
        deepVerifySourceConfigs: [
          ...state.deepVerifySourceConfigs,
          {
            ...source,
            id: `custom-${Date.now()}`,
            isCustom: true,
          }
        ]
      })),
      
      updateSource: (id, updates) => set((state) => ({
        deepVerifySourceConfigs: state.deepVerifySourceConfigs.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        )
      })),
      
      deleteSource: (id) => set((state) => ({
        deepVerifySourceConfigs: state.deepVerifySourceConfigs.filter((s) => s.id !== id)
      })),
      
      clearTasks: () => set({ tasks: [], currentTask: null, reports: [] }),
      
      setReportFormat: (format) => set({ reportFormat: format }),
      
      setTimeFrameFilter: (filter) => set({ timeFrameFilter: filter }),
      
      setCountryFilter: (country) => set({ countryFilter: country }),
      
      setStrictMode: (settings) => set({ strictMode: settings }),
      
      // Agent state actions
      setAgentState: (state) => set((s) => ({
        agentState: { ...s.agentState, state }
      })),
      
      setAgentQuality: (quality) => set((s) => ({
        agentState: { ...s.agentState, quality }
      })),
      
      setAgentMetrics: (metrics) => set((s) => ({
        agentState: { ...s.agentState, metrics }
      })),
      
      setAgentVerifications: (verifications) => set((s) => ({
        agentState: { ...s.agentState, verifications }
      })),
      
      setAgentPlan: (plan) => set((s) => ({
        agentState: { ...s.agentState, plan }
      })),
      
      setAgentDecision: (message, confidence) => set((s) => ({
        agentState: { ...s.agentState, lastDecision: { message, confidence } }
      })),
      
      setAgentConsolidation: (consolidation) => set((s) => ({
        agentState: { ...s.agentState, consolidation }
      })),
      
      setAgentSearchEngines: (searchEngines) => set((s) => ({
        agentState: { ...s.agentState, searchEngines }
      })),
      
      resetAgentState: () => set({
        agentState: {
          state: 'idle' as AgentState,
          quality: defaultQualityScore,
          metrics: defaultMetrics,
          verifications: [],
          plan: null,
          lastDecision: null,
          consolidation: null,
          searchEngines: null,
        },
        reportGenerationStatus: {
          isGenerating: false,
          message: '',
          progress: 0,
        }
      }),
      
      setReportGenerationStatus: (status) => set((s) => ({ 
        reportGenerationStatus: { 
          ...s.reportGenerationStatus, 
          ...status, 
          progress: status.progress ?? s.reportGenerationStatus.progress 
        } 
      })),
      
      // New actions
      setResearchSettings: (settings) => set((s) => ({
        researchSettings: { ...s.researchSettings, ...settings }
      })),
      
      addRunHistory: (entry) => set((s) => ({
        runHistory: [entry, ...s.runHistory].slice(0, 50) // Keep last 50 runs
      })),
      
      updateRunHistory: (id, updates) => set((s) => ({
        runHistory: s.runHistory.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        )
      })),
      
      setLastSuccessfulReport: (report) => set({ lastSuccessfulReport: report }),
      
      setCurrentRunId: (id) => set({ currentRunId: id }),
      
      addDebugLog: (log) => set((s) => ({
        debugLogs: [...s.debugLogs, `${new Date().toISOString()}: ${log}`].slice(-100)
      })),
      
      clearDebugLogs: () => set({ debugLogs: [] }),
      
      cancelCurrentRun: () => set((s) => {
        if (s.currentRunId) {
          return {
            isSearching: false,
            currentRunId: null,
            runHistory: s.runHistory.map((r) =>
              r.id === s.currentRunId && r.status === 'running'
                ? { ...r, status: 'failed' as const, error: 'Cancelled by user' }
                : r
            )
          };
        }
        return { isSearching: false };
      }),
    }),
    {
      name: 'research-store',
      partialize: (state) => ({ 
        deepVerifyMode: state.deepVerifyMode,
        deepVerifySourceConfigs: state.deepVerifySourceConfigs,
        researchSettings: state.researchSettings,
        lastSuccessfulReport: state.lastSuccessfulReport,
        runHistory: state.runHistory.slice(0, 20), // Persist last 20 runs
      }),
    }
  )
);
