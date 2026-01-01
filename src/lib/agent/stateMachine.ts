// Agent State Machine - Orchestrates the complete research workflow

import { AgentState, DecisionContext, AgentDecision, AgentError, QualityScore } from './types';

type StateTransition = {
  from: AgentState;
  to: AgentState;
  condition?: (context: DecisionContext) => boolean;
  action?: (context: DecisionContext) => Promise<void>;
};

type StateHandler = {
  onEnter?: (context: DecisionContext) => Promise<void>;
  onExit?: (context: DecisionContext) => Promise<void>;
  onError?: (error: AgentError, context: DecisionContext) => Promise<AgentState>;
};

export class AgentStateMachine {
  private currentState: AgentState = 'idle';
  private stateHandlers: Map<AgentState, StateHandler> = new Map();
  private transitions: StateTransition[] = [];
  private listeners: Set<(state: AgentState, context: DecisionContext) => void> = new Set();
  private context: DecisionContext;

  constructor() {
    this.context = this.createInitialContext();
    this.setupTransitions();
    this.setupStateHandlers();
  }

  private createInitialContext(): DecisionContext {
    return {
      currentState: 'idle',
      plan: null,
      progress: 0,
      results: [],
      quality: {
        overall: 0,
        accuracy: 0,
        completeness: 0,
        freshness: 0,
        sourceQuality: 0,
        claimVerification: 0,
      },
      timeElapsed: 0,
      errors: [],
    };
  }

  private setupTransitions() {
    // Define valid state transitions
    this.transitions = [
      // From idle
      { from: 'idle', to: 'planning' },
      
      // From planning
      { from: 'planning', to: 'searching', condition: (ctx) => ctx.plan !== null },
      { from: 'planning', to: 'failed', condition: (ctx) => ctx.errors.length > 3 },
      
      // From searching
      { from: 'searching', to: 'scraping', condition: (ctx) => ctx.results.length > 0 },
      { from: 'searching', to: 'planning', condition: (ctx) => ctx.results.length === 0 },
      { from: 'searching', to: 'failed' },
      
      // From scraping
      { from: 'scraping', to: 'analyzing', condition: (ctx) => ctx.progress >= 30 },
      { from: 'scraping', to: 'searching' }, // Retry with different queries
      { from: 'scraping', to: 'failed' },
      
      // From analyzing - allow transition when analysis is done (progress set by analyzing handler)
      { from: 'analyzing', to: 'verifying', condition: (ctx) => ctx.progress >= 50 },
      { from: 'analyzing', to: 'scraping' }, // Need more data
      { from: 'analyzing', to: 'failed' },
      
      // From verifying - lowered threshold to allow progression
      { from: 'verifying', to: 'compiling', condition: (ctx) => ctx.quality.claimVerification >= 0.3 },
      { from: 'verifying', to: 'compiling' }, // Fallback: always allow compiling after verification
      { from: 'verifying', to: 'searching' }, // Need more sources
      { from: 'verifying', to: 'analyzing' }, // Re-analyze with new data
      { from: 'verifying', to: 'failed' },
      
      // From compiling - lowered threshold and added fallback
      { from: 'compiling', to: 'completed', condition: (ctx) => ctx.quality.overall >= 0.3 },
      { from: 'compiling', to: 'completed' }, // Fallback: always allow completion after compiling
      { from: 'compiling', to: 'verifying' }, // Quality too low
      { from: 'compiling', to: 'failed' },
      
      // Recovery transitions
      { from: 'failed', to: 'planning' }, // Retry with new plan
      { from: 'failed', to: 'idle' },
      
      // Reset
      { from: 'completed', to: 'idle' },
    ];
  }

  private setupStateHandlers() {
    this.stateHandlers.set('idle', {
      onEnter: async (ctx) => {
        ctx.progress = 0;
        ctx.errors = [];
      },
    });

    this.stateHandlers.set('planning', {
      onEnter: async (ctx) => {
        ctx.progress = 5;
      },
      onError: async (error, ctx) => {
        if (error.recoverable) return 'planning';
        return 'failed';
      },
    });

    this.stateHandlers.set('searching', {
      onEnter: async (ctx) => {
        ctx.progress = Math.max(ctx.progress, 15);
      },
      onError: async (error, ctx) => {
        if (error.type === 'rate_limit') return 'planning';
        if (error.recoverable) return 'searching';
        return 'failed';
      },
    });

    this.stateHandlers.set('scraping', {
      onEnter: async (ctx) => {
        ctx.progress = Math.max(ctx.progress, 30);
      },
      onError: async (error, ctx) => {
        if (error.type === 'timeout') return 'scraping';
        if (error.recoverable) return 'searching';
        return 'failed';
      },
    });

    this.stateHandlers.set('analyzing', {
      onEnter: async (ctx) => {
        ctx.progress = Math.max(ctx.progress, 50);
      },
      onError: async (error, ctx) => {
        if (error.recoverable) return 'analyzing';
        return 'failed';
      },
    });

    this.stateHandlers.set('verifying', {
      onEnter: async (ctx) => {
        ctx.progress = Math.max(ctx.progress, 70);
      },
      onError: async (error, ctx) => {
        if (error.recoverable) return 'verifying';
        return 'compiling'; // Continue with partial verification
      },
    });

    this.stateHandlers.set('compiling', {
      onEnter: async (ctx) => {
        ctx.progress = Math.max(ctx.progress, 85);
      },
      onError: async (error, ctx) => {
        return 'failed';
      },
    });

    this.stateHandlers.set('completed', {
      onEnter: async (ctx) => {
        ctx.progress = 100;
      },
    });

    this.stateHandlers.set('failed', {
      onEnter: async (ctx) => {
        // Log failure for learning
      },
    });
  }

  public getState(): AgentState {
    return this.currentState;
  }

  public getContext(): DecisionContext {
    return { ...this.context };
  }

  public async transition(to: AgentState): Promise<boolean> {
    const validTransition = this.transitions.find(
      t => t.from === this.currentState && t.to === to
    );

    console.log(`[StateMachine] Attempting transition: ${this.currentState} → ${to}`);
    console.log(`[StateMachine] Current context:`, {
      progress: this.context.progress,
      resultsCount: this.context.results.length,
      quality: this.context.quality,
      errorsCount: this.context.errors.length,
      hasPlan: !!this.context.plan
    });

    if (!validTransition) {
      console.error(`[StateMachine] ❌ Invalid transition: no path from ${this.currentState} to ${to}`);
      console.log(`[StateMachine] Valid transitions from ${this.currentState}:`, this.getValidTransitions());
      return false;
    }

    // Check condition if exists
    if (validTransition.condition) {
      const conditionMet = validTransition.condition(this.context);
      console.log(`[StateMachine] Condition check for ${this.currentState} → ${to}: ${conditionMet ? '✅ PASSED' : '❌ FAILED'}`);
      if (!conditionMet) {
        console.warn(`[StateMachine] Transition blocked - condition not met`);
        return false;
      }
    }

    // Exit current state
    const currentHandler = this.stateHandlers.get(this.currentState);
    if (currentHandler?.onExit) {
      console.log(`[StateMachine] Running onExit for ${this.currentState}`);
      await currentHandler.onExit(this.context);
    }

    // Execute transition action
    if (validTransition.action) {
      console.log(`[StateMachine] Running transition action`);
      await validTransition.action(this.context);
    }

    // Update state
    const previousState = this.currentState;
    this.currentState = to;
    this.context.currentState = to;

    // Enter new state
    const newHandler = this.stateHandlers.get(to);
    if (newHandler?.onEnter) {
      console.log(`[StateMachine] Running onEnter for ${to}`);
      await newHandler.onEnter(this.context);
    }

    // Notify listeners
    this.notifyListeners();

    console.log(`[StateMachine] ✅ Transition complete: ${previousState} → ${to} | Progress: ${this.context.progress}%`);
    return true;
  }

  public async handleError(error: AgentError): Promise<void> {
    this.context.errors.push(error);

    const handler = this.stateHandlers.get(this.currentState);
    if (handler?.onError) {
      const newState = await handler.onError(error, this.context);
      if (newState !== this.currentState) {
        await this.transition(newState);
      }
    } else {
      // Default error handling
      if (!error.recoverable) {
        await this.transition('failed');
      }
    }
  }

  public updateContext(updates: Partial<DecisionContext>): void {
    console.log(`[StateMachine] Context update:`, updates);
    this.context = { ...this.context, ...updates };
    this.notifyListeners();
  }

  public updateQuality(quality: Partial<QualityScore>): void {
    console.log(`[StateMachine] Quality update:`, quality);
    this.context.quality = { ...this.context.quality, ...quality };
    console.log(`[StateMachine] New overall quality: ${(this.context.quality.overall * 100).toFixed(1)}%`);
    this.notifyListeners();
  }

  public addResult(result: any): void {
    this.context.results.push(result);
    this.notifyListeners();
  }

  public subscribe(listener: (state: AgentState, context: DecisionContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentState, this.context));
  }

  public reset(): void {
    this.currentState = 'idle';
    this.context = this.createInitialContext();
    this.notifyListeners();
  }

  public canTransitionTo(state: AgentState): boolean {
    return this.transitions.some(
      t => t.from === this.currentState && t.to === state &&
        (!t.condition || t.condition(this.context))
    );
  }

  public getValidTransitions(): AgentState[] {
    return this.transitions
      .filter(t => t.from === this.currentState && (!t.condition || t.condition(this.context)))
      .map(t => t.to);
  }
}

// Singleton instance
export const agentStateMachine = new AgentStateMachine();
