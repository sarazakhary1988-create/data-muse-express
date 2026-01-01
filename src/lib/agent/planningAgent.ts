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
    try {
      // Use AI to analyze the query
      const { data, error } = await supabase.functions.invoke('research-analyze', {
        body: {
          query,
          content: '',
          type: 'extract',
          extractionPrompt: `Analyze this research query and extract:
1. Intent (factual/comparative/exploratory/verification)
2. Main topics (array of strings)
3. Named entities (companies, people, places)
4. Timeframe if mentioned
5. Region/country if mentioned
6. Complexity level (simple/moderate/complex)
7. Suggested source types (official/news/academic/social/regulatory/financial)

Query: \"${query}\"

Return as JSON.`
        }
      });

      if (data?.result) {
        try {
          const parsed = JSON.parse(data.result);
          return {
            intent: parsed.intent || 'exploratory',
            topics: parsed.topics || [query],
            entities: parsed.entities || [],
            timeframe: parsed.timeframe,
            region: parsed.region,
            complexity: parsed.complexity || 'moderate',
            suggestedSources: parsed.suggestedSources || ['news', 'official'],
          };
        } catch {
          // Fallback to heuristic analysis
          return this.heuristicAnalysis(query);
        }
      }
    } catch (error) {
      console.error('Query analysis error:', error);
    }

    return this.heuristicAnalysis(query);
  }

  private heuristicAnalysis(query: string): QueryAnalysis {
    const queryLower = query.toLowerCase();
    
    // Determine intent
    let intent: QueryAnalysis['intent'] = 'exploratory';
    if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      intent = 'comparative';
    } else if (queryLower.includes('verify') || queryLower.includes('confirm') || queryLower.includes('true')) {
      intent = 'verification';
    } else if (queryLower.includes('what is') || queryLower.includes('who is') || queryLower.includes('when')) {
      intent = 'factual';
    }

    // Extract potential topics
    const topics = query.split(/\s+/).filter(w => w.length > 4);

    // Determine complexity
    const complexity = query.length > 100 ? 'complex' : query.length > 50 ? 'moderate' : 'simple';

    // Suggest sources based on keywords
    const suggestedSources: SourceType[] = ['news'];
    if (queryLower.includes('stock') || queryLower.includes('market') || queryLower.includes('ipo') || queryLower.includes('listing')) {
      suggestedSources.push('financial', 'official', 'regulatory');
    }
    if (queryLower.includes('research') || queryLower.includes('study') || queryLower.includes('paper')) {
      suggestedSources.push('academic');
    }
    if (queryLower.includes('saudi') || queryLower.includes('tadawul') || queryLower.includes('tasi')) {
      suggestedSources.push('official', 'regulatory');
    }

    return {
      intent,
      topics,
      entities: [],
      complexity,
      suggestedSources: [...new Set(suggestedSources)],
      region: queryLower.includes('saudi') ? 'SA' : undefined,
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
