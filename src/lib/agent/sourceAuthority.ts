// Source Authority Hierarchy - Manus-inspired authority-based ranking
// Higher scores = more authoritative sources for conflict resolution

export interface SourceAuthority {
  domain: string;
  authority: number; // 0-1, higher = more authoritative
  category: SourceCategory;
  reliability: number; // Historical reliability score
  freshness: number; // How recent data typically is
}

export type SourceCategory = 
  | 'government'
  | 'regulatory'
  | 'official'
  | 'academic'
  | 'news_major'
  | 'news_minor'
  | 'financial'
  | 'social'
  | 'wiki'
  | 'unknown';

// Authority hierarchy (higher = more authoritative for conflict resolution)
export const AUTHORITY_HIERARCHY: Record<SourceCategory, number> = {
  government: 1.0,
  regulatory: 0.95,
  official: 0.90,
  academic: 0.85,
  financial: 0.80,
  news_major: 0.75,
  news_minor: 0.60,
  wiki: 0.55,
  social: 0.40,
  unknown: 0.30,
};

// Domain patterns for categorization
const DOMAIN_PATTERNS: Array<{ pattern: RegExp; category: SourceCategory; authority: number }> = [
  // Government & regulatory
  { pattern: /\.gov($|\.)/i, category: 'government', authority: 1.0 },
  { pattern: /\.gov\.[a-z]{2}$/i, category: 'government', authority: 1.0 },
  { pattern: /sec\.gov|fca\.org|esma\.europa|cma\.org/i, category: 'regulatory', authority: 0.98 },
  { pattern: /europa\.eu|worldbank\.org|imf\.org/i, category: 'government', authority: 0.95 },
  
  // Official company sources
  { pattern: /investor-relations|ir\.|investors\./i, category: 'official', authority: 0.92 },
  
  // Academic & research
  { pattern: /\.edu($|\.)/i, category: 'academic', authority: 0.88 },
  { pattern: /arxiv\.org|nature\.com|science\.org|springer\.com/i, category: 'academic', authority: 0.90 },
  { pattern: /researchgate\.net|sciencedirect\.com|jstor\.org/i, category: 'academic', authority: 0.85 },
  
  // Major financial sources
  { pattern: /bloomberg\.com|reuters\.com|ft\.com|wsj\.com/i, category: 'financial', authority: 0.88 },
  { pattern: /yahoo\.finance|morningstar\.com|marketwatch\.com/i, category: 'financial', authority: 0.82 },
  { pattern: /nasdaq\.com|nyse\.com|lse\.co\.uk/i, category: 'financial', authority: 0.90 },
  { pattern: /tadawul|argaam|cma\.sa/i, category: 'financial', authority: 0.88 },
  
  // Major news
  { pattern: /nytimes\.com|washingtonpost\.com|bbc\.(com|co\.uk)|cnn\.com/i, category: 'news_major', authority: 0.78 },
  { pattern: /theguardian\.com|apnews\.com|npr\.org|economist\.com/i, category: 'news_major', authority: 0.78 },
  { pattern: /forbes\.com|fortune\.com|businessinsider\.com/i, category: 'news_major', authority: 0.75 },
  { pattern: /techcrunch\.com|wired\.com|arstechnica\.com/i, category: 'news_major', authority: 0.72 },
  
  // Wiki & reference
  { pattern: /wikipedia\.org|britannica\.com|investopedia\.com/i, category: 'wiki', authority: 0.55 },
  
  // Social & user-generated
  { pattern: /reddit\.com|twitter\.com|x\.com|facebook\.com|linkedin\.com/i, category: 'social', authority: 0.35 },
  { pattern: /medium\.com|substack\.com|quora\.com/i, category: 'social', authority: 0.40 },
];

export class SourceAuthorityManager {
  private authorityCache: Map<string, SourceAuthority> = new Map();
  private customAuthorities: Map<string, number> = new Map();

  /**
   * Get authority score for a domain
   */
  getAuthority(urlOrDomain: string): SourceAuthority {
    const domain = this.extractDomain(urlOrDomain);
    
    // Check cache
    if (this.authorityCache.has(domain)) {
      return this.authorityCache.get(domain)!;
    }

    // Check custom overrides
    if (this.customAuthorities.has(domain)) {
      const authority: SourceAuthority = {
        domain,
        authority: this.customAuthorities.get(domain)!,
        category: 'official',
        reliability: 0.9,
        freshness: 0.8,
      };
      this.authorityCache.set(domain, authority);
      return authority;
    }

    // Match against patterns
    for (const { pattern, category, authority: baseAuthority } of DOMAIN_PATTERNS) {
      if (pattern.test(domain)) {
        const authority: SourceAuthority = {
          domain,
          authority: baseAuthority,
          category,
          reliability: this.estimateReliability(category),
          freshness: this.estimateFreshness(category),
        };
        this.authorityCache.set(domain, authority);
        return authority;
      }
    }

    // Default unknown
    const authority: SourceAuthority = {
      domain,
      authority: 0.30,
      category: 'unknown',
      reliability: 0.5,
      freshness: 0.5,
    };
    this.authorityCache.set(domain, authority);
    return authority;
  }

  /**
   * Add custom authority for a domain (e.g., user-configured Deep Verify sources)
   */
  setCustomAuthority(domain: string, authority: number): void {
    this.customAuthorities.set(this.extractDomain(domain), Math.max(0, Math.min(1, authority)));
    this.authorityCache.delete(domain); // Clear cache
  }

  /**
   * Rank sources by authority (highest first)
   */
  rankSources<T extends { url: string }>(sources: T[]): T[] {
    return [...sources].sort((a, b) => {
      const authA = this.getAuthority(a.url).authority;
      const authB = this.getAuthority(b.url).authority;
      return authB - authA;
    });
  }

  /**
   * Select the most authoritative value when sources conflict
   */
  resolveConflict<T>(
    valuesBySource: Map<string, T>,
    options?: { preferRecent?: boolean }
  ): { value: T; authority: number; source: string; allSources: string[] } | null {
    if (valuesBySource.size === 0) return null;

    let bestValue: T | undefined;
    let bestAuthority = -1;
    let bestSource = '';

    for (const [source, value] of valuesBySource.entries()) {
      const authority = this.getAuthority(source);
      if (authority.authority > bestAuthority) {
        bestAuthority = authority.authority;
        bestValue = value;
        bestSource = source;
      }
    }

    if (bestValue === undefined) return null;

    return {
      value: bestValue,
      authority: bestAuthority,
      source: bestSource,
      allSources: Array.from(valuesBySource.keys()),
    };
  }

  /**
   * Calculate weighted confidence based on source authorities
   */
  calculateWeightedConfidence(
    sources: Array<{ url: string; confidence: number }>
  ): number {
    if (sources.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const source of sources) {
      const authority = this.getAuthority(source.url).authority;
      weightedSum += source.confidence * authority;
      totalWeight += authority;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private extractDomain(urlOrDomain: string): string {
    try {
      if (urlOrDomain.startsWith('http')) {
        return new URL(urlOrDomain).hostname.replace(/^www\./, '');
      }
      return urlOrDomain.replace(/^www\./, '');
    } catch {
      return urlOrDomain;
    }
  }

  private estimateReliability(category: SourceCategory): number {
    const reliabilityMap: Record<SourceCategory, number> = {
      government: 0.95,
      regulatory: 0.95,
      official: 0.90,
      academic: 0.90,
      financial: 0.85,
      news_major: 0.80,
      news_minor: 0.65,
      wiki: 0.70,
      social: 0.40,
      unknown: 0.50,
    };
    return reliabilityMap[category];
  }

  private estimateFreshness(category: SourceCategory): number {
    const freshnessMap: Record<SourceCategory, number> = {
      news_major: 0.95,
      news_minor: 0.90,
      financial: 0.90,
      social: 0.85,
      official: 0.75,
      regulatory: 0.70,
      government: 0.65,
      academic: 0.50,
      wiki: 0.60,
      unknown: 0.50,
    };
    return freshnessMap[category];
  }

  getCacheStats(): { size: number } {
    return { size: this.authorityCache.size };
  }

  clearCache(): void {
    this.authorityCache.clear();
  }
}

export const sourceAuthorityManager = new SourceAuthorityManager();
