/**
 * AI Chat with RAG (Retrieval-Augmented Generation)
 * Uses vector store for context retrieval and LLM for response generation
 */

import { VectorStore, SearchResult } from './vectorStore';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  sources?: string[];
}

export interface ChatResponse {
  answer: string;
  sources: Array<{
    text: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  conversationId?: string;
}

export class RAGChatbot {
  private vectorStore: VectorStore;
  private conversationHistory: ChatMessage[] = [];
  private maxHistoryLength: number = 10;
  private systemPrompt: string;

  constructor(vectorStore: VectorStore, systemPrompt?: string) {
    this.vectorStore = vectorStore;
    this.systemPrompt = systemPrompt || `You are a helpful AI assistant with access to a knowledge base of enriched lead data.
Your role is to answer questions accurately based on the provided context.
Always cite your sources using [Source N] notation when referencing specific information.
If you don't have enough information to answer a question, say so clearly.`;
  }

  /**
   * Ask a question and get an AI-generated answer with RAG
   */
  async ask(
    question: string,
    options: {
      retrievalK?: number;
      temperature?: number;
      model?: string;
      includeHistory?: boolean;
      maxTokens?: number;
    } = {}
  ): Promise<ChatResponse> {
    const {
      retrievalK = 3,
      temperature = 0.7,
      model = 'orkestra-gemini',
      includeHistory = true,
      maxTokens = 1000,
    } = options;

    try {
      console.log(`[RAGChatbot] Processing question: "${question}"`);

      // Step 1: Retrieve relevant context from vector store
      const relevantDocs = await this.vectorStore.similaritySearch(question, retrievalK);

      if (relevantDocs.length === 0) {
        console.warn('[RAGChatbot] No relevant context found in knowledge base');
      }

      // Step 2: Build context from retrieved documents
      const context = relevantDocs
        .map((result, i) => `[Source ${i + 1}] ${result.document.text}`)
        .join('\n\n');

      // Step 3: Build conversation history
      let conversationContext = '';
      if (includeHistory && this.conversationHistory.length > 0) {
        conversationContext = '\n\nConversation history:\n' +
          this.conversationHistory
            .slice(-5) // Last 5 messages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
      }

      // Step 4: Create prompt with RAG context
      const prompt = `${this.systemPrompt}

Context from knowledge base:
${context}
${conversationContext}

User question: ${question}

Please provide a helpful answer based on the context above. Cite sources when appropriate using [Source N] format.`;

      // Step 5: Call LLM
      const response = await this.callLLM(prompt, model, temperature, maxTokens);

      // Step 6: Track conversation history
      this.addToHistory({ role: 'user', content: question });
      this.addToHistory({ role: 'assistant', content: response });

      // Step 7: Extract sources
      const sources = relevantDocs.map(result => ({
        text: result.document.text,
        score: result.score,
        metadata: result.document.metadata,
      }));

      console.log(`[RAGChatbot] Generated answer with ${sources.length} sources`);

      return {
        answer: response,
        sources,
      };
    } catch (error) {
      console.error('[RAGChatbot] Error:', error);
      throw new Error(`Failed to generate answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call LLM via Supabase edge function
   */
  private async callLLM(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('llm-router', {
        body: {
          model,
          prompt,
          temperature,
          max_tokens: maxTokens,
        },
      });

      if (error) {
        console.error('[RAGChatbot] LLM call failed:', error);
        throw new Error(`LLM error: ${error.message || 'Unknown error'}`);
      }

      // Handle different response formats
      if (typeof data === 'string') {
        return data;
      }
      
      if (data?.response) {
        return data.response;
      }
      
      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      
      if (data?.content) {
        return data.content;
      }

      throw new Error('Invalid LLM response format');
    } catch (error) {
      console.error('[RAGChatbot] LLM call error:', error);
      throw error;
    }
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(message: ChatMessage): void {
    this.conversationHistory.push({
      ...message,
      timestamp: new Date(),
    });

    // Limit history length
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    console.log('[RAGChatbot] Conversation history cleared');
  }

  /**
   * Get chat statistics
   */
  getStats(): {
    historyLength: number;
    maxHistoryLength: number;
    documentsInStore: number;
  } {
    const storeStats = this.vectorStore.getStats();
    
    return {
      historyLength: this.conversationHistory.length,
      maxHistoryLength: this.maxHistoryLength,
      documentsInStore: storeStats.documentCount,
    };
  }

  /**
   * Ask multiple questions in sequence
   */
  async askMultiple(questions: string[]): Promise<ChatResponse[]> {
    const responses: ChatResponse[] = [];

    for (const question of questions) {
      const response = await this.ask(question);
      responses.push(response);
    }

    return responses;
  }

  /**
   * Summarize conversation
   */
  async summarize(): Promise<string> {
    if (this.conversationHistory.length === 0) {
      return 'No conversation to summarize.';
    }

    const conversationText = this.conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const summary = await this.callLLM(
      `Summarize this conversation in 2-3 sentences:\n\n${conversationText}`,
      'orkestra-gemini',
      0.3
    );

    return summary;
  }

  /**
   * Search knowledge base directly
   */
  async searchKnowledgeBase(
    query: string,
    k: number = 5
  ): Promise<SearchResult[]> {
    return await this.vectorStore.similaritySearch(query, k);
  }

  /**
   * Add documents to knowledge base
   */
  async addToKnowledgeBase(
    documents: Array<{ id: string; text: string; metadata?: Record<string, any> }>
  ): Promise<void> {
    await this.vectorStore.addDocuments(documents);
    console.log(`[RAGChatbot] Added ${documents.length} documents to knowledge base`);
  }

  /**
   * Create a focused chatbot for specific data
   */
  static async createForProfile(profileData: any): Promise<RAGChatbot> {
    const vectorStore = new VectorStore();
    await vectorStore.initialize();

    // Add profile data to knowledge base
    const documents: Array<{ id: string; text: string; metadata?: Record<string, any> }> = [];

    // Add basic info
    if (profileData.fullName) {
      documents.push({
        id: 'profile-basic',
        text: `Name: ${profileData.fullName}. Title: ${profileData.title || 'N/A'}. Company: ${profileData.company || 'N/A'}. Location: ${profileData.location || 'N/A'}.`,
        metadata: { type: 'basic-info' },
      });
    }

    // Add experience
    if (profileData.experience && Array.isArray(profileData.experience)) {
      profileData.experience.forEach((exp: any, i: number) => {
        documents.push({
          id: `experience-${i}`,
          text: `Experience ${i + 1}: ${exp.title} at ${exp.company}. Duration: ${exp.duration}. ${exp.description || ''}`,
          metadata: { type: 'experience', company: exp.company },
        });
      });
    }

    // Add education
    if (profileData.education && Array.isArray(profileData.education)) {
      profileData.education.forEach((edu: any, i: number) => {
        documents.push({
          id: `education-${i}`,
          text: `Education ${i + 1}: ${edu.degree} in ${edu.field || 'N/A'} from ${edu.school}. Graduated: ${edu.year}.`,
          metadata: { type: 'education', school: edu.school },
        });
      });
    }

    // Add skills
    if (profileData.skills && Array.isArray(profileData.skills)) {
      documents.push({
        id: 'skills',
        text: `Skills: ${profileData.skills.join(', ')}.`,
        metadata: { type: 'skills' },
      });
    }

    await vectorStore.addDocuments(documents);

    const systemPrompt = `You are an AI assistant helping to answer questions about ${profileData.fullName || 'this professional'}.
You have access to their professional profile including experience, education, and skills.
Always provide accurate information based on the available data.`;

    return new RAGChatbot(vectorStore, systemPrompt);
  }
}

export default RAGChatbot;
