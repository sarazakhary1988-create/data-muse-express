// LLM Endpoint Configuration utility
// Retrieves user's local LLM endpoint settings and builds request body

const STORAGE_KEY = 'llm-endpoint-config';

export interface LLMEndpointConfig {
  ollamaUrl: string;
  vllmUrl: string;
  hfTgiUrl: string;
  preferLocal: boolean;
}

const DEFAULT_CONFIG: LLMEndpointConfig = {
  ollamaUrl: 'http://localhost:11434',
  vllmUrl: 'http://localhost:8000',
  hfTgiUrl: 'http://localhost:8080',
  preferLocal: true,
};

/**
 * Get current LLM endpoint configuration from localStorage
 */
export const getLLMConfig = (): LLMEndpointConfig => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
};

/**
 * Build endpoint overrides object for edge function requests
 */
export const getEndpointOverrides = () => {
  const config = getLLMConfig();
  
  return {
    preferLocal: config.preferLocal,
    endpointOverrides: {
      ollamaUrl: config.ollamaUrl,
      vllmUrl: config.vllmUrl,
      hfTgiUrl: config.hfTgiUrl,
    },
  };
};

/**
 * Merge endpoint config into a request body
 */
export const withLLMConfig = <T extends object>(body: T): T & ReturnType<typeof getEndpointOverrides> => {
  return {
    ...body,
    ...getEndpointOverrides(),
  };
};
