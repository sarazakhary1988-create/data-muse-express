import { useState, useEffect, useCallback, useRef } from 'react';
import { ManusAgentState, AgentMetrics, SubAgent } from '@/lib/agent/manusArchitecture';

interface ManusRealtimeState {
  state: ManusAgentState;
  progress: number;
  currentStep: string;
  subAgents: SubAgentStatus[];
  metrics: RealtimeMetrics;
  observations: RealtimeObservation[];
  errors: RealtimeError[];
}

interface SubAgentStatus {
  id: string;
  type: 'search' | 'scrape' | 'validate' | 'enrich' | 'classify';
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

interface RealtimeMetrics {
  totalSteps: number;
  completedSteps: number;
  sourcesProcessed: number;
  factsExtracted: number;
  verificationsPerformed: number;
  executionTimeMs: number;
}

interface RealtimeObservation {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  source: string;
  confidence: number;
}

interface RealtimeError {
  id: string;
  type: string;
  message: string;
  recoverable: boolean;
  timestamp: string;
}

// Streamed result from research
export interface StreamedResult {
  id: string;
  type: 'article' | 'finding' | 'enrichment' | 'validation' | 'analysis';
  data: {
    title: string;
    url: string;
    snippet: string;
    source: string;
    publishDate?: string;
    author?: string;
    category?: string;
    relevanceScore?: number;
    credibilityBadge?: 'official' | 'premium' | 'verified' | 'unverified';
    explorium?: {
      enrichmentType: string;
      linkedInProfiles?: number;
      revenueEstimate?: string;
      employeeCount?: number;
      fundingRounds?: number;
      dataConfidence?: number;
      sources?: string[];
    };
  };
  source: string;
  agentId: string;
  confidence: number;
  timestamp: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
  validation?: {
    urlValid: boolean;
    errors: string[];
    domain: string;
    credibility: string;
  };
}

interface UseManusRealtimeOptions {
  autoConnect?: boolean;
  onStateChange?: (state: ManusRealtimeState) => void;
  onComplete?: (metrics: RealtimeMetrics) => void;
  onError?: (error: RealtimeError) => void;
  onResult?: (result: StreamedResult) => void;
}

const WEBSOCKET_URL = 'wss://hhkbtwcmztozihipiszm.functions.supabase.co/functions/v1/manus-realtime';

export function useManusRealtime(options: UseManusRealtimeOptions = {}) {
  const { autoConnect = false, onStateChange, onComplete, onError, onResult } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [streamedResults, setStreamedResults] = useState<StreamedResult[]>([]);
  const [state, setState] = useState<ManusRealtimeState>({
    state: 'idle',
    progress: 0,
    currentStep: 'Waiting for research task...',
    subAgents: [],
    metrics: {
      totalSteps: 0,
      completedSteps: 0,
      sourcesProcessed: 0,
      factsExtracted: 0,
      verificationsPerformed: 0,
      executionTimeMs: 0,
    },
    observations: [],
    errors: [],
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Manus Realtime] Already connected');
      return;
    }

    console.log('[Manus Realtime] Connecting to WebSocket...');
    
    try {
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Manus Realtime] Connected');
        setIsConnected(true);
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[Manus Realtime] Message:', message.type);

          switch (message.type) {
            case 'connected':
              setConnectionId(message.connectionId);
              setStreamedResults([]); // Clear previous results
              break;
            
            case 'state_update':
              setState(message.state);
              onStateChange?.(message.state);
              break;
            
            case 'result_stream':
              // Handle streamed result
              const result: StreamedResult = {
                ...message.result,
                validation: message.validation,
              };
              setStreamedResults(prev => [...prev, result]);
              onResult?.(result);
              console.log('[Manus Realtime] Streamed result:', result.data?.title);
              break;
            
            case 'agent_update':
              console.log('[Manus Realtime] Agent update:', message.agentType, message.status);
              break;
            
            case 'research_complete':
              onComplete?.(message.metrics);
              break;
            
            case 'research_cancelled':
              setStreamedResults([]);
              break;
            
            case 'error':
              const error: RealtimeError = {
                id: `error-${Date.now()}`,
                type: 'websocket',
                message: message.message,
                recoverable: true,
                timestamp: message.timestamp,
              };
              onError?.(error);
              break;
            
            case 'pong':
              // Connection alive
              break;
          }
        } catch (e) {
          console.error('[Manus Realtime] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[Manus Realtime] Disconnected');
        setIsConnected(false);
        setConnectionId(null);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Auto-reconnect after 5 seconds
        if (autoConnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('[Manus Realtime] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[Manus Realtime] Failed to connect:', error);
    }
  }, [autoConnect, onStateChange, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionId(null);
  }, []);

  const startResearch = useCallback((query: string, options?: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[Manus Realtime] Not connected');
      return false;
    }

    // Clear previous results
    setStreamedResults([]);

    wsRef.current.send(JSON.stringify({
      type: 'start_research',
      query,
      options,
    }));
    
    return true;
  }, []);

  const cancelResearch = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel_research' }));
    }
  }, []);

  const getStatus = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_status' }));
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  const clearResults = useCallback(() => {
    setStreamedResults([]);
  }, []);

  return {
    isConnected,
    connectionId,
    state,
    streamedResults,
    connect,
    disconnect,
    startResearch,
    cancelResearch,
    getStatus,
    clearResults,
  };
}

export type { ManusRealtimeState, SubAgentStatus, RealtimeMetrics, RealtimeObservation, RealtimeError };
