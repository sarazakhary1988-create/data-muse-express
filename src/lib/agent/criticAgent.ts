// Critic Agent - Verifies claims with per-claim confidence scoring
// Enhanced with Manus-inspired authority-based verification

import { ClaimVerification, VerificationSource, FieldConfidence } from './types';
import { sourceAuthorityManager } from './sourceAuthority';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedClaim {
  text: string;
  field?: string;
  value?: any;
  sources: string[];
}

export class CriticAgent {
  private verificationCache: Map<string, ClaimVerification> = new Map();

  async verifyClaims(
    claims: ExtractedClaim[], 
    availableSources: { url: string; content: string; domain: string }[]
  ): Promise<ClaimVerification[]> {
    // Limit claims to verify for speed (max 8 key claims)
    const claimsToVerify = claims.slice(0, 8);
    
    // Check cache first, collect uncached claims
    const cached: ClaimVerification[] = [];
    const uncached: ExtractedClaim[] = [];
    
    for (const claim of claimsToVerify) {
      const cacheKey = this.generateCacheKey(claim);
      if (this.verificationCache.has(cacheKey)) {
        cached.push(this.verificationCache.get(cacheKey)!);
      } else {
        uncached.push(claim);
      }
    }

    // PARALLEL verification of uncached claims
    const verificationPromises = uncached.map(claim => 
      this.verifySingleClaim(claim, availableSources).then(verification => {
        this.verificationCache.set(this.generateCacheKey(claim), verification);
        return verification;
      })
    );

    const newVerifications = await Promise.all(verificationPromises);
    
    return [...cached, ...newVerifications];
  }

  private async verifySingleClaim(
    claim: ExtractedClaim,
    sources: { url: string; content: string; domain: string }[]
  ): Promise<ClaimVerification> {
    const verificationSources: VerificationSource[] = [];
    let totalSupport = 0;
    let totalWeight = 0;

    // Sort sources by authority (Manus-inspired - higher authority sources first)
    const rankedSources = sourceAuthorityManager.rankSources(
      sources.map(s => ({ ...s, url: s.url }))
    );

    // Limit sources to check per claim (top 4 by authority for speed)
    const sourcesToCheck = rankedSources.slice(0, 4);

    // PARALLEL source checking within a claim
    const supportResults = await Promise.all(
      sourcesToCheck.map(source => 
        this.checkSourceSupport(claim.text, source.content, source.url)
          .then(support => ({ source, support }))
          .catch(() => ({ source, support: { level: 'none', excerpt: '' } }))
      )
    );

    for (const { source, support } of supportResults) {
      if (support.level !== 'none') {
        // Get source authority for weighted scoring (Manus-inspired)
        const authority = sourceAuthorityManager.getAuthority(source.url);
        
        verificationSources.push({
          url: source.url,
          domain: source.domain,
          supportLevel: support.level as VerificationSource['supportLevel'],
          excerpt: support.excerpt,
        });

        const weights = { strong: 1, moderate: 0.6, weak: 0.3, contradicts: -0.5 };
        const supportWeight = weights[support.level as keyof typeof weights] || 0;
        
        // Weight by source authority (Manus-inspired cross-reference validation)
        totalSupport += supportWeight * authority.authority;
        totalWeight += authority.authority;
      }
    }

    // Calculate authority-weighted confidence
    const confidence = totalWeight > 0 
      ? Math.max(0, Math.min(1, (totalSupport / totalWeight + 1) / 2))
      : 0;

    // Determine status
    let status: ClaimVerification['status'] = 'unverified';
    if (confidence >= 0.8 && verificationSources.some(s => s.supportLevel === 'strong')) {
      status = 'verified';
    } else if (confidence >= 0.5) {
      status = 'partially_verified';
    } else if (verificationSources.some(s => s.supportLevel === 'contradicts')) {
      status = 'contradicted';
    }

    return {
      id: crypto.randomUUID(),
      claim: claim.text,
      sources: verificationSources,
      confidence,
      status,
      explanation: this.generateExplanation(status, confidence, verificationSources),
    };
  }

  private async checkSourceSupport(
    claim: string, 
    content: string, 
    url: string
  ): Promise<{ level: string; excerpt: string }> {
    // Quick heuristic check first - FAST path, no API call needed for clear cases
    const claimWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const contentLower = content.toLowerCase();
    
    const matchCount = claimWords.filter(word => contentLower.includes(word)).length;
    const matchRatio = claimWords.length > 0 ? matchCount / claimWords.length : 0;

    // Early exit for no match - skip API call
    if (matchRatio < 0.3) {
      return { level: 'none', excerpt: '' };
    }

    // Find relevant excerpt
    const excerpt = this.findRelevantExcerpt(claim, content);

    // For high confidence matches, use heuristic directly (skip API)
    if (matchRatio > 0.85) return { level: 'strong', excerpt };
    if (matchRatio > 0.7) return { level: 'moderate', excerpt };

    // Only use AI for ambiguous cases (0.3 - 0.7 match ratio)
    try {
      const { data } = await supabase.functions.invoke('research-analyze', {
        body: {
          query: claim.substring(0, 200), // Limit claim size
          content: excerpt.substring(0, 500), // Limit content size
          type: 'verify',
        }
      });

      if (data?.result) {
        const jsonMatch = data.result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return { 
            level: parsed.support || (matchRatio > 0.5 ? 'moderate' : 'weak'), 
            excerpt 
          };
        }
      }
    } catch {
      // Use heuristic on error
    }

    // Heuristic fallback
    if (matchRatio > 0.6) return { level: 'moderate', excerpt };
    if (matchRatio > 0.4) return { level: 'weak', excerpt };
    return { level: 'none', excerpt: '' };
  }

  private findRelevantExcerpt(claim: string, content: string): string {
    const claimWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const sentences = content.split(/[.!?]+/);
    
    let bestSentence = '';
    let bestScore = 0;

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const score = claimWords.filter(w => sentenceLower.includes(w)).length;
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    }

    // Return best sentence plus context
    const sentenceIndex = sentences.indexOf(bestSentence);
    const start = Math.max(0, sentenceIndex - 1);
    const end = Math.min(sentences.length, sentenceIndex + 2);
    
    return sentences.slice(start, end).join('. ').trim().slice(0, 500);
  }

  private generateExplanation(
    status: ClaimVerification['status'],
    confidence: number,
    sources: VerificationSource[]
  ): string {
    const strongSources = sources.filter(s => s.supportLevel === 'strong').length;
    const moderateSources = sources.filter(s => s.supportLevel === 'moderate').length;
    const contradictions = sources.filter(s => s.supportLevel === 'contradicts').length;

    switch (status) {
      case 'verified':
        return `Verified with ${(confidence * 100).toFixed(0)}% confidence. ${strongSources} strong source(s) confirm this claim.`;
      case 'partially_verified':
        return `Partially verified (${(confidence * 100).toFixed(0)}% confidence). ${moderateSources} source(s) provide moderate support.`;
      case 'contradicted':
        return `Contradicted by ${contradictions} source(s). This claim may be inaccurate.`;
      case 'unverified':
      default:
        return `Unable to verify. No reliable sources found to support or contradict this claim.`;
    }
  }

  async generateFieldConfidences(
    fields: Record<string, any>,
    sources: { url: string; content: string; domain: string }[]
  ): Promise<FieldConfidence[]> {
    const confidences: FieldConfidence[] = [];

    for (const [field, value] of Object.entries(fields)) {
      if (value === null || value === undefined) continue;

      const claim = `${field}: ${typeof value === 'object' ? JSON.stringify(value) : value}`;
      const verification = await this.verifySingleClaim(
        { text: claim, field, value, sources: [] },
        sources
      );

      confidences.push({
        field,
        value,
        confidence: verification.confidence,
        sources: verification.sources.map(s => s.url),
        verificationStatus: verification.status,
      });
    }

    return confidences;
  }

  private generateCacheKey(claim: ExtractedClaim): string {
    return `${claim.text.slice(0, 100)}-${claim.sources.join(',')}`.toLowerCase();
  }

  clearCache(): void {
    this.verificationCache.clear();
  }

  getCacheStats(): { size: number; hits: number } {
    return {
      size: this.verificationCache.size,
      hits: 0, // Would track in production
    };
  }
}

export const criticAgent = new CriticAgent();
