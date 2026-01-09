/**
 * RAG System Index
 * Centralized exports for Retrieval-Augmented Generation
 */

export { VectorStore, getVectorStore, type Document, type SearchResult } from './vectorStore';
export { RAGChatbot, type ChatMessage, type ChatResponse } from './aiChat';

// Re-export for convenience
export default {
  VectorStore,
  getVectorStore,
  RAGChatbot,
};
