import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Manus 1.6 MAX Realtime WebSocket Orchestrator
// Provides live research status updates and progress tracking

interface ManusState {
  state: 'idle' | 'analyzing' | 'planning' | 'executing' | 'observing' | 'verifying' | 'synthesizing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  subAgents: SubAgentStatus[];
  metrics: ManusMetrics;
  observations: Observation[];
  errors: ManusError[];
}

interface SubAgentStatus {
  id: string;
  type: 'search' | 'scrape' | 'validate' | 'enrich' | 'classify';
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

interface ManusMetrics {
  totalSteps: number;
  completedSteps: number;
  sourcesProcessed: number;
  factsExtracted: number;
  verificationsPerformed: number;
  executionTimeMs: number;
}

interface Observation {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  source: string;
  confidence: number;
}

interface ManusError {
  id: string;
  type: string;
  message: string;
  recoverable: boolean;
  timestamp: string;
}

// Store active connections
const connections = new Map<string, WebSocket>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle WebSocket upgrade
  if (upgradeHeader.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const connectionId = crypto.randomUUID();
    
    console.log(`[Manus Realtime] New connection: ${connectionId}`);
    connections.set(connectionId, socket);

    // Initialize state
    let manusState: ManusState = {
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
    };

    socket.onopen = () => {
      console.log(`[Manus Realtime] Connection opened: ${connectionId}`);
      socket.send(JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date().toISOString(),
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`[Manus Realtime] Message received:`, message.type);

        switch (message.type) {
          case 'start_research':
            await handleStartResearch(socket, message, manusState);
            break;
          
          case 'cancel_research':
            manusState.state = 'idle';
            manusState.progress = 0;
            socket.send(JSON.stringify({
              type: 'research_cancelled',
              timestamp: new Date().toISOString(),
            }));
            break;
          
          case 'get_status':
            socket.send(JSON.stringify({
              type: 'status_update',
              state: manusState,
              timestamp: new Date().toISOString(),
            }));
            break;
          
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
          
          default:
            console.log(`[Manus Realtime] Unknown message type: ${message.type}`);
        }
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Manus Realtime] Error processing message:`, error);
        socket.send(JSON.stringify({
          type: 'error',
          message: errMessage,
          timestamp: new Date().toISOString(),
        }));
      }
    };

    socket.onclose = () => {
      console.log(`[Manus Realtime] Connection closed: ${connectionId}`);
      connections.delete(connectionId);
    };

    socket.onerror = (error) => {
      console.error(`[Manus Realtime] WebSocket error:`, error);
    };

    return response;
  }

  // Non-WebSocket request - return info
  return new Response(JSON.stringify({
    service: 'Manus 1.6 MAX Realtime Orchestrator',
    version: '1.6.0',
    status: 'running',
    activeConnections: connections.size,
    capabilities: [
      'real-time-progress',
      'sub-agent-tracking',
      'live-observations',
      'error-recovery',
      'metrics-streaming',
    ],
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function handleStartResearch(socket: WebSocket, message: any, state: ManusState) {
  const { query, options } = message;
  const startTime = Date.now();
  
  console.log(`[Manus Realtime] Starting research: ${query}`);

  // Initialize research state
  state.state = 'analyzing';
  state.progress = 0;
  state.currentStep = 'Initializing Manus agents...';
  state.subAgents = [];
  state.metrics = {
    totalSteps: 8,
    completedSteps: 0,
    sourcesProcessed: 0,
    factsExtracted: 0,
    verificationsPerformed: 0,
    executionTimeMs: 0,
  };
  state.observations = [];
  state.errors = [];

  // Send initial state
  sendStateUpdate(socket, state);

  // Simulate Manus agent loop: Analyze → Plan → Execute → Observe → Iterate
  const steps = [
    { state: 'analyzing', step: 'Analyzing query intent...', progress: 10, duration: 800 },
    { state: 'planning', step: 'Planning research strategy...', progress: 20, duration: 600 },
    { state: 'executing', step: 'Spawning sub-agents...', progress: 30, duration: 400 },
    { state: 'executing', step: 'Search agent: Querying sources...', progress: 40, duration: 1200 },
    { state: 'executing', step: 'Scrape agent: Extracting content...', progress: 55, duration: 1500 },
    { state: 'observing', step: 'Collecting observations...', progress: 70, duration: 800 },
    { state: 'verifying', step: 'Verifying sources and facts...', progress: 85, duration: 1000 },
    { state: 'synthesizing', step: 'Synthesizing final report...', progress: 95, duration: 600 },
  ];

  // Create sub-agents
  const subAgentTypes: Array<'search' | 'scrape' | 'validate' | 'enrich' | 'classify'> = 
    ['search', 'scrape', 'validate', 'enrich', 'classify'];
  
  state.subAgents = subAgentTypes.map((type, idx) => ({
    id: `agent-${type}-${idx}`,
    type,
    status: 'idle' as const,
    progress: 0,
  }));

  sendStateUpdate(socket, state);

  // Execute steps with realistic timing
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    state.state = step.state as ManusState['state'];
    state.currentStep = step.step;
    state.progress = step.progress;
    state.metrics.completedSteps = i + 1;
    state.metrics.executionTimeMs = Date.now() - startTime;

    // Update relevant sub-agent
    if (i >= 2 && i <= 5) {
      const agentIdx = i - 2;
      if (state.subAgents[agentIdx]) {
        state.subAgents[agentIdx].status = 'running';
        state.subAgents[agentIdx].progress = 50;
      }
      if (agentIdx > 0 && state.subAgents[agentIdx - 1]) {
        state.subAgents[agentIdx - 1].status = 'completed';
        state.subAgents[agentIdx - 1].progress = 100;
      }
    }

    // Add observations during observe phase
    if (step.state === 'observing') {
      state.observations.push({
        id: `obs-${Date.now()}`,
        type: 'search_result',
        data: { sources: 5, relevantPages: 12 },
        timestamp: new Date().toISOString(),
        source: 'search_agent',
        confidence: 0.85,
      });
      state.metrics.sourcesProcessed = 5;
      state.metrics.factsExtracted = 12;
    }

    if (step.state === 'verifying') {
      state.metrics.verificationsPerformed = 8;
    }

    sendStateUpdate(socket, state);
    
    await delay(step.duration);
  }

  // Complete all sub-agents
  state.subAgents.forEach(agent => {
    agent.status = 'completed';
    agent.progress = 100;
  });

  // Final state
  state.state = 'completed';
  state.progress = 100;
  state.currentStep = 'Research complete!';
  state.metrics.executionTimeMs = Date.now() - startTime;

  sendStateUpdate(socket, state);

  // Send completion event
  socket.send(JSON.stringify({
    type: 'research_complete',
    query,
    metrics: state.metrics,
    timestamp: new Date().toISOString(),
  }));
}

function sendStateUpdate(socket: WebSocket, state: ManusState) {
  socket.send(JSON.stringify({
    type: 'state_update',
    state: { ...state },
    timestamp: new Date().toISOString(),
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}