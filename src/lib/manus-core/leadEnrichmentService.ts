/**
 * Lead Enrichment Service
 * Integrates all enrichment sources and export capabilities
 */

import { enrichWithAllSources, type AggregatedProfile } from '../manus-core/advancedEnrichment';
import { exportProfile, type ExportFormat, type EnrichedProfile } from '../exports';
import { RAGChatbot } from '../rag/aiChat';
import { VectorStore } from '../rag/vectorStore';

export interface EnrichmentRequest {
  firstName: string;
  lastName: string;
  company?: string;
  linkedin?: string;
  title?: string;
  location?: string;
}

export interface EnrichmentResponse {
  profile: EnrichedProfile;
  chatbot: RAGChatbot;
  export: (format: ExportFormat) => Promise<Blob>;
  download: (format: ExportFormat, filename?: string) => Promise<void>;
}

/**
 * Enrich a person profile with all available data sources
 */
export async function enrichPerson(request: EnrichmentRequest): Promise<EnrichmentResponse> {
  console.log('[LeadEnrichment] Starting enrichment for:', request.firstName, request.lastName);

  // Step 1: Fetch data from all sources
  const aggregated = await enrichWithAllSources({
    firstName: request.firstName,
    lastName: request.lastName,
    company: request.company,
    linkedin: request.linkedin,
    title: request.title,
  });

  // Step 2: Transform to EnrichedProfile format
  const profile: EnrichedProfile = {
    fullName: aggregated.person?.fullName || `${request.firstName} ${request.lastName}`,
    title: aggregated.person?.title || request.title || 'Unknown',
    company: aggregated.person?.company || request.company || 'Unknown',
    location: aggregated.person?.location || request.location,
    email: aggregated.person?.email,
    phone: aggregated.person?.phone,
    linkedin: aggregated.person?.linkedin,
    twitter: aggregated.person?.twitter,
    experience: aggregated.person?.experience || [],
    education: aggregated.person?.education || [],
    skills: aggregated.person?.skills || [],
    technologies: aggregated.person?.technologies,
    metadata: {
      confidence: aggregated.confidence,
      freshness: new Date().toISOString(),
      sources: aggregated.sources,
    },
  };

  // Step 3: Create RAG chatbot with profile knowledge
  const chatbot = await RAGChatbot.createForProfile(profile);

  // Step 4: Create export functions
  const exportFn = async (format: ExportFormat): Promise<Blob> => {
    return await exportProfile(profile, format);
  };

  const downloadFn = async (format: ExportFormat, filename?: string): Promise<void> => {
    const blob = await exportProfile(profile, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${profile.fullName.replace(/\s+/g, '_')}_profile.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  console.log('[LeadEnrichment] Enrichment complete. Confidence:', aggregated.confidence);

  return {
    profile,
    chatbot,
    export: exportFn,
    download: downloadFn,
  };
}

/**
 * Enrich a company profile
 */
export async function enrichCompany(params: { name: string; domain?: string }): Promise<EnrichmentResponse> {
  console.log('[LeadEnrichment] Starting company enrichment for:', params.name);

  // For now, create a basic profile structure
  // In production, this would fetch from various company data sources
  const profile: EnrichedProfile = {
    fullName: params.name,
    title: 'Company Profile',
    company: params.name,
    location: 'Unknown',
    experience: [],
    education: [],
    skills: [],
    metadata: {
      confidence: 0.5,
      freshness: new Date().toISOString(),
      sources: ['Company Enrichment'],
    },
  };

  // Create chatbot
  const vectorStore = new VectorStore();
  await vectorStore.initialize();
  
  await vectorStore.addDocument('company-info', `Company: ${params.name}. Domain: ${params.domain || 'Unknown'}.`, {
    type: 'company',
  });

  const chatbot = new RAGChatbot(vectorStore, `You are an AI assistant with information about ${params.name}.`);

  // Export functions
  const exportFn = async (format: ExportFormat): Promise<Blob> => {
    return await exportProfile(profile, format);
  };

  const downloadFn = async (format: ExportFormat, filename?: string): Promise<void> => {
    const blob = await exportProfile(profile, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${params.name.replace(/\s+/g, '_')}_company.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    profile,
    chatbot,
    export: exportFn,
    download: downloadFn,
  };
}

/**
 * Batch enrich multiple leads
 */
export async function enrichBatch(
  requests: EnrichmentRequest[]
): Promise<EnrichmentResponse[]> {
  console.log(`[LeadEnrichment] Batch enrichment started for ${requests.length} leads`);
  
  const results: EnrichmentResponse[] = [];
  
  for (const request of requests) {
    try {
      const result = await enrichPerson(request);
      results.push(result);
    } catch (error) {
      console.error('[LeadEnrichment] Batch item failed:', error);
      // Continue with next item
    }
  }
  
  console.log(`[LeadEnrichment] Batch complete. ${results.length}/${requests.length} successful`);
  return results;
}

export default {
  enrichPerson,
  enrichCompany,
  enrichBatch,
};
