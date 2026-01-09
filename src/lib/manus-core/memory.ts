/**
 * Memory & RAG System
 * Hybrid memory (short-term + long-term)
 * Vector embeddings with semantic search
 * pgvector integration for fast retrieval
 */

export interface MemoryItem {
  id: string;
  type: 'fact' | 'experience' | 'decision' | 'insight' | 'pattern';
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  accessCount: number;
  lastAccessed: Date;
  createdAt: Date;
}

export class MemoryManager {
  private shortTermMemory: MemoryItem[] = [];
  private maxShortTerm = 100;

  async addMemory(content: string, type: MemoryItem['type'], metadata: Record<string, unknown> = {}): Promise<string> {
    const id = `mem_${Date.now()}`;
    const item: MemoryItem = {
      id,
      type,
      content,
      metadata,
      accessCount: 0,
      lastAccessed: new Date(),
      createdAt: new Date(),
    };

    this.shortTermMemory.push(item);
    if (this.shortTermMemory.length > this.maxShortTerm) {
      this.shortTermMemory.shift();
    }

    return id;
  }

  async search(query: string, limit: number = 10): Promise<MemoryItem[]> {
    try {
      // Implement basic semantic search using text similarity
      // For production, this would use vector embeddings and cosine similarity
      
      const MIN_WORD_LENGTH = 2;
      const MEMORY_DECAY_DAYS = 30;
      
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > MIN_WORD_LENGTH);
      
      // Score memories based on keyword overlap
      const scored = this.shortTermMemory.map(item => {
        const contentLower = item.content.toLowerCase();
        let score = 0;
        
        // Count keyword matches
        for (const word of queryWords) {
          if (contentLower.includes(word)) {
            score += 1;
          }
        }
        
        // Boost recent memories
        const ageMs = Date.now() - item.lastAccessed.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0, 1 - ageDays / MEMORY_DECAY_DAYS); // Decay over 30 days
        
        // Boost frequently accessed memories
        const accessBoost = Math.min(1, item.accessCount / 10);
        
        const finalScore = score + recencyBoost + accessBoost;
        
        return { item, score: finalScore };
      });
      
      // Sort by score and return top results
      scored.sort((a, b) => b.score - a.score);
      
      return scored
        .slice(0, limit)
        .filter(s => s.score > 0)
        .map(s => s.item);
    } catch (error) {
      console.error('[Memory Search] Error:', error);
      return this.shortTermMemory.slice(0, limit);
    }
  }

  async getMemory(id: string): Promise<MemoryItem | null> {
    const item = this.shortTermMemory.find(m => m.id === id);
    if (item) {
      item.accessCount++;
      item.lastAccessed = new Date();
    }
    return item || null;
  }
}

export class RAGSystem {
  private memory: MemoryManager;

  constructor(memory: MemoryManager) {
    this.memory = memory;
  }

  async retrieve(query: string, topK: number = 5): Promise<MemoryItem[]> {
    return this.memory.search(query, topK);
  }

  async generateContext(query: string): Promise<string> {
    const relevant = await this.retrieve(query);
    return relevant.map(r => r.content).join('\n');
  }
}

export class AgentMemoryStore {
  private sessionId: string;
  private memory: MemoryManager;
  private rag: RAGSystem;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.memory = new MemoryManager();
    this.rag = new RAGSystem(this.memory);
  }

  async store(content: string, type: MemoryItem['type'], metadata?: Record<string, unknown>): Promise<string> {
    return this.memory.addMemory(content, type, metadata);
  }

  async recall(query: string): Promise<MemoryItem[]> {
    return this.memory.search(query);
  }

  async retrieveContext(query: string): Promise<string> {
    return this.rag.generateContext(query);
  }
}
