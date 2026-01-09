/**
 * Search Enhancement Layer for Manus 1.6 MAX
 * 
 * This module ensures:
 * 1. All search prompts are AUTOMATICALLY enhanced with AI before execution
 * 2. Selected filters and sources are STRICTLY enforced
 * 3. Real-time data sources are validated
 * 4. Integration with Manus core for optimal results
 */

import { supabase } from '@/integrations/supabase/client';
import { processWithManus } from './manusFeatureIntegration';
import { validateConfiguration } from './manus-core/config';

export interface SearchContext {
  query: string;
  timeFrame?: string;
  country?: string;
  selectedSources?: string[];
  selectedDomains?: string[];
  deepVerifyMode?: boolean;
  reportFormat?: string;
  aiConnector?: string;
  mcpConnector?: string;
}

export interface EnhancedSearchQuery {
  originalQuery: string;
  enhancedQuery: string;
  enhancementReason: string;
  filters: {
    timeFrame?: string;
    country?: string;
    sources: string[];
    domains: string[];
  };
  validated: boolean;
  errors: string[];
}

/**
 * Automatically enhance search query with AI
 * This is MANDATORY and enforced for all searches
 */
export async function autoEnhanceQuery(
  query: string,
  context: Partial<SearchContext> = {}
): Promise<EnhancedSearchQuery> {
  console.log('🔧 Auto-enhancing query:', query);
  
  const errors: string[] = [];
  let enhancedQuery = query;
  let enhancementReason = 'No enhancement applied';
  
  // Validate configuration first
  const configValidation = validateConfiguration();
  if (!configValidation.valid) {
    console.warn('⚠️ Configuration issues detected:', configValidation.errors);
    errors.push(...configValidation.errors);
  }
  
  try {
    // Call enhance-prompt edge function with full context
    const { data, error } = await supabase.functions.invoke('enhance-prompt', {
      body: {
        description: query,
        geographic_focus: context.country,
        country: context.country,
        custom_websites: context.selectedDomains || [],
        research_depth: context.deepVerifyMode ? 'deep' : 'standard',
        taskType: 'web_research',
        timeframe: context.timeFrame,
        // Add Manus context
        useManusEngine: true,
        strictSourceFiltering: true,
        realTimeOnly: true,
      },
    });

    if (error) {
      console.error('Enhancement error:', error);
      errors.push(`Enhancement failed: ${error.message}`);
    } else if (data?.enhanced_description) {
      enhancedQuery = data.enhanced_description;
      enhancementReason = 'AI-enhanced for better results';
      console.log('✅ Query enhanced successfully');
    } else {
      errors.push('No enhanced query returned');
    }
  } catch (error) {
    console.error('Failed to enhance query:', error);
    errors.push(`Enhancement exception: ${error}`);
  }
  
  // Add filters to enhanced query
  const filterParts: string[] = [];
  
  if (context.timeFrame) {
    filterParts.push(`[Time: ${context.timeFrame}]`);
  }
  
  if (context.country) {
    filterParts.push(`[Country: ${context.country}]`);
  }
  
  if (context.selectedDomains && context.selectedDomains.length > 0) {
    filterParts.push(`[Domains: ${context.selectedDomains.join(', ')}]`);
  }
  
  if (filterParts.length > 0) {
    enhancedQuery = `${enhancedQuery} ${filterParts.join(' ')}`;
  }
  
  return {
    originalQuery: query,
    enhancedQuery,
    enhancementReason,
    filters: {
      timeFrame: context.timeFrame,
      country: context.country,
      sources: context.selectedSources || [],
      domains: context.selectedDomains || [],
    },
    validated: errors.length === 0,
    errors,
  };
}

/**
 * Validate and enforce source filtering
 * Ensures agents ONLY use the selected sources
 */
export function enforceSourceFiltering(
  selectedSources: string[],
  selectedDomains: string[]
): {
  allowedSources: string[];
  allowedDomains: string[];
  enforcementRules: string[];
} {
  const enforcementRules: string[] = [];
  
  // If specific sources are selected, ONLY use those
  const allowedSources = selectedSources.length > 0 
    ? selectedSources 
    : ['google', 'bing', 'duckduckgo', 'brave', 'kagi']; // Default search engines
  
  enforcementRules.push(
    `STRICT: Only use search engines: ${allowedSources.join(', ')}`
  );
  
  // If specific domains are selected, ONLY scrape those
  const allowedDomains = selectedDomains.length > 0 
    ? selectedDomains 
    : []; // No domain restrictions if none selected
  
  if (allowedDomains.length > 0) {
    enforcementRules.push(
      `STRICT: Only scrape URLs from domains: ${allowedDomains.join(', ')}`
    );
    enforcementRules.push(
      `REJECT: Any URL not matching the allowed domains`
    );
  }
  
  return {
    allowedSources,
    allowedDomains,
    enforcementRules,
  };
}

/**
 * Validate that selected sources are available and configured for real-time data
 */
export function validateSelectedSources(
  selectedSources: string[],
  selectedDomains: string[]
): {
  valid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check if sources are supported
  const supportedSources = ['google', 'bing', 'duckduckgo', 'brave', 'kagi', 'perplexity'];
  const unsupportedSources = selectedSources.filter(s => !supportedSources.includes(s));
  
  if (unsupportedSources.length > 0) {
    issues.push(`Unsupported sources: ${unsupportedSources.join(', ')}`);
  }
  
  // Check if domains are valid URLs
  for (const domain of selectedDomains) {
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      new URL(url);
    } catch {
      issues.push(`Invalid domain: ${domain}`);
    }
  }
  
  // Warn if no sources selected
  if (selectedSources.length === 0) {
    warnings.push('No search engines selected - will use default engines');
  }
  
  // Warn if no domains selected
  if (selectedDomains.length === 0) {
    warnings.push('No domains selected - will search across all web');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Execute search with MANDATORY enhancement and strict filtering
 */
export async function executeEnhancedSearch(
  context: SearchContext
): Promise<{
  enhancedQuery: EnhancedSearchQuery;
  sourceEnforcement: ReturnType<typeof enforceSourceFiltering>;
  sourceValidation: ReturnType<typeof validateSelectedSources>;
  manusResult: any;
}> {
  console.log('🚀 Executing enhanced search with Manus 1.6 MAX');
  
  // Step 1: MANDATORY query enhancement
  const enhancedQuery = await autoEnhanceQuery(context.query, context);
  
  if (!enhancedQuery.validated) {
    console.warn('⚠️ Query enhancement had issues:', enhancedQuery.errors);
  }
  
  // Step 2: Enforce source filtering
  const sourceEnforcement = enforceSourceFiltering(
    context.selectedSources || [],
    context.selectedDomains || []
  );
  
  console.log('🔒 Source enforcement rules:', sourceEnforcement.enforcementRules);
  
  // Step 3: Validate selected sources
  const sourceValidation = validateSelectedSources(
    context.selectedSources || [],
    context.selectedDomains || []
  );
  
  if (!sourceValidation.valid) {
    console.error('❌ Source validation failed:', sourceValidation.issues);
  }
  
  if (sourceValidation.warnings.length > 0) {
    console.warn('⚠️ Source validation warnings:', sourceValidation.warnings);
  }
  
  // Step 4: Execute with Manus integration
  const manusResult = await processWithManus(
    'search_engine',
    enhancedQuery.enhancedQuery,
    {
      ...context,
      enforcementRules: sourceEnforcement.enforcementRules,
      allowedSources: sourceEnforcement.allowedSources,
      allowedDomains: sourceEnforcement.allowedDomains,
    },
    {
      enableAgentLoop: true,
      enableMemory: true,
      enableWideResearch: context.deepVerifyMode,
      maxIterations: context.deepVerifyMode ? 7 : 5,
    }
  );
  
  return {
    enhancedQuery,
    sourceEnforcement,
    sourceValidation,
    manusResult,
  };
}

/**
 * Get search quality score based on enhancement and filtering
 */
export function calculateSearchQuality(
  enhancedQuery: EnhancedSearchQuery,
  sourceValidation: ReturnType<typeof validateSelectedSources>
): {
  score: number;
  factors: Record<string, number>;
  recommendations: string[];
} {
  const factors: Record<string, number> = {};
  const recommendations: string[] = [];
  
  // Query enhancement quality (40%)
  if (enhancedQuery.validated && enhancedQuery.enhancedQuery !== enhancedQuery.originalQuery) {
    factors.queryEnhancement = 0.4;
  } else if (enhancedQuery.validated) {
    factors.queryEnhancement = 0.2;
    recommendations.push('Query could benefit from more specific keywords');
  } else {
    factors.queryEnhancement = 0;
    recommendations.push('Query enhancement failed - check configuration');
  }
  
  // Source validation quality (30%)
  if (sourceValidation.valid && sourceValidation.issues.length === 0) {
    factors.sourceValidation = 0.3;
  } else {
    factors.sourceValidation = 0;
    recommendations.push('Fix source validation issues for better results');
  }
  
  // Filter specificity (30%)
  const filterCount = [
    enhancedQuery.filters.timeFrame,
    enhancedQuery.filters.country,
    enhancedQuery.filters.sources.length > 0,
    enhancedQuery.filters.domains.length > 0,
  ].filter(Boolean).length;
  
  factors.filterSpecificity = (filterCount / 4) * 0.3;
  
  if (filterCount < 2) {
    recommendations.push('Add more filters (time, country, domains) for more targeted results');
  }
  
  const totalScore = Object.values(factors).reduce((sum, val) => sum + val, 0);
  
  return {
    score: totalScore,
    factors,
    recommendations,
  };
}
