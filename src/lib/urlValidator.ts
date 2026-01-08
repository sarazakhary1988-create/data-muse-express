// URL Validation & Fake Link Detection System

// Whitelist of verified news domains
export const VERIFIED_DOMAINS = [
  // Government/Official
  'cma.gov.sa',
  'tadawul.com.sa',
  'saudiexchange.sa',
  'sec.gov',
  'mof.gov.sa',
  
  // Premium/Tier 1 News
  'reuters.com',
  'bloomberg.com',
  'ft.com',
  'wsj.com',
  'cnbc.com',
  'bbc.com',
  'bbc.co.uk',
  
  // Verified Regional News
  'aljazeera.com',
  'arabnews.com',
  'argaam.com',
  'zawya.com',
  'gulfnews.com',
  'khaleejtimes.com',
  'thenationalnews.com',
  
  // Verified Business/Finance
  'theconversation.com',
  'arabiangazette.com',
  'marketscreener.com',
  'arizton.com',
  'agbionline.com',
  'marketwatch.com',
  'finance.yahoo.com',
  'yahoo.com',
  
  // Additional verified sources
  'tradingview.com',
  'investing.com',
  'seekingalpha.com',
  'forbes.com',
  'fortune.com',
  'economist.com',
  'businessinsider.com',
];

// Official/Government sources
export const OFFICIAL_DOMAINS = [
  'cma.gov.sa',
  'tadawul.com.sa',
  'saudiexchange.sa',
  'sec.gov',
  'mof.gov.sa',
];

// Premium sources
export const PREMIUM_DOMAINS = [
  'ft.com',
  'bloomberg.com',
  'wsj.com',
  'economist.com',
];

// Patterns that indicate AI-generated or fake content
const AI_GENERATED_PATTERNS = [
  /\bin conclusion\b/gi,
  /\bas we can see\b/gi,
  /\bit is important to note that\b/gi,
  /\bthis article will explore\b/gi,
  /\blorem ipsum\b/gi,
  /\bclick here to learn more\b/gi,
];

export type SourceCredibility = 'official' | 'verified' | 'premium' | 'custom' | 'warning' | 'unverified';

export interface UrlValidationResult {
  isValid: boolean;
  isWhitelisted: boolean;
  credibility: SourceCredibility;
  domain: string;
  reasons: string[];
  hasValidStructure: boolean;
  isSuspicious: boolean;
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function validateUrl(url: string): UrlValidationResult {
  const result: UrlValidationResult = {
    isValid: false,
    isWhitelisted: false,
    credibility: 'unverified',
    domain: '',
    reasons: [],
    hasValidStructure: false,
    isSuspicious: false,
  };

  // Check basic URL structure
  if (!url || typeof url !== 'string') {
    result.reasons.push('Empty or invalid URL');
    return result;
  }

  // Must start with http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    result.reasons.push('URL must use HTTP or HTTPS protocol');
    return result;
  }

  // Parse URL
  try {
    const urlObj = new URL(url);
    result.domain = urlObj.hostname.replace(/^www\./, '');
    result.hasValidStructure = true;

    // Check for obviously fake domains
    if (result.domain.includes('example.com') || 
        result.domain.includes('placeholder') ||
        result.domain.includes('test.com') ||
        result.domain.includes('fake')) {
      result.reasons.push('Suspicious domain detected');
      result.isSuspicious = true;
      return result;
    }

    // Check domain length
    if (result.domain.length < 4 || !result.domain.includes('.')) {
      result.reasons.push('Invalid domain structure');
      return result;
    }

    // Check if whitelisted
    const isWhitelisted = VERIFIED_DOMAINS.some(d => 
      result.domain === d || result.domain.endsWith('.' + d)
    );

    if (isWhitelisted) {
      result.isWhitelisted = true;
      result.isValid = true;

      // Determine credibility level
      if (OFFICIAL_DOMAINS.some(d => result.domain === d || result.domain.endsWith('.' + d))) {
        result.credibility = 'official';
      } else if (PREMIUM_DOMAINS.some(d => result.domain === d || result.domain.endsWith('.' + d))) {
        result.credibility = 'premium';
      } else {
        result.credibility = 'verified';
      }
    } else {
      // Not whitelisted - mark as unverified but allow
      result.isValid = true; // Still allow, but mark as unverified
      result.credibility = 'unverified';
      result.reasons.push('Source not in verified whitelist');
    }

  } catch {
    result.reasons.push('Failed to parse URL');
    return result;
  }

  return result;
}

export function checkForAIPatterns(content: string): { hasPatterns: boolean; matches: string[] } {
  const matches: string[] = [];
  
  for (const pattern of AI_GENERATED_PATTERNS) {
    if (pattern.test(content)) {
      matches.push(pattern.source);
    }
  }

  return {
    hasPatterns: matches.length > 0,
    matches,
  };
}

export function getCredibilityBadge(credibility: SourceCredibility): {
  label: string;
  color: string;
  icon: string;
} {
  switch (credibility) {
    case 'official':
      return { label: 'Official', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '🏛️' };
    case 'premium':
      return { label: 'Premium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '⭐' };
    case 'verified':
      return { label: 'Verified', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '✓' };
    case 'custom':
      return { label: 'Custom', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '📌' };
    case 'warning':
      return { label: 'Warning', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '⚠️' };
    case 'unverified':
    default:
      return { label: 'Unverified', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: '?' };
  }
}

// Validate and filter news items before display
export function filterValidNewsItems<T extends { url: string; title?: string; snippet?: string }>(
  items: T[],
  rejectUnverified: boolean = false
): { valid: T[]; rejected: T[] } {
  const valid: T[] = [];
  const rejected: T[] = [];

  for (const item of items) {
    const validation = validateUrl(item.url);

    if (!validation.hasValidStructure || validation.isSuspicious) {
      console.log('[URLValidator] Rejecting suspicious URL:', item.url, validation.reasons);
      rejected.push(item);
      continue;
    }

    if (rejectUnverified && !validation.isWhitelisted) {
      console.log('[URLValidator] Rejecting unverified source:', item.url);
      rejected.push(item);
      continue;
    }

    // Check content for AI patterns if available
    const content = `${item.title || ''} ${item.snippet || ''}`;
    const aiCheck = checkForAIPatterns(content);
    
    if (aiCheck.hasPatterns && aiCheck.matches.length > 2) {
      console.log('[URLValidator] Rejecting AI-patterned content:', item.url, aiCheck.matches);
      rejected.push(item);
      continue;
    }

    valid.push(item);
  }

  return { valid, rejected };
}
