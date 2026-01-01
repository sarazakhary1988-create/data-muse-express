// Memory System - Learns and improves over time

import { AgentMemory, ResearchPlan, QualityScore } from './types';

interface MemoryEntry extends AgentMemory {
  embedding?: number[]; // For semantic search
}

interface PatternMatch {
  pattern: string;
  confidence: number;
  recommendation: string;
}

export class MemorySystem {
  private memories: MemoryEntry[] = [];
  private patterns: Map<string, PatternMatch[]> = new Map();
  private sourceQualityScores: Map<string, { score: number; samples: number }> = new Map();
  private queryPatterns: Map<string, { success: number; total: number }> = new Map();

  // Persist memories to localStorage
  private storageKey = 'research-agent-memory';

  private isLoaded = false;

  constructor() {
    // Defer localStorage access to avoid SSR/hydration issues
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  private loadFromStorage(): void {
    if (this.isLoaded) return;
    try {
      if (typeof localStorage === 'undefined') return;
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.memories = data.memories || [];
        this.sourceQualityScores = new Map(Object.entries(data.sourceQuality || {}));
        this.queryPatterns = new Map(Object.entries(data.queryPatterns || {}));
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load memory from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = {
        memories: this.memories.slice(-200), // Keep last 200 memories
        sourceQuality: Object.fromEntries(this.sourceQualityScores),
        queryPatterns: Object.fromEntries(this.queryPatterns),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save memory to storage:', error);
    }
  }

  // Record a research outcome for learning
  recordOutcome(
    query: string,
    plan: ResearchPlan,
    quality: QualityScore,
    sources: { url: string; domain: string; useful: boolean }[],
    success: boolean
  ): void {
    // Create memory entry
    const memory: MemoryEntry = {
      id: `memory-${Date.now()}`,
      type: success ? 'success' : 'failure',
      query,
      context: {
        approach: plan.strategy.approach,
        sourceTypes: plan.strategy.sourceTypes,
        verificationLevel: plan.strategy.verificationLevel,
        quality,
      },
      outcome: success ? 'Research completed successfully' : 'Research failed or low quality',
      learnings: this.extractLearnings(plan, quality, sources, success),
      timestamp: new Date(),
      relevanceScore: quality.overall,
    };

    this.memories.push(memory);

    // Update source quality scores
    for (const source of sources) {
      this.updateSourceQuality(source.domain, source.useful);
    }

    // Update query patterns
    this.updateQueryPattern(query, success);

    // Extract and store patterns
    this.detectPatterns(memory);

    // Persist
    this.saveToStorage();
  }

  private extractLearnings(
    plan: ResearchPlan,
    quality: QualityScore,
    sources: { url: string; domain: string; useful: boolean }[],
    success: boolean
  ): string[] {
    const learnings: string[] = [];

    if (success && quality.overall > 0.8) {
      learnings.push(`Strategy "${plan.strategy.approach}" worked well for this query type`);
      
      const goodSources = sources.filter(s => s.useful);
      if (goodSources.length > 0) {
        const domains = [...new Set(goodSources.map(s => s.domain))];
        learnings.push(`Reliable domains: ${domains.slice(0, 5).join(', ')}`);
      }
    }

    if (!success || quality.overall < 0.5) {
      learnings.push(`Strategy "${plan.strategy.approach}" was ineffective`);
      
      if (quality.sourceQuality < 0.5) {
        learnings.push('Need to prioritize higher quality sources');
      }
      
      if (quality.claimVerification < 0.5) {
        learnings.push('Increase verification level for similar queries');
      }
    }

    if (plan.adaptations.length > 0) {
      learnings.push(`Required ${plan.adaptations.length} adaptations during execution`);
    }

    return learnings;
  }

  private updateSourceQuality(domain: string, useful: boolean): void {
    const existing = this.sourceQualityScores.get(domain) || { score: 0.5, samples: 0 };
    const weight = Math.min(existing.samples + 1, 50) / 50; // Max weight at 50 samples
    
    const newScore = existing.score * (1 - 1 / (existing.samples + 1)) + 
                     (useful ? 1 : 0) * (1 / (existing.samples + 1));
    
    this.sourceQualityScores.set(domain, {
      score: newScore,
      samples: existing.samples + 1,
    });
  }

  private updateQueryPattern(query: string, success: boolean): void {
    // Extract pattern from query (simplified)
    const pattern = this.extractQueryPattern(query);
    const existing = this.queryPatterns.get(pattern) || { success: 0, total: 0 };
    
    this.queryPatterns.set(pattern, {
      success: existing.success + (success ? 1 : 0),
      total: existing.total + 1,
    });
  }

  private extractQueryPattern(query: string): string {
    // Simplified pattern extraction - in production, use NLP
    const words = query.toLowerCase().split(/\s+/);
    const keywords = words.filter(w => 
      w.length > 3 && 
      !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have'].includes(w)
    );
    return keywords.slice(0, 5).sort().join('_');
  }

  private detectPatterns(memory: MemoryEntry): void {
    const queryPattern = this.extractQueryPattern(memory.query);
    const patterns = this.patterns.get(queryPattern) || [];

    if (memory.type === 'success') {
      patterns.push({
        pattern: `${memory.context.approach}_${memory.context.verificationLevel}`,
        confidence: memory.relevanceScore,
        recommendation: `Use ${memory.context.approach} with ${memory.context.verificationLevel} verification`,
      });
    }

    this.patterns.set(queryPattern, patterns.slice(-10)); // Keep last 10 patterns per query type
  }

  // Get recommendations for a new query
  getRecommendations(query: string): {
    approach?: string;
    verificationLevel?: string;
    sourcesToPrioritize: string[];
    sourcesToAvoid: string[];
    expectedQuality: number;
  } {
    const queryPattern = this.extractQueryPattern(query);
    const patternStats = this.queryPatterns.get(queryPattern);
    const patterns = this.patterns.get(queryPattern) || [];

    // Sort patterns by confidence
    const bestPattern = patterns.sort((a, b) => b.confidence - a.confidence)[0];

    // Get source recommendations
    const sortedSources = [...this.sourceQualityScores.entries()]
      .sort((a, b) => b[1].score - a[1].score);
    
    const sourcesToPrioritize = sortedSources
      .filter(([_, v]) => v.score > 0.7 && v.samples > 3)
      .slice(0, 10)
      .map(([k]) => k);
    
    const sourcesToAvoid = sortedSources
      .filter(([_, v]) => v.score < 0.3 && v.samples > 5)
      .slice(0, 5)
      .map(([k]) => k);

    // Calculate expected quality
    const expectedQuality = patternStats 
      ? patternStats.success / patternStats.total 
      : 0.5;

    return {
      approach: bestPattern?.pattern.split('_')[0],
      verificationLevel: bestPattern?.pattern.split('_')[1],
      sourcesToPrioritize,
      sourcesToAvoid,
      expectedQuality,
    };
  }

  // Get source quality score
  getSourceQuality(domain: string): number {
    return this.sourceQualityScores.get(domain)?.score || 0.5;
  }

  // Find similar past queries
  findSimilarQueries(query: string, limit: number = 5): AgentMemory[] {
    const queryPattern = this.extractQueryPattern(query);
    
    return this.memories
      .filter(m => {
        const memoryPattern = this.extractQueryPattern(m.query);
        // Simple similarity: check if patterns share words
        const queryWords = new Set(queryPattern.split('_'));
        const memoryWords = memoryPattern.split('_');
        const overlap = memoryWords.filter(w => queryWords.has(w)).length;
        return overlap > 0;
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  // Get learning statistics
  getStats(): {
    totalMemories: number;
    successRate: number;
    topSources: { domain: string; score: number }[];
    recentLearnings: string[];
  } {
    const successes = this.memories.filter(m => m.type === 'success').length;
    
    const topSources = [...this.sourceQualityScores.entries()]
      .filter(([_, v]) => v.samples > 3)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 10)
      .map(([domain, { score }]) => ({ domain, score }));

    const recentLearnings = this.memories
      .slice(-10)
      .flatMap(m => m.learnings)
      .slice(-10);

    return {
      totalMemories: this.memories.length,
      successRate: this.memories.length > 0 ? successes / this.memories.length : 0,
      topSources,
      recentLearnings,
    };
  }

  // Clear all memory (for testing/reset)
  clear(): void {
    this.memories = [];
    this.patterns.clear();
    this.sourceQualityScores.clear();
    this.queryPatterns.clear();
    this.isLoaded = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}

// Lazy singleton to avoid SSR issues
let _memorySystem: MemorySystem | null = null;
export const memorySystem = new Proxy({} as MemorySystem, {
  get(_, prop) {
    if (!_memorySystem) {
      _memorySystem = new MemorySystem();
    }
    return (_memorySystem as any)[prop];
  }
});
