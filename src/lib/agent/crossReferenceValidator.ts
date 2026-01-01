// Cross-Reference Validator - Manus-inspired validation engine
// Validates data across multiple sources with fuzzy matching and authority-based resolution

import { sourceAuthorityManager, SourceAuthority } from './sourceAuthority';

export interface FieldValidation {
  fieldName: string;
  verified: boolean;
  value: any;
  confidence: number; // 0-100
  method: 'exact_match' | 'fuzzy_match' | 'authority_based' | 'no_data';
  sourcesCount: number;
  sourcesMatched: string[];
  warning?: string;
  discrepancyDetails?: DiscrepancyDetail[];
}

export interface DiscrepancyDetail {
  source: string;
  value: any;
  authority: number;
}

export interface ValidationResult {
  success: boolean;
  fieldValidations: Map<string, FieldValidation>;
  overallConfidence: number;
  issues: string[];
  warnings: string[];
  consolidatedData: Record<string, any>;
}

export interface FuzzyMatchConfig {
  threshold: number; // 0-1, default 0.85
  normalizeCase: boolean;
  normalizeWhitespace: boolean;
  removeSpecialChars: boolean;
}

const DEFAULT_FUZZY_CONFIG: FuzzyMatchConfig = {
  threshold: 0.85,
  normalizeCase: true,
  normalizeWhitespace: true,
  removeSpecialChars: true,
};

// Numeric tolerance by field type
const NUMERIC_TOLERANCES: Record<string, number> = {
  price: 2.0,        // 2% variance acceptable
  market_cap: 5.0,   // 5%
  shares: 2.0,       // 2%
  volume: 10.0,      // 10%
  percentage: 0.5,   // 0.5%
  revenue: 5.0,      // 5%
  profit: 5.0,       // 5%
  default: 5.0,      // Default 5%
};

export class CrossReferenceValidator {
  private fuzzyConfig: FuzzyMatchConfig;

  constructor(config: Partial<FuzzyMatchConfig> = {}) {
    this.fuzzyConfig = { ...DEFAULT_FUZZY_CONFIG, ...config };
  }

  /**
   * Validate and consolidate data from multiple sources
   */
  validate(
    dataBySource: Map<string, Record<string, any>>
  ): ValidationResult {
    const fieldValidations = new Map<string, FieldValidation>();
    const issues: string[] = [];
    const warnings: string[] = [];
    const consolidatedData: Record<string, any> = {};

    // Collect all field names across sources
    const allFields = new Set<string>();
    for (const data of dataBySource.values()) {
      Object.keys(data).forEach(f => allFields.add(f));
    }

    // Validate each field across sources
    for (const fieldName of allFields) {
      const valuesBySource = new Map<string, any>();
      
      for (const [source, data] of dataBySource.entries()) {
        const value = data[fieldName];
        if (value !== null && value !== undefined && value !== '') {
          valuesBySource.set(source, value);
        }
      }

      const validation = this.validateField(fieldName, valuesBySource);
      fieldValidations.set(fieldName, validation);

      if (validation.verified || validation.value !== null) {
        consolidatedData[fieldName] = validation.value;
      }

      if (validation.warning) {
        warnings.push(validation.warning);
      }

      if (!validation.verified && validation.sourcesCount > 1) {
        issues.push(`Field '${fieldName}' has conflicting values across ${validation.sourcesCount} sources`);
      }
    }

    // Calculate overall confidence
    const validations = Array.from(fieldValidations.values());
    const overallConfidence = validations.length > 0
      ? validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length
      : 0;

    return {
      success: issues.length === 0,
      fieldValidations,
      overallConfidence,
      issues,
      warnings,
      consolidatedData,
    };
  }

  /**
   * Validate a single field across multiple sources
   */
  validateField(fieldName: string, valuesBySource: Map<string, any>): FieldValidation {
    // No data case
    if (valuesBySource.size === 0) {
      return {
        fieldName,
        verified: false,
        value: null,
        confidence: 0,
        method: 'no_data',
        sourcesCount: 0,
        sourcesMatched: [],
        warning: `No data available for '${fieldName}'`,
      };
    }

    // Single source case
    if (valuesBySource.size === 1) {
      const [source, value] = Array.from(valuesBySource.entries())[0];
      const authority = sourceAuthorityManager.getAuthority(source);
      
      return {
        fieldName,
        verified: authority.authority > 0.7,
        value,
        confidence: authority.authority * 80, // Max 80% for single source
        method: 'authority_based',
        sourcesCount: 1,
        sourcesMatched: [source],
      };
    }

    // Multiple sources - check for exact match
    const values = Array.from(valuesBySource.values());
    const uniqueValues = new Set(values.map(v => JSON.stringify(v)));

    if (uniqueValues.size === 1) {
      return {
        fieldName,
        verified: true,
        value: values[0],
        confidence: 100,
        method: 'exact_match',
        sourcesCount: valuesBySource.size,
        sourcesMatched: Array.from(valuesBySource.keys()),
      };
    }

    // Handle by value type
    const firstValue = values[0];
    if (typeof firstValue === 'string' && values.every(v => typeof v === 'string')) {
      return this.validateTextField(fieldName, valuesBySource as Map<string, string>);
    }

    if (typeof firstValue === 'number' && values.every(v => typeof v === 'number')) {
      return this.validateNumericField(fieldName, valuesBySource as Map<string, number>);
    }

    // Mixed types or objects - use authority-based selection
    return this.selectByAuthority(fieldName, valuesBySource);
  }

  /**
   * Validate text field with fuzzy matching
   */
  private validateTextField(
    fieldName: string, 
    valuesBySource: Map<string, string>
  ): FieldValidation {
    const values = Array.from(valuesBySource.entries());
    const groups = this.groupBySimilarity(values.map(([, v]) => v));

    // All values are similar enough
    if (groups.length === 1) {
      const sources = values.filter(([, v]) => 
        groups[0].includes(v)
      ).map(([s]) => s);

      return {
        fieldName,
        verified: true,
        value: groups[0][0], // Use first variant
        confidence: 95,
        method: 'fuzzy_match',
        sourcesCount: valuesBySource.size,
        sourcesMatched: sources,
      };
    }

    // Multiple different values - select by authority
    return this.selectByAuthority(fieldName, valuesBySource);
  }

  /**
   * Validate numeric field with tolerance
   */
  private validateNumericField(
    fieldName: string,
    valuesBySource: Map<string, number>
  ): FieldValidation {
    const values = Array.from(valuesBySource.values());
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    const variancePercent = avg !== 0 ? ((max - min) / avg) * 100 : 0;
    const tolerance = NUMERIC_TOLERANCES[fieldName] ?? NUMERIC_TOLERANCES.default;

    const withinTolerance = variancePercent <= tolerance;

    // Select value by authority
    const resolved = sourceAuthorityManager.resolveConflict(valuesBySource);

    const discrepancies: DiscrepancyDetail[] = [];
    for (const [source, value] of valuesBySource.entries()) {
      discrepancies.push({
        source,
        value,
        authority: sourceAuthorityManager.getAuthority(source).authority,
      });
    }

    return {
      fieldName,
      verified: withinTolerance,
      value: resolved?.value ?? avg,
      confidence: withinTolerance ? 90 : 70,
      method: withinTolerance ? 'fuzzy_match' : 'authority_based',
      sourcesCount: valuesBySource.size,
      sourcesMatched: resolved ? [resolved.source] : [],
      warning: !withinTolerance 
        ? `Variance ${variancePercent.toFixed(2)}% for '${fieldName}' exceeds ${tolerance}% tolerance`
        : undefined,
      discrepancyDetails: discrepancies,
    };
  }

  /**
   * Select best value based on source authority
   */
  private selectByAuthority(
    fieldName: string,
    valuesBySource: Map<string, any>
  ): FieldValidation {
    const resolved = sourceAuthorityManager.resolveConflict(valuesBySource);

    if (!resolved) {
      return {
        fieldName,
        verified: false,
        value: null,
        confidence: 0,
        method: 'no_data',
        sourcesCount: 0,
        sourcesMatched: [],
      };
    }

    const discrepancies: DiscrepancyDetail[] = [];
    for (const [source, value] of valuesBySource.entries()) {
      discrepancies.push({
        source,
        value,
        authority: sourceAuthorityManager.getAuthority(source).authority,
      });
    }

    return {
      fieldName,
      verified: false,
      value: resolved.value,
      confidence: resolved.authority * 75, // Scale down for conflict
      method: 'authority_based',
      sourcesCount: valuesBySource.size,
      sourcesMatched: [resolved.source],
      warning: `Multiple different values found for '${fieldName}', selected from ${resolved.source}`,
      discrepancyDetails: discrepancies,
    };
  }

  /**
   * Group similar strings together using fuzzy matching
   */
  private groupBySimilarity(items: string[]): string[][] {
    const groups: string[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < items.length; i++) {
      if (used.has(i)) continue;

      const group = [items[i]];
      used.add(i);

      for (let j = i + 1; j < items.length; j++) {
        if (used.has(j)) continue;

        if (this.fuzzyMatch(items[i], items[j]) >= this.fuzzyConfig.threshold) {
          group.push(items[j]);
          used.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Calculate fuzzy similarity between two strings
   */
  fuzzyMatch(str1: string, str2: string): number {
    const normalized1 = this.normalizeString(str1);
    const normalized2 = this.normalizeString(str2);

    if (normalized1 === normalized2) return 1;
    if (normalized1.length === 0 || normalized2.length === 0) return 0;

    // Use Levenshtein-based similarity
    const maxLen = Math.max(normalized1.length, normalized2.length);
    const distance = this.levenshteinDistance(normalized1, normalized2);
    
    return 1 - (distance / maxLen);
  }

  private normalizeString(text: string): string {
    let result = text;
    
    if (this.fuzzyConfig.normalizeCase) {
      result = result.toLowerCase();
    }
    
    if (this.fuzzyConfig.normalizeWhitespace) {
      result = result.replace(/\s+/g, ' ').trim();
    }
    
    if (this.fuzzyConfig.removeSpecialChars) {
      result = result.replace(/[^\w\s]/g, '');
    }
    
    return result;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    
    return dp[m][n];
  }
}

export const crossReferenceValidator = new CrossReferenceValidator();
