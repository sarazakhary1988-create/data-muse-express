import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MapRequest {
  url: string;
  search?: string;
  limit?: number;
}

const MAX_URL_LENGTH = 2048;
const MAX_SEARCH_LENGTH = 300;
const MAX_LIMIT = 500;

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_XML_BYTES = 1_200_000;

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
];

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function validateUrl(url: string): { ok: boolean; error?: string; formatted?: string } {
  if (!url || typeof url !== 'string') return { ok: false, error: 'URL is required' };
  if (url.length > MAX_URL_LENGTH) return { ok: false, error: `URL too long (>${MAX_URL_LENGTH})` };

  try {
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    const parsed = new URL(formatted);

    if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false, error: 'Only HTTP/HTTPS URLs are allowed' };

    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) return { ok: false, error: 'URL not allowed' };
    for (const p of BLOCKED_IP_PATTERNS) if (p.test(hostname)) return { ok: false, error: 'URL not allowed' };

    return { ok: true, formatted: parsed.toString() };
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string } > {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrkestraResearchBot/1.0',
        'Accept': 'text/plain,application/xml,text/xml,*/*;q=0.5'
      }
    });

    if (!resp.ok) return { ok: false, status: resp.status, text: '' };

    const buf = new Uint8Array(await resp.arrayBuffer());
    const sliced = buf.byteLength > MAX_XML_BYTES ? buf.slice(0, MAX_XML_BYTES) : buf;
    const text = new TextDecoder('utf-8').decode(sliced);

    return { ok: true, status: resp.status, text };
  } catch {
    return { ok: false, status: 0, text: '' };
  } finally {
    clearTimeout(t);
  }
}

function parseSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const u = m[1].trim();
    if (u.startsWith('http')) urls.push(u);
  }
  return urls;
}

async function discoverSitemaps(baseUrl: string): Promise<string[]> {
  const out = new Set<string>();
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const r = await fetchText(robotsUrl);
    if (r.ok && r.text) {
      for (const line of r.text.split('\n')) {
        const m = line.match(/^\s*Sitemap:\s*(.+)\s*$/i);
        if (m?.[1]) out.add(m[1].trim());
      }
    }
  } catch {
    // ignore
  }

  // common fallbacks
  try { out.add(new URL('/sitemap.xml', baseUrl).toString()); } catch {}
  try { out.add(new URL('/sitemap_index.xml', baseUrl).toString()); } catch {}

  return Array.from(out);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as MapRequest;
    const url = body.url;

    const v = validateUrl(url);
    if (!v.ok || !v.formatted) {
      return new Response(
        JSON.stringify({ success: false, error: v.error || 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const limit = Math.max(1, Math.min(typeof body.limit === 'number' ? Math.floor(body.limit) : 120, MAX_LIMIT));
    const search = typeof body.search === 'string' ? body.search.trim().slice(0, MAX_SEARCH_LENGTH) : '';
    const searchLower = search.toLowerCase();

    console.log('[research-map] mapping', v.formatted, { limit, search });

    const sitemaps = await discoverSitemaps(v.formatted);
    const urls: string[] = [];

    for (const sm of sitemaps.slice(0, 4)) {
      const res = await fetchText(sm);
      if (!res.ok || !res.text) continue;
      const found = parseSitemapUrls(res.text);
      for (const u of found) {
        if (urls.length >= limit) break;
        if (searchLower) {
          const uLow = u.toLowerCase();
          if (!uLow.includes(searchLower)) continue;
        }
        urls.push(u);
      }
      if (urls.length >= limit) break;
    }

    // Always include base URL at least
    if (urls.length === 0) urls.push(v.formatted);

    return new Response(
      JSON.stringify({ success: true, links: urls, mapMethod: 'sitemap' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[research-map] error', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Map failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
