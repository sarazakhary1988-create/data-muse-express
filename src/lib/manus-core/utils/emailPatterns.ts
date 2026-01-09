/**
 * Email Pattern Generation and Validation Utilities
 * Implements Hunter.io and Clearbit-style email discovery patterns
 * No external APIs - pure algorithmic approach
 */

/**
 * Common email patterns used by companies
 */
export const EMAIL_PATTERNS = [
  '{first}.{last}@{domain}',       // john.doe@company.com (most common)
  '{first}{last}@{domain}',        // johndoe@company.com
  '{f}{last}@{domain}',            // jdoe@company.com
  '{first}@{domain}',              // john@company.com
  '{last}@{domain}',               // doe@company.com
  '{first}_{last}@{domain}',       // john_doe@company.com
  '{first}-{last}@{domain}',       // john-doe@company.com
  '{last}.{first}@{domain}',       // doe.john@company.com
  '{first}{l}@{domain}',           // johnd@company.com
  '{f}.{last}@{domain}',           // j.doe@company.com
  '{first}{last[0:1]}@{domain}',   // johnd@company.com
];

/**
 * Generate all possible email patterns for a person
 */
export function generateEmailPatterns(
  firstName: string,
  lastName: string,
  domain: string
): string[] {
  const first = firstName.toLowerCase().trim();
  const last = lastName.toLowerCase().trim();
  const f = first.charAt(0);
  const l = last.charAt(0);

  const emails: string[] = [
    `${first}.${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${f}${last}@${domain}`,
    `${first}@${domain}`,
    `${last}@${domain}`,
    `${first}_${last}@${domain}`,
    `${first}-${last}@${domain}`,
    `${last}.${first}@${domain}`,
    `${first}${l}@${domain}`,
    `${f}.${last}@${domain}`,
  ];

  // Remove duplicates and return
  return [...new Set(emails)];
}

/**
 * Validate email format using regex
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Extract domain from company name
 * Uses common patterns to guess company domain
 */
export function guessDomainFromCompany(companyName: string): string[] {
  const normalized = companyName
    .toLowerCase()
    .replace(/\s+(inc|llc|ltd|corp|corporation|company|co|limited)\.?$/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '');

  const domains: string[] = [
    `${normalized}.com`,
    `${normalized}.net`,
    `${normalized}.io`,
    `${normalized}.co`,
  ];

  // Handle multi-word companies
  if (companyName.includes(' ')) {
    const words = companyName.toLowerCase().split(' ').filter(w => w.length > 2);
    if (words.length >= 2) {
      const acronym = words.map(w => w.charAt(0)).join('');
      domains.push(`${acronym}.com`);
    }
  }

  return domains;
}

/**
 * Extract domain from company website URL
 */
export function extractDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Validate email format using regex and basic checks
 * Note: Full MX record validation requires server-side implementation.
 * This browser-compatible version only performs format validation.
 */
export async function validateEmailFormat(email: string): Promise<{
  valid: boolean;
  reason: string;
}> {
  // Format validation
  if (!isValidEmailFormat(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  const domain = email.split('@')[1];

  // Basic domain validation
  if (!domain || domain.length < 3) {
    return { valid: false, reason: 'Invalid domain' };
  }

  // Check if domain has valid TLD
  const tldRegex = /\.[a-z]{2,}$/i;
  if (!tldRegex.test(domain)) {
    return { valid: false, reason: 'Invalid TLD' };
  }

  // In browser, we can't do actual MX lookup
  // Return valid for well-formed emails
  return { valid: true, reason: 'Format valid (MX check requires server)' };
}

/**
 * Alias for backward compatibility
 * @deprecated Use validateEmailFormat instead
 */
export const validateEmailWithMX = validateEmailFormat;

/**
 * Score email likelihood based on pattern commonality
 */
export function scoreEmailPattern(email: string): number {
  const pattern = email.split('@')[0];
  
  // Common patterns score higher
  if (/^[a-z]+\.[a-z]+$/.test(pattern)) return 0.9; // first.last
  if (/^[a-z]+$/.test(pattern)) return 0.7; // first
  if (/^[a-z][a-z]+$/.test(pattern)) return 0.6; // flast
  if (/^[a-z]+_[a-z]+$/.test(pattern)) return 0.5; // first_last
  
  return 0.3; // other patterns
}

/**
 * Generate and rank email candidates
 */
export function generateRankedEmails(
  firstName: string,
  lastName: string,
  domain: string
): Array<{ email: string; score: number }> {
  const patterns = generateEmailPatterns(firstName, lastName, domain);
  
  return patterns
    .map(email => ({
      email,
      score: scoreEmailPattern(email),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Hunter.io style email verification simulation
 * In production, this would call an API, but we use pattern matching
 */
export interface EmailVerificationResult {
  email: string;
  valid: boolean;
  score: number; // 0-100
  status: 'valid' | 'invalid' | 'unknown' | 'risky';
  sources: string[];
  pattern: string;
}

export async function verifyEmail(email: string): Promise<EmailVerificationResult> {
  const formatValid = isValidEmailFormat(email);
  const mxResult = await validateEmailFormat(email);
  const score = scoreEmailPattern(email) * 100;
  
  let status: 'valid' | 'invalid' | 'unknown' | 'risky' = 'unknown';
  
  if (!formatValid) {
    status = 'invalid';
  } else if (mxResult.valid && score > 70) {
    status = 'valid';
  } else if (score > 40) {
    status = 'risky';
  }
  
  const pattern = email.split('@')[0];
  
  return {
    email,
    valid: status === 'valid',
    score: Math.round(score),
    status,
    sources: ['pattern-analysis', 'format-validation'],
    pattern: pattern.replace(/[a-z]/g, 'x').replace(/[0-9]/g, 'n'),
  };
}

/**
 * Find most likely email for a person at a company
 */
export async function findMostLikelyEmail(
  firstName: string,
  lastName: string,
  companyDomain: string
): Promise<EmailVerificationResult> {
  const rankedEmails = generateRankedEmails(firstName, lastName, companyDomain);
  
  if (rankedEmails.length === 0) {
    throw new Error('Could not generate email patterns');
  }
  
  // Return the highest scored email
  const topEmail = rankedEmails[0];
  return await verifyEmail(topEmail.email);
}

/**
 * Batch email verification
 */
export async function verifyEmailsBatch(
  emails: string[]
): Promise<EmailVerificationResult[]> {
  return await Promise.all(emails.map(email => verifyEmail(email)));
}

/**
 * Extract email from text using regex
 */
export function extractEmailsFromText(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Normalize email (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if email is from a free provider (gmail, yahoo, etc.)
 */
export function isFreeEmailProvider(email: string): boolean {
  const freeProviders = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'aol.com',
    'icloud.com',
    'protonmail.com',
    'mail.com',
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return freeProviders.includes(domain);
}

/**
 * Generate catch-all patterns for testing
 */
export function generateCatchAllTestEmails(domain: string): string[] {
  return [
    `info@${domain}`,
    `contact@${domain}`,
    `hello@${domain}`,
    `support@${domain}`,
    `admin@${domain}`,
  ];
}

export default {
  generateEmailPatterns,
  generateRankedEmails,
  isValidEmailFormat,
  validateEmailFormat,
  validateEmailWithMX, // deprecated alias
  verifyEmail,
  findMostLikelyEmail,
  extractDomainFromUrl,
  guessDomainFromCompany,
  extractEmailsFromText,
  isFreeEmailProvider,
};
