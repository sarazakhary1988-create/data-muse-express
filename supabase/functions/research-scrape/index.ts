import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  url: string;
  formats?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
}

const MAX_URL_LENGTH = 2048;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 1_200_000;

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
];

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

async function fetchHtml(url: string): Promise<{ ok: boolean; status: number; html: string } > {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'LovableResearchBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5',
      }
    });

    if (!resp.ok) return { ok: false, status: resp.status, html: '' };

    const buf = new Uint8Array(await resp.arrayBuffer());
    const sliced = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder('utf-8').decode(sliced);

    return { ok: true, status: resp.status, html };
  } catch {
    return { ok: false, status: 0, html: '' };
  } finally {
    clearTimeout(t);
  }
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function extractContent(html: string, onlyMainContent: boolean): { title: string; description: string; markdown: string; links: string[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) return { title: '', description: '', markdown: '', links: [] };

  const title = normalizeText(doc.querySelector('title')?.textContent ?? '');
  const description = normalizeText(doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '');

  const root = (onlyMainContent
    ? (doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('[role="main"]') || doc.body)
    : doc.body);

  if (!root) return { title, description, markdown: '', links: [] };

  for (const sel of ['script','style','noscript']) root.querySelectorAll(sel).forEach((n: any) => n.remove());

  // Remove chrome only when onlyMainContent
  if (onlyMainContent) {
    for (const sel of ['nav','footer','aside','header']) root.querySelectorAll(sel).forEach((n: any) => n.remove());
  }

  const text = normalizeText(root.textContent ?? '');

  const links = Array.from(root.querySelectorAll('a'))
    .map((a: any) => a.getAttribute('href'))
    .filter((h: any): h is string => typeof h === 'string' && h.length > 0)
    .slice(0, 80);

  const snippet = text.slice(0, 6000);

  const markdown = [
    title ? `# ${title}` : '# Extracted Content',
    description ? `\n*${description}*\n` : '',
    '\n',
    snippet,
  ].join('\n');

  return { title, description, markdown, links };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as ScrapeRequest;
    const url = body.url;

    const v = validateUrl(url);
    if (!v.ok || !v.formatted) {
      return new Response(
        JSON.stringify({ success: false, error: v.error || 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const onlyMainContent = typeof body.onlyMainContent === 'boolean' ? body.onlyMainContent : true;

    console.log('[research-scrape] fetching', v.formatted);

    const res = await fetchHtml(v.formatted);
    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch content (status ${res.status})` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extracted = extractContent(res.html, onlyMainContent);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          markdown: extracted.markdown,
          links: extracted.links,
          metadata: {
            title: extracted.title,
            description: extracted.description,
            sourceURL: v.formatted,
            statusCode: res.status,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[research-scrape] error', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Scrape failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
