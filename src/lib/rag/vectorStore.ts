/**
 * Vector Store for RAG System
 * Uses @xenova/transformers for browser-based embeddings
 * Implements similarity search with cosine similarity
 */

import { pipeline, Pipeline } from '@xenova/transformers';

export interface Document {
  id: string;
  text: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface SearchResult {
  document: Document;
  score: number;
}

export class VectorStore {
  private documents: Document[] = [];
  private embedder: Pipeline | null = null;
  private initialized: boolean = false;
  private modelName: string = 'Xenova/all-MiniLM-L6-v2';

  /**
   * Initialize the embedding model
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[VectorStore] Already initialized');
      return;
    }

    try {
      console.log('[VectorStore] Initializing embedding model...');
      this.embedder = await pipeline('feature-extraction', this.modelName);
      this.initialized = true;
      console.log('[VectorStore] Embedding model loaded successfully');
    } catch (error) {
      console.error('[VectorStore] Failed to initialize:', error);
      throw new Error('Failed to initialize vector store');
    }
  }

  /**
   * Generate embedding for text
   */
  private async embed(text: string): Promise<number[]> {
    if (!this.embedder) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }

    try {
      const output = await this.embedder(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the embedding array from the output
      const embedding = Array.from(output.data as Float32Array);
      return embedding;
    } catch (error) {
      console.error('[VectorStore] Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Add a document to the vector store
   */
  async addDocument(id: string, text: string, metadata: Record<string, any> = {}): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const embedding = await this.embed(text);
      
      const document: Document = {
        id,
        text,
        embedding,
        metadata,
      };

      // Remove existing document with same ID
      this.documents = this.documents.filter(doc => doc.id !== id);
      
      // Add new document
      this.documents.push(document);
      
      console.log(`[VectorStore] Added document: ${id} (${this.documents.length} total)`);
    } catch (error) {
      console.error(`[VectorStore] Failed to add document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(documents: Array<{ id: string; text: string; metadata?: Record<string, any> }>): Promise<void> {
    console.log(`[VectorStore] Adding ${documents.length} documents...`);
    
    // Process in parallel for better performance
    await Promise.all(
      documents.map(doc => this.addDocument(doc.id, doc.text, doc.metadata || {}))
    );
    
    console.log(`[VectorStore] Batch add complete: ${this.documents.length} total documents`);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Search for similar documents
   */
  async similaritySearch(query: string, k: number = 5): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.documents.length === 0) {
      console.warn('[VectorStore] No documents in store');
      return [];
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.embed(query);

      // Calculate similarities
      const results: SearchResult[] = this.documents
        .filter(doc => doc.embedding) // Only docs with embeddings
        .map(doc => ({
          document: doc,
          score: this.cosineSimilarity(queryEmbedding, doc.embedding!),
        }))
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, k); // Take top k

      console.log(`[VectorStore] Found ${results.length} results for query`);
      return results;
    } catch (error) {
      console.error('[VectorStore] Similarity search failed:', error);
      throw error;
    }
  }

  /**
   * Search with metadata filter
   */
  async similaritySearchWithFilter(
    query: string,
    filter: (metadata: Record<string, any>) => boolean,
    k: number = 5
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const queryEmbedding = await this.embed(query);

      // Filter documents by metadata, then calculate similarities
      const results: SearchResult[] = this.documents
        .filter(doc => doc.embedding && filter(doc.metadata || {}))
        .map(doc => ({
          document: doc,
          score: this.cosineSimilarity(queryEmbedding, doc.embedding!),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);

      console.log(`[VectorStore] Filtered search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('[VectorStore] Filtered search failed:', error);
      throw error;
    }
  }

  /**
   * Get all documents
   */
  getDocuments(): Document[] {
    return [...this.documents];
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): Document | undefined {
    return this.documents.find(doc => doc.id === id);
  }

  /**
   * Remove document by ID
   */
  removeDocument(id: string): boolean {
    const initialLength = this.documents.length;
    this.documents = this.documents.filter(doc => doc.id !== id);
    const removed = this.documents.length < initialLength;
    
    if (removed) {
      console.log(`[VectorStore] Removed document: ${id}`);
    }
    
    return removed;
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents = [];
    console.log('[VectorStore] Cleared all documents');
  }

  /**
   * Get store statistics
   */
  getStats(): {
    documentCount: number;
    initialized: boolean;
    modelName: string;
  } {
    return {
      documentCount: this.documents.length,
      initialized: this.initialized,
      modelName: this.modelName,
    };
  }
}

// Singleton instance for global use
let globalVectorStore: VectorStore | null = null;

/**
 * Get or create global vector store instance
 */
export function getVectorStore(): VectorStore {
  if (!globalVectorStore) {
    globalVectorStore = new VectorStore();
  }
  return globalVectorStore;
}

export default VectorStore;
