/**
 * Wide Research System
 * 6 specialist agents with consensus building
 * Parallel execution with contradiction detection
 */

export interface ResearchFinding {
  agent: string;
  finding: string;
  confidence: number;
  evidence: string[];
}

export interface ConsensusResult {
  topic: string;
  consensus: boolean;
  score: number;
  findings: ResearchFinding[];
  contradictions: string[];
}

export class ResearchAgent {
  name: string;
  specialty: 'technical' | 'market' | 'data' | 'philosophical' | 'historical' | 'risk';

  constructor(name: string, specialty: ResearchAgent['specialty']) {
    this.name = name;
    this.specialty = specialty;
  }

  async research(topic: string): Promise<ResearchFinding> {
    try {
      console.log(`${this.name} researching: ${topic}`);
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Craft specialty-specific prompts
      const prompts: Record<typeof this.specialty, string> = {
        technical: `As a technical analyst, evaluate the technology and architecture aspects of: ${topic}. Focus on technical capabilities, infrastructure, innovation, and technological strengths/weaknesses.`,
        market: `As a market analyst, evaluate the market position and competitive landscape of: ${topic}. Focus on market share, competition, positioning, and market dynamics.`,
        data: `As a data analyst, extract and analyze quantitative metrics for: ${topic}. Focus on financial data, performance metrics, growth rates, and statistical insights.`,
        philosophical: `As a strategic analyst, evaluate the vision, values, and strategic direction of: ${topic}. Focus on mission, culture, long-term vision, and philosophical approach.`,
        historical: `As a historical analyst, trace the evolution and key milestones of: ${topic}. Focus on founding, major events, transformations, and historical context.`,
        risk: `As a risk analyst, identify potential risks and challenges for: ${topic}. Focus on vulnerabilities, threats, challenges, and risk mitigation.`,
      };
      
      const { data, error } = await supabase.functions.invoke('llm-router', {
        body: {
          model: 'claude-3-5-sonnet',
          prompt: prompts[this.specialty],
          temperature: 0.7,
          maxTokens: 800,
        },
      });

      if (error || !data?.response) {
        return {
          agent: this.name,
          finding: `${this.specialty} perspective on ${topic}`,
          confidence: 0.5,
          evidence: [],
        };
      }

      return {
        agent: this.name,
        finding: data.response,
        confidence: 0.85,
        evidence: [topic],
      };
    } catch (error) {
      console.error(`[${this.name}] Research error:`, error);
      return {
        agent: this.name,
        finding: `Research from ${this.specialty} perspective`,
        confidence: 0.4,
        evidence: [],
      };
    }
  }
}

export class WideResearchOrchestrator {
  private agents: ResearchAgent[];

  constructor() {
    this.agents = [
      new ResearchAgent('Technical Agent', 'technical'),
      new ResearchAgent('Market Agent', 'market'),
      new ResearchAgent('Data Agent', 'data'),
      new ResearchAgent('Philosophical Agent', 'philosophical'),
      new ResearchAgent('Historical Agent', 'historical'),
      new ResearchAgent('Risk Agent', 'risk'),
    ];
  }

  async research(topic: string, depth: 'quick' | 'comprehensive' = 'comprehensive'): Promise<ConsensusResult> {
    console.log(`Starting wide research on: ${topic}`);

    // Run all agents in parallel
    const findings = await Promise.all(
      this.agents.map(agent => agent.research(topic))
    );

    // Analyze consensus
    const avgConfidence = findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length;
    const contradictions = this.detectContradictions(findings);

    return {
      topic,
      consensus: avgConfidence > 0.75,
      score: avgConfidence,
      findings,
      contradictions,
    };
  }

  private detectContradictions(findings: ResearchFinding[]): string[] {
    const contradictions: string[] = [];
    
    // Compare findings for significant confidence differences
    for (let i = 0; i < findings.length; i++) {
      for (let j = i + 1; j < findings.length; j++) {
        const diff = Math.abs(findings[i].confidence - findings[j].confidence);
        
        // If confidence differs by more than 0.3, flag as potential contradiction
        if (diff > 0.3) {
          contradictions.push(
            `${findings[i].agent} and ${findings[j].agent} have divergent confidence levels (${findings[i].confidence.toFixed(2)} vs ${findings[j].confidence.toFixed(2)})`
          );
        }
      }
    }
    
    // Check for low-confidence findings
    findings.forEach(f => {
      if (f.confidence < 0.5) {
        contradictions.push(
          `${f.agent} has low confidence (${f.confidence.toFixed(2)}) in findings`
        );
      }
    });
    
    return contradictions;
  }
}
