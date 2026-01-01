// Decision Engine - Autonomously decides next actions

import { 
  DecisionContext, 
  AgentDecision, 
  AgentAction, 
  AgentState,
  QualityScore,
  AgentError 
} from './types';
import { memorySystem } from './memorySystem';

interface DecisionRule {
  condition: (ctx: DecisionContext) => boolean;
  action: AgentAction;
  priority: number;
  description: string;
}

export class DecisionEngine {
  private rules: DecisionRule[] = [];
  private decisionHistory: { decision: AgentDecision; context: DecisionContext; timestamp: Date }[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // High priority: Error handling
    this.rules.push({
      condition: (ctx) => ctx.errors.length > 5,
      action: { type: 'fail', reason: 'Too many errors accumulated' },
      priority: 100,
      description: 'Fail after too many errors',
    });

    this.rules.push({
      condition: (ctx) => {
        const recentErrors = ctx.errors.filter(e => 
          Date.now() - new Date(e.timestamp).getTime() < 30000
        );
        return recentErrors.length >= 3;
      },
      action: { type: 'adapt', changes: ['reduce_parallelism', 'increase_timeout'] },
      priority: 90,
      description: 'Adapt when seeing frequent recent errors',
    });

    // Rate limit handling
    this.rules.push({
      condition: (ctx) => ctx.errors.some(e => e.type === 'rate_limit'),
      action: { type: 'retry', target: 'current_step' },
      priority: 85,
      description: 'Retry on rate limit with backoff',
    });

    // Quality-based decisions
    this.rules.push({
      condition: (ctx) => 
        ctx.currentState === 'compiling' && ctx.quality.overall < 0.5,
      action: { type: 'adapt', changes: ['increase_sources', 'deeper_verification'] },
      priority: 80,
      description: 'Adapt strategy when quality is too low',
    });

    this.rules.push({
      condition: (ctx) => 
        ctx.currentState === 'verifying' && ctx.quality.claimVerification < 0.4,
      action: { type: 'parallel_search', queries: [] }, // Will be populated dynamically
      priority: 75,
      description: 'Search for more verification sources',
    });

    // Progress-based decisions
    this.rules.push({
      condition: (ctx) => 
        ctx.currentState === 'searching' && ctx.results.length === 0 && ctx.timeElapsed > 15000,
      action: { type: 'adapt', changes: ['broaden_query', 'change_sources'] },
      priority: 70,
      description: 'Adapt search when no results found',
    });

    this.rules.push({
      condition: (ctx) => 
        ctx.currentState === 'scraping' && ctx.results.length > 0 && ctx.progress < 40,
      action: { type: 'continue' },
      priority: 50,
      description: 'Continue scraping with results',
    });

    // Completion decisions
    this.rules.push({
      condition: (ctx) => 
        ctx.currentState === 'compiling' && ctx.quality.overall >= 0.8,
      action: { type: 'complete' },
      priority: 60,
      description: 'Complete when quality threshold met',
    });

    this.rules.push({
      condition: (ctx) => 
        ctx.progress >= 100,
      action: { type: 'complete' },
      priority: 55,
      description: 'Complete when progress is 100%',
    });

    // Default continue
    this.rules.push({
      condition: () => true,
      action: { type: 'continue' },
      priority: 1,
      description: 'Default: continue execution',
    });
  }

  decide(context: DecisionContext): AgentDecision {
    // Sort rules by priority (highest first)
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    // Find first matching rule
    for (const rule of sortedRules) {
      if (rule.condition(context)) {
        const decision: AgentDecision = {
          action: this.enrichAction(rule.action, context),
          reason: rule.description,
          confidence: this.calculateConfidence(context, rule),
          alternativeActions: this.getAlternatives(context, rule),
        };

        // Record decision
        this.decisionHistory.push({
          decision,
          context: { ...context },
          timestamp: new Date(),
        });

        return decision;
      }
    }

    // Should never reach here due to default rule
    return {
      action: { type: 'continue' },
      reason: 'No matching rule, continuing',
      confidence: 0.5,
      alternativeActions: [],
    };
  }

  private enrichAction(action: AgentAction, context: DecisionContext): AgentAction {
    // Enrich actions with dynamic data
    if (action.type === 'parallel_search') {
      // Generate additional search queries based on context
      const plan = context.plan;
      if (plan) {
        return {
          type: 'parallel_search',
          queries: [
            `${plan.query} verification`,
            `${plan.query} sources`,
            `${plan.query} official`,
          ],
        };
      }
    }

    if (action.type === 'adapt') {
      // Get recommendations from memory system
      const recommendations = memorySystem.getRecommendations(context.plan?.query || '');
      const changes = [...(action as any).changes];
      
      if (recommendations.approach && !changes.includes('change_approach')) {
        changes.push(`approach:${recommendations.approach}`);
      }
      
      return { type: 'adapt', changes };
    }

    return action;
  }

  private calculateConfidence(context: DecisionContext, rule: DecisionRule): number {
    // Base confidence from rule priority
    let confidence = Math.min(rule.priority / 100, 1);

    // Adjust based on quality scores
    confidence *= (context.quality.overall * 0.3 + 0.7);

    // Adjust based on error count
    const errorPenalty = Math.min(context.errors.length * 0.1, 0.3);
    confidence *= (1 - errorPenalty);

    // Adjust based on memory recommendations
    const recommendations = memorySystem.getRecommendations(context.plan?.query || '');
    confidence *= (0.5 + recommendations.expectedQuality * 0.5);

    return Math.max(0.1, Math.min(1, confidence));
  }

  private getAlternatives(context: DecisionContext, matchedRule: DecisionRule): AgentAction[] {
    // Find other rules that could apply
    return this.rules
      .filter(r => r !== matchedRule && r.condition(context) && r.priority > 10)
      .slice(0, 3)
      .map(r => r.action);
  }

  // Evaluate if current strategy is working
  evaluateProgress(context: DecisionContext): {
    isOnTrack: boolean;
    recommendations: string[];
    adjustments: Partial<any>[];
  } {
    const recommendations: string[] = [];
    const adjustments: Partial<any>[] = [];
    let isOnTrack = true;

    // Check progress rate
    const expectedProgress = (context.timeElapsed / 60000) * 20; // Expect ~20% per minute
    if (context.progress < expectedProgress * 0.5) {
      isOnTrack = false;
      recommendations.push('Progress is slower than expected');
      adjustments.push({ parallelism: 'increase' });
    }

    // Check quality trajectory
    if (context.progress > 50 && context.quality.overall < 0.4) {
      isOnTrack = false;
      recommendations.push('Quality is below threshold at 50% progress');
      adjustments.push({ verificationLevel: 'thorough' });
    }

    // Check error rate
    const errorRate = context.errors.length / Math.max(context.progress / 10, 1);
    if (errorRate > 0.5) {
      isOnTrack = false;
      recommendations.push('High error rate detected');
      adjustments.push({ retryStrategy: 'exponential' });
    }

    // Use memory for recommendations
    const memoryRecs = memorySystem.getRecommendations(context.plan?.query || '');
    if (memoryRecs.sourcesToAvoid.length > 0) {
      recommendations.push(`Avoid sources: ${memoryRecs.sourcesToAvoid.join(', ')}`);
    }

    return { isOnTrack, recommendations, adjustments };
  }

  // Get decision history for analysis
  getHistory(): { decision: AgentDecision; context: DecisionContext; timestamp: Date }[] {
    return [...this.decisionHistory];
  }

  // Clear history
  clearHistory(): void {
    this.decisionHistory = [];
  }

  // Add custom rule
  addRule(rule: DecisionRule): void {
    this.rules.push(rule);
  }
}

export const decisionEngine = new DecisionEngine();
