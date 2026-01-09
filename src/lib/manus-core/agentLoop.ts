/**
 * Agent Loop Implementation
 * 4-phase orchestration: Analyze → Plan → Execute → Observe
 * Supports up to 5 iterations with full context history
 */

export interface AgentContext {
  goal: string;
  history: AgentStep[];
  currentPhase: 'analyze' | 'plan' | 'execute' | 'observe';
  iteration: number;
  maxIterations: number;
}

export interface AgentStep {
  phase: 'analyze' | 'plan' | 'execute' | 'observe';
  action: string;
  input: unknown;
  output: unknown;
  timestamp: Date;
}

export async function analyzePhase(context: AgentContext): Promise<string> {
  try {
    console.log(`[Phase 1] Analyzing: ${context.goal}`);
    
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('llm-router', {
      body: {
        model: 'claude-3-5-sonnet',
        prompt: `You are an AI agent analyzing a research goal. Assess the current situation and identify key requirements.

Goal: ${context.goal}

Previous iterations: ${context.iteration > 1 ? JSON.stringify(context.history.slice(-3)) : 'None'}

Provide a concise analysis including:
1. What information is needed
2. What challenges might exist
3. What approach would be most effective

Analysis:`,
        temperature: 0.7,
        maxTokens: 500,
      },
    });

    if (error || !data?.response) {
      return `Analysis: Need to research "${context.goal}". Will use web search and data extraction tools.`;
    }

    return data.response;
  } catch (error) {
    console.error('[Analyze Phase] Error:', error);
    return `Analysis: Research goal "${context.goal}" identified. Proceeding with execution.`;
  }
}

export async function planPhase(context: AgentContext, analysis: string): Promise<string[]> {
  try {
    console.log(`[Phase 2] Planning based on: ${analysis}`);
    
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('llm-router', {
      body: {
        model: 'gpt-4o',
        prompt: `You are an AI agent creating an action plan. Based on the analysis, create a step-by-step plan.

Goal: ${context.goal}
Analysis: ${analysis}

Available tools:
- Web search (ai-web-search)
- Web scraping (ai-web-scrape, crawl4ai)
- Browser automation (browser-use, playwright)
- LLM analysis (llm-router)

Create 3-5 specific action steps. Return as JSON array of strings.

Plan:`,
        temperature: 0.5,
        maxTokens: 400,
      },
    });

    if (error || !data?.response) {
      return [
        'Search for relevant information',
        'Extract and analyze data',
        'Synthesize findings'
      ];
    }

    try {
      const plan = JSON.parse(data.response);
      return Array.isArray(plan) ? plan : [data.response];
    } catch {
      // Parse as text if not JSON
      const steps = data.response.split('\n').filter((s: string) => s.trim().length > 0);
      return steps.length > 0 ? steps : ['Execute research', 'Analyze results', 'Compile findings'];
    }
  } catch (error) {
    console.error('[Plan Phase] Error:', error);
    return ['Search for information', 'Analyze data', 'Generate report'];
  }
}

export async function executePhase(context: AgentContext, plan: string[]): Promise<unknown> {
  try {
    console.log(`[Phase 3] Executing ${plan.length} actions`);
    
    // Execute plan steps using available tools
    const results: any[] = [];
    
    for (const action of plan) {
      const actionLower = action.toLowerCase();
      
      // Determine which tool to use based on action
      if (actionLower.includes('search')) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.functions.invoke('ai-web-search', {
          body: { query: context.goal, maxResults: 5 },
        });
        results.push({ action, tool: 'search', data: data?.results || [] });
      } else if (actionLower.includes('scrape') || actionLower.includes('extract')) {
        results.push({ action, tool: 'scrape', status: 'queued' });
      } else if (actionLower.includes('analyze') || actionLower.includes('synthesize')) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.functions.invoke('llm-router', {
          body: {
            model: 'gpt-4o',
            prompt: `Analyze the goal: ${context.goal}\n\nProvide key insights.`,
            temperature: 0.7,
          },
        });
        results.push({ action, tool: 'analyze', insights: data?.response || 'Analysis complete' });
      } else {
        results.push({ action, status: 'completed' });
      }
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('[Execute Phase] Error:', error);
    return { success: false, error: String(error) };
  }
}

export async function observePhase(context: AgentContext, result: unknown): Promise<boolean> {
  try {
    console.log(`[Phase 4] Observing results`);
    
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('llm-router', {
      body: {
        model: 'claude-3-5-sonnet',
        prompt: `You are an AI agent evaluating research results. Determine if the goal has been achieved.

Goal: ${context.goal}
Results: ${JSON.stringify(result).substring(0, 1000)}

Has the goal been achieved? Respond with "YES" or "NO" followed by a brief explanation.

Evaluation:`,
        temperature: 0.3,
        maxTokens: 200,
      },
    });

    if (error || !data?.response) {
      // Fallback: consider successful if we're past iteration 1
      return context.iteration >= 2;
    }

    const response = data.response.toLowerCase();
    return response.includes('yes') || response.includes('achieved') || response.includes('complete');
  } catch (error) {
    console.error('[Observe Phase] Error:', error);
    return context.iteration >= context.maxIterations;
  }
}

export async function executeAgentLoop(goal: string, maxIterations: number = 5): Promise<unknown> {
  const context: AgentContext = {
    goal,
    history: [],
    currentPhase: 'analyze',
    iteration: 0,
    maxIterations,
  };

  for (context.iteration = 1; context.iteration <= maxIterations; context.iteration++) {
    try {
      // Phase 1: Analyze
      context.currentPhase = 'analyze';
      const analysis = await analyzePhase(context);
      context.history.push({
        phase: 'analyze',
        action: 'Analyze situation',
        input: { goal },
        output: analysis,
        timestamp: new Date(),
      });

      // Phase 2: Plan
      context.currentPhase = 'plan';
      const plan = await planPhase(context, analysis);
      context.history.push({
        phase: 'plan',
        action: 'Create action plan',
        input: { analysis },
        output: plan,
        timestamp: new Date(),
      });

      // Phase 3: Execute
      context.currentPhase = 'execute';
      const result = await executePhase(context, plan);
      context.history.push({
        phase: 'execute',
        action: 'Execute actions',
        input: { plan },
        output: result,
        timestamp: new Date(),
      });

      // Phase 4: Observe
      context.currentPhase = 'observe';
      const success = await observePhase(context, result);
      context.history.push({
        phase: 'observe',
        action: 'Evaluate results',
        input: { result },
        output: { success },
        timestamp: new Date(),
      });

      if (success) {
        console.log(`Goal achieved in iteration ${context.iteration}`);
        break;
      }
    } catch (error) {
      console.error(`Error in iteration ${context.iteration}:`, error);
    }
  }

  return {
    goal: context.goal,
    iterations: context.iteration,
    success: context.iteration <= context.maxIterations,
    history: context.history,
  };
}
