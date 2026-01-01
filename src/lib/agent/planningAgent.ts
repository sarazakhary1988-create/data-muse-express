// Planning Agent - Creates adaptive research strategies

import { 
  ResearchPlan, 
  ResearchStrategy, 
  PlanStep, 
  SourceType, 
  PlanAdaptation,
  AgentMemory 
} from './types';
import { supabase } from '@/integrations/supabase/client';

interface QueryAnalysis {
  intent: 'factual' | 'comparative' | 'exploratory' | 'verification';
  topics: string[];
  entities: string[];
  timeframe?: string;
  region?: string;
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedSources: SourceType[];
}

export class PlanningAgent {
  private memoryCache: AgentMemory[] = [];

  async createPlan(query: string, deepVerifyEnabled: boolean = false): Promise<ResearchPlan> {
    // Analyze the query to understand intent and requirements
    const analysis = await this.analyzeQuery(query);
    
    // Get relevant memories for similar queries
    const relevantMemories = await this.getRelevantMemories(query);
    
    // Create strategy based on analysis and past learnings
    const strategy = this.createStrategy(analysis, relevantMemories, deepVerifyEnabled);
    
    // Generate execution steps
    const steps = this.generateSteps(analysis, strategy);
    
    const plan: ResearchPlan = {
      id: `plan-${Date.now()}`,
      query,
      strategy,
      steps,
      estimatedDuration: this.estimateDuration(steps, strategy),
      priority: this.determinePriority(analysis),
      createdAt: new Date(),
      adaptations: [],
    };

    return plan;
  }

  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    // Use enhanced heuristic analysis for better query understanding
    return this.enhancedQueryAnalysis(query);
  }

  private enhancedQueryAnalysis(query: string): QueryAnalysis {
    const queryLower = query.toLowerCase();
    const queryWords = query.split(/\s+/);
    
    // Extract key terms (longer words, likely to be meaningful)
    const keyTerms = queryWords.filter(w => w.length > 3 && !/^(what|which|where|when|who|how|the|and|for|with|that|this|from|have|been|will|about|into|over|after|before)$/i.test(w));
    
    // Determine intent with better heuristics
    let intent: QueryAnalysis['intent'] = 'exploratory';
    
    // Comparative queries
    if (/\b(compare|vs|versus|difference|between|better|best|top|ranking)\b/i.test(queryLower)) {
      intent = 'comparative';
    }
    // Verification queries
    else if (/\b(verify|confirm|true|false|fact.?check|is it true|accurate)\b/i.test(queryLower)) {
      intent = 'verification';
    }
    // Factual/list queries - looking for specific items
    else if (/\b(list|what are|who are|which|how many|names? of|companies? that|stocks? that)\b/i.test(queryLower)) {
      intent = 'factual';
    }
    // Question-based factual queries
    else if (/^(what|who|when|where|how|why)\b/i.test(queryLower)) {
      intent = 'factual';
    }

    // Determine complexity based on query structure
    let complexity: QueryAnalysis['complexity'] = 'simple';
    if (queryWords.length > 15 || query.includes(' and ') || query.includes(' or ')) {
      complexity = 'complex';
    } else if (queryWords.length > 8 || keyTerms.length > 4) {
      complexity = 'moderate';
    }

    // Extract potential entities (capitalized words, likely proper nouns)
    const entities = queryWords
      .filter(w => /^[A-Z][a-z]+/.test(w) && w.length > 2)
      .slice(0, 10);

    // Suggest sources based on query content
    const suggestedSources: SourceType[] = ['news'];
    
    // Financial/market queries
    if (/\b(stock|market|ipo|listing|trading|shares?|equity|investment|fund|etf|nasdaq|nyse|tasi|nomu|tadawul)\b/i.test(queryLower)) {
      suggestedSources.push('financial', 'official', 'regulatory');
    }
    // Academic/research queries
    if (/\b(research|study|paper|journal|academic|scientific|publication|thesis)\b/i.test(queryLower)) {
      suggestedSources.push('academic');
    }
    // Tech/product queries
    if (/\b(technology|software|app|platform|startup|tech|ai|machine learning|crypto|blockchain)\b/i.test(queryLower)) {
      suggestedSources.push('news', 'official');
    }
    // Government/regulatory queries
    if (/\b(government|regulation|law|policy|compliance|authority|sec|cma|fda)\b/i.test(queryLower)) {
      suggestedSources.push('official', 'regulatory');
    }

    // Detect regions
    let region: string | undefined;
    if (/\b(saudi|ksa|riyadh|tadawul|tasi)\b/i.test(queryLower)) region = 'SA';
    else if (/\b(uae|dubai|abu dhabi|emirates)\b/i.test(queryLower)) region = 'AE';
    else if (/\b(usa|united states|american|us market)\b/i.test(queryLower)) region = 'US';
    else if (/\b(uk|british|london|ftse)\b/i.test(queryLower)) region = 'UK';
    else if (/\b(china|chinese|shanghai|shenzhen)\b/i.test(queryLower)) region = 'CN';

    // Detect timeframe
    let timeframe: string | undefined;
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) timeframe = yearMatch[1];
    if (/\b(last year|past year|recent|latest|current|this year|2024|2025)\b/i.test(queryLower)) {
      timeframe = 'recent';
    }

    console.log('[PlanningAgent] Query analysis:', {
      intent,
      complexity,
      keyTerms: keyTerms.slice(0, 5),
      entities,
      suggestedSources: [...new Set(suggestedSources)],
      region,
      timeframe
    });

    return {
      intent,
      topics: keyTerms,
      entities,
      complexity,
      suggestedSources: [...new Set(suggestedSources)],
      region,
      timeframe,
    };
  }

  private async getRelevantMemories(query: string): Promise<AgentMemory[]> {
    // In a full implementation, this would query a vector database
    // For now, return cached memories that might be relevant
    return this.memoryCache.filter(m => 
      m.query.toLowerCase().includes(query.toLowerCase().slice(0, 20)) ||
      query.toLowerCase().includes(m.query.toLowerCase().slice(0, 20))
    ).slice(0, 5);
  }

  private createStrategy(
    analysis: QueryAnalysis, 
    memories: AgentMemory[],
    deepVerify: boolean
  ): ResearchStrategy {
    // Learn from past failures
    const failedApproaches = memories
      .filter(m => m.type === 'failure')
      .map(m => m.context.approach);

    // Determine approach
    let approach: ResearchStrategy['approach'] = 'hybrid';
    if (analysis.complexity === 'simple') {
      approach = 'breadth-first';
    } else if (analysis.intent === 'verification') {
      approach = 'depth-first';
    }

    // Avoid approaches that failed before
    if (failedApproaches.includes(approach)) {
      approach = approach === 'breadth-first' ? 'depth-first' : 'breadth-first';
    }

    // Determine verification level
    let verificationLevel: ResearchStrategy['verificationLevel'] = 'standard';
    if (deepVerify || analysis.intent === 'verification') {
      verificationLevel = 'thorough';
    } else if (analysis.complexity === 'simple') {
      verificationLevel = 'basic';
    }

    // Determine parallelism based on complexity
    const parallelism = analysis.complexity === 'complex' ? 8 : 
                       analysis.complexity === 'moderate' ? 5 : 3;

    return {
      approach,
      sourceTypes: analysis.suggestedSources,
      verificationLevel,
      maxSources: analysis.complexity === 'complex' ? 20 : 12,
      parallelism,
    };
  }

  private generateSteps(analysis: QueryAnalysis, strategy: ResearchStrategy): PlanStep[] {
    const steps: PlanStep[] = [];
    let stepOrder = 0;

    // Step 1: Initial broad search
    steps.push({
      id: `step-${++stepOrder}`,
      type: 'search',
      status: 'pending',
      description: `Search for: ${analysis.topics.slice(0, 3).join(', ')}`,
      dependencies: [],
    });

    // Step 2: Deep verify sources if enabled
    if (strategy.verificationLevel === 'thorough') {
      steps.push({
        id: `step-${++stepOrder}`,
        type: 'search',
        status: 'pending',
        description: 'Deep verify: Crawl official sources',
        dependencies: [],
      });
    }

    // Step 3: Scrape discovered URLs
    steps.push({
      id: `step-${++stepOrder}`,
      type: 'scrape',
      status: 'pending',
      description: 'Extract content from discovered sources',
      dependencies: ['step-1'],
    });

    // Step 4: Analyze content
    steps.push({
      id: `step-${++stepOrder}`,
      type: 'analyze',
      status: 'pending',
      description: 'Analyze and extract key information',
      dependencies: [`step-${stepOrder - 1}`],
    });

    // Step 5: Verify claims
    if (strategy.verificationLevel !== 'basic') {
      steps.push({
        id: `step-${++stepOrder}`,
        type: 'verify',
        status: 'pending',
        description: 'Verify claims with cross-references',
        dependencies: [`step-${stepOrder - 1}`],
      });
    }

    // Step 6: Enrich with additional data
    if (analysis.complexity !== 'simple') {
      steps.push({
        id: `step-${++stepOrder}`,
        type: 'enrich',
        status: 'pending',
        description: 'Enrich with entity data and context',
        dependencies: [`step-${stepOrder - 1}`],
      });
    }

    return steps;
  }

  private estimateDuration(steps: PlanStep[], strategy: ResearchStrategy): number {
    const baseTime = steps.length * 5000; // 5 seconds per step
    const parallelReduction = 1 / Math.sqrt(strategy.parallelism);
    const verificationMultiplier = strategy.verificationLevel === 'thorough' ? 1.5 : 
                                   strategy.verificationLevel === 'standard' ? 1.2 : 1;
    
    return Math.round(baseTime * parallelReduction * verificationMultiplier);
  }

  private determinePriority(analysis: QueryAnalysis): ResearchPlan['priority'] {
    if (analysis.intent === 'verification') return 'high';
    if (analysis.complexity === 'complex') return 'high';
    if (analysis.complexity === 'simple') return 'low';
    return 'medium';
  }

  async adaptPlan(plan: ResearchPlan, reason: string, changes: Partial<ResearchStrategy>): Promise<ResearchPlan> {
    const adaptation: PlanAdaptation = {
      timestamp: new Date(),
      reason,
      changes: Object.entries(changes).map(([k, v]) => `${k}: ${v}`),
    };

    const adaptedPlan: ResearchPlan = {
      ...plan,
      strategy: { ...plan.strategy, ...changes },
      adaptations: [...plan.adaptations, adaptation],
    };

    // Regenerate steps if strategy changed significantly
    if (changes.approach || changes.verificationLevel) {
      const analysis = await this.analyzeQuery(plan.query);
      adaptedPlan.steps = this.generateSteps(analysis, adaptedPlan.strategy);
    }

    return adaptedPlan;
  }

  addMemory(memory: AgentMemory): void {
    this.memoryCache.push(memory);
    // Keep only recent memories
    if (this.memoryCache.length > 100) {
      this.memoryCache = this.memoryCache.slice(-100);
    }
  }
}

export const planningAgent = new PlanningAgent();
