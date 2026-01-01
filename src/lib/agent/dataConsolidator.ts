// Data Consolidator - Manus-inspired consolidation engine
// Merges validated data with confidence scores and quality metrics

import { sourceAuthorityManager } from './sourceAuthority';
import { crossReferenceValidator, ValidationResult, FieldValidation } from './crossReferenceValidator';
import { AgentResearchResult } from './researchAgent';

export interface ConsolidatedResult {
  data: Record<string, any>;
  fieldConfidences: Map<string, FieldConfidenceScore>;
  qualityMetrics: QualityMetrics;
  sourceCoverage: SourceCoverage;
  warnings: string[];
  discrepancies: Discrepancy[];
}

export interface FieldConfidenceScore {
  value: any;
  confidence: number;
  verificationMethod: string;
  sources: string[];
  verified: boolean;
}

export interface QualityMetrics {
  overallScore: number;
  completeness: number;
  consistency: number;
  sourceAuthority: number;
  crossValidation: number;
}

export interface SourceCoverage {
  totalSources: number;
  uniqueDomains: number;
  categoryBreakdown: Record<string, number>;
  authorityDistribution: {
    high: number;   // > 0.8
    medium: number; // 0.5 - 0.8
    low: number;    // < 0.5
  };
}

export interface Discrepancy {
  field: string;
  values: Array<{ source: string; value: any; authority: number }>;
  resolution: {
    selectedValue: any;
    selectedSource: string;
    reason: string;
  };
}

export class DataConsolidator {
  /**
   * Consolidate research results from multiple sources
   */
  consolidate(results: AgentResearchResult[]): ConsolidatedResult {
    const warnings: string[] = [];
    const discrepancies: Discrepancy[] = [];

    // Extract and organize data by source
    const dataBySource = this.organizeBySource(results);
    
    // Validate and consolidate using cross-reference validator
    const validationResult = crossReferenceValidator.validate(dataBySource);

    // Build field confidences
    const fieldConfidences = new Map<string, FieldConfidenceScore>();
    for (const [fieldName, validation] of validationResult.fieldValidations) {
      fieldConfidences.set(fieldName, {
        value: validation.value,
        confidence: validation.confidence,
        verificationMethod: validation.method,
        sources: validation.sourcesMatched,
        verified: validation.verified,
      });

      // Track discrepancies
      if (validation.discrepancyDetails && validation.discrepancyDetails.length > 1) {
        discrepancies.push({
          field: fieldName,
          values: validation.discrepancyDetails,
          resolution: {
            selectedValue: validation.value,
            selectedSource: validation.sourcesMatched[0] || 'unknown',
            reason: `Selected based on ${validation.method}`,
          },
        });
      }
    }

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(results, validationResult);

    // Calculate source coverage
    const sourceCoverage = this.calculateSourceCoverage(results);

    return {
      data: validationResult.consolidatedData,
      fieldConfidences,
      qualityMetrics,
      sourceCoverage,
      warnings: [...validationResult.warnings, ...warnings],
      discrepancies,
    };
  }

  /**
   * Consolidate extracted entities (companies, dates, facts)
   */
  consolidateEntities<T extends { name?: string; source_url?: string }>(
    entities: T[]
  ): Array<T & { confidence: number; sourceCount: number }> {
    // Group by name/key
    const grouped = new Map<string, T[]>();
    
    for (const entity of entities) {
      const key = this.generateEntityKey(entity);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(entity);
    }

    // Consolidate each group
    const consolidated: Array<T & { confidence: number; sourceCount: number }> = [];

    for (const [, group] of grouped) {
      if (group.length === 0) continue;

      // Calculate weighted confidence based on source authorities
      const sourceConfidences = group.map(e => {
        const url = (e as any).source_url || '';
        const authority = sourceAuthorityManager.getAuthority(url);
        return { url, confidence: authority.authority };
      });

      const weightedConfidence = sourceAuthorityManager.calculateWeightedConfidence(sourceConfidences);

      // Merge entity data, preferring values from higher authority sources
      const merged = this.mergeEntities(group);

      consolidated.push({
        ...merged,
        confidence: weightedConfidence,
        sourceCount: group.length,
      });
    }

    // Sort by confidence
    return consolidated.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Deduplicate results by URL and content similarity
   */
  deduplicateResults(results: AgentResearchResult[]): AgentResearchResult[] {
    const seen = new Map<string, AgentResearchResult>();
    const contentHashes = new Map<string, AgentResearchResult>();

    for (const result of results) {
      // Exact URL match
      if (seen.has(result.url)) {
        const existing = seen.get(result.url)!;
        // Keep the one with higher relevance
        if (result.relevanceScore > existing.relevanceScore) {
          seen.set(result.url, result);
        }
        continue;
      }

      // Content similarity check (simple hash)
      const contentKey = this.generateContentHash(result.content);
      if (contentHashes.has(contentKey)) {
        const existing = contentHashes.get(contentKey)!;
        if (result.relevanceScore > existing.relevanceScore) {
          // Replace with higher scoring result
          seen.delete(existing.url);
          seen.set(result.url, result);
          contentHashes.set(contentKey, result);
        }
        continue;
      }

      seen.set(result.url, result);
      contentHashes.set(contentKey, result);
    }

    return Array.from(seen.values());
  }

  private organizeBySource(results: AgentResearchResult[]): Map<string, Record<string, any>> {
    const dataBySource = new Map<string, Record<string, any>>();

    for (const result of results) {
      const domain = result.metadata.domain || this.extractDomain(result.url);
      
      if (!dataBySource.has(domain)) {
        dataBySource.set(domain, {});
      }

      const data = dataBySource.get(domain)!;
      
      // Extract structured data from field confidences
      if (result.fieldConfidences) {
        for (const field of result.fieldConfidences) {
          if (field.value !== null && field.value !== undefined) {
            data[field.field] = field.value;
          }
        }
      }

      // Add metadata
      data._title = result.title;
      data._url = result.url;
      data._relevanceScore = result.relevanceScore;
    }

    return dataBySource;
  }

  private calculateQualityMetrics(
    results: AgentResearchResult[],
    validation: ValidationResult
  ): QualityMetrics {
    // Completeness: ratio of fields with data
    const totalFields = validation.fieldValidations.size;
    const fieldsWithData = Array.from(validation.fieldValidations.values())
      .filter(v => v.value !== null).length;
    const completeness = totalFields > 0 ? fieldsWithData / totalFields : 0;

    // Consistency: ratio of verified fields
    const verifiedFields = Array.from(validation.fieldValidations.values())
      .filter(v => v.verified).length;
    const consistency = totalFields > 0 ? verifiedFields / totalFields : 0;

    // Source authority: average authority of sources
    const authorities = results.map(r => 
      sourceAuthorityManager.getAuthority(r.url).authority
    );
    const sourceAuthority = authorities.length > 0
      ? authorities.reduce((a, b) => a + b, 0) / authorities.length
      : 0;

    // Cross validation: average confidence
    const crossValidation = validation.overallConfidence / 100;

    // Overall score (weighted average)
    const overallScore = (
      completeness * 0.2 +
      consistency * 0.3 +
      sourceAuthority * 0.25 +
      crossValidation * 0.25
    );

    return {
      overallScore,
      completeness,
      consistency,
      sourceAuthority,
      crossValidation,
    };
  }

  private calculateSourceCoverage(results: AgentResearchResult[]): SourceCoverage {
    const domains = new Set<string>();
    const categories: Record<string, number> = {};
    let high = 0, medium = 0, low = 0;

    for (const result of results) {
      const domain = result.metadata.domain || this.extractDomain(result.url);
      domains.add(domain);

      const authority = sourceAuthorityManager.getAuthority(result.url);
      
      categories[authority.category] = (categories[authority.category] || 0) + 1;

      if (authority.authority > 0.8) high++;
      else if (authority.authority >= 0.5) medium++;
      else low++;
    }

    return {
      totalSources: results.length,
      uniqueDomains: domains.size,
      categoryBreakdown: categories,
      authorityDistribution: { high, medium, low },
    };
  }

  private generateEntityKey(entity: any): string {
    // Generate a key for grouping similar entities
    const name = (entity.name || entity.title || '').toLowerCase().trim();
    const type = entity.type || 'unknown';
    return `${type}:${name.substring(0, 50)}`;
  }

  private mergeEntities<T>(entities: T[]): T {
    if (entities.length === 1) return entities[0];

    // Rank by source authority and merge
    const ranked = entities.sort((a, b) => {
      const urlA = (a as any).source_url || '';
      const urlB = (b as any).source_url || '';
      return sourceAuthorityManager.getAuthority(urlB).authority - 
             sourceAuthorityManager.getAuthority(urlA).authority;
    });

    // Start with highest authority source
    const merged = { ...ranked[0] };

    // Fill in missing fields from other sources
    for (const entity of ranked.slice(1)) {
      for (const [key, value] of Object.entries(entity as object)) {
        if ((merged as any)[key] === undefined || (merged as any)[key] === null || (merged as any)[key] === '') {
          (merged as any)[key] = value;
        }
      }
    }

    return merged;
  }

  private generateContentHash(content: string): string {
    // Simple hash based on first 200 chars normalized
    const normalized = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
    
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }
}

export const dataConsolidator = new DataConsolidator();
