#!/usr/bin/env node
/**
 * Validate all scale citation links in music-theory-engine.js
 * - Checks HTTP accessibility (status, redirects)
 * - Fetches page content and verifies it likely matches the citation topic using the reference title
 * - Produces JSON and Markdown reports
 *
 * Requires: Node 18+ (global fetch)
 */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENGINE_PATH = path.join(PROJECT_ROOT, 'music-theory-engine.js');

let MusicTheoryEngine;
try {
  MusicTheoryEngine = require(ENGINE_PATH);
} catch (e) {
  console.error('Failed to load music-theory-engine.js:', e.message);
  process.exit(1);
}

const engine = new MusicTheoryEngine();
const citations = engine.scaleCitations || {};

const OUTPUT_DIR = path.join(PROJECT_ROOT, 'validation');
const JSON_REPORT = path.join(OUTPUT_DIR, 'citation-report.json');
const MD_REPORT = path.join(OUTPUT_DIR, 'citation-report.md');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeText(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/["'`’‘“”\(\)\[\]\{\}\.,:;!\-_/]+/g, ' ')
    .trim();
}

function buildTitleKeywords(title) {
  // Use informative tokens from the title, filter common stopwords
  const stop = new Set(['the','a','an','of','and','mode','scale','scales','music','theory','wikipedia','britannica','maqamworld','maqam','family','jazz','workshops','howard','rees']);
  return normalizeText(title)
    .split(' ')
    .filter(tok => tok.length > 2 && !stop.has(tok));
}

function hostOk(u) {
  try {
    const h = new URL(u).hostname;
    return [
      'en.wikipedia.org', 'wikipedia.org',
      'www.britannica.com', 'britannica.com',
      'maqamworld.com', 'www.maqamworld.com',
      'jazzworkshops.com', 'www.jazzworkshops.com'
    ].includes(h);
  } catch { return false; }
}

async function fetchWithMeta(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'ScaleLinkValidator/1.0 (+https://example.local)'
      }
    });
    const status = res.status;
    const finalUrl = res.url;
    const text = status === 200 ? await res.text() : '';
    return { ok: status >= 200 && status < 300, status, finalUrl, text };
  } catch (e) {
    return { ok: false, status: 0, finalUrl: url, error: e.message, text: '' };
  } finally {
    clearTimeout(timeout);
  }
}

function contentLikelyMatches(text, refTitle) {
  if (!text || !refTitle) return false;
  const body = normalizeText(text);
  const title = normalizeText(refTitle);
  // Strong match if full normalized title appears
  if (body.includes(title)) return true;
  // Otherwise require at least 2 keyword tokens to appear
  const kws = buildTitleKeywords(refTitle);
  const hits = kws.filter(kw => body.includes(kw));
  return hits.length >= Math.min(2, kws.length);
}

async function validateReference(scaleId, ref) {
  const result = {
    scaleId,
    refTitle: ref.title,
    url: ref.url,
    hostAllowed: hostOk(ref.url),
    status: null,
    ok: false,
    finalUrl: null,
    contentMatch: false,
    notes: []
  };

  if (!/^https?:\/\//i.test(ref.url)) {
    result.notes.push('Non-HTTP(S) URL');
    return result;
  }

  const { ok, status, finalUrl, text, error } = await fetchWithMeta(ref.url);
  result.status = status;
  result.finalUrl = finalUrl;
  result.ok = ok;
  if (!ok) {
    result.notes.push(error ? `Fetch error: ${error}` : `HTTP ${status}`);
    return result;
  }

  const match = contentLikelyMatches(text, ref.title);
  result.contentMatch = match;
  if (!match) {
    result.notes.push('Title keywords not found in page content');
  }
  if (!result.hostAllowed) {
    result.notes.push('Host is not in the approved allowlist');
  }

  return result;
}

async function run() {
  ensureDir(OUTPUT_DIR);

  const tasks = [];
  for (const [scaleId, meta] of Object.entries(citations)) {
    const refs = Array.isArray(meta.references) ? meta.references : [];
    for (const ref of refs) {
      tasks.push({ scaleId, ref });
    }
  }

  // Concurrency limiter
  const CONCURRENCY = 10;
  const results = [];
  async function worker(queue) {
    while (queue.length) {
      const item = queue.shift();
      const r = await validateReference(item.scaleId, item.ref);
      results.push(r);
      // brief delay to be polite
      await new Promise(res => setTimeout(res, 100));
    }
  }

  const queue = tasks.slice();
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue));
  await Promise.all(workers);

  const byScale = {};
  for (const r of results) {
    if (!byScale[r.scaleId]) byScale[r.scaleId] = [];
    byScale[r.scaleId].push(r);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totals: {
      citations: results.length,
      ok: results.filter(r => r.ok).length,
      contentMatch: results.filter(r => r.contentMatch).length
    },
    problems: {
      networkOrStatus: results.filter(r => !r.ok),
      contentMismatch: results.filter(r => r.ok && !r.contentMatch),
      disallowedHost: results.filter(r => !r.hostAllowed)
    },
    byScale
  };

  // Write JSON
  fs.writeFileSync(JSON_REPORT, JSON.stringify(summary, null, 2), 'utf8');

  // Write Markdown
  const lines = [];
  lines.push('# Citation Validation Report');
  lines.push('');
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push('');
  lines.push(`- Total citations: ${summary.totals.citations}`);
  lines.push(`- Reachable (HTTP ok): ${summary.totals.ok}`);
  lines.push(`- Content match (title keywords found): ${summary.totals.contentMatch}`);
  lines.push('');

  const problemCount = summary.problems.networkOrStatus.length + summary.problems.contentMismatch.length;
  if (problemCount === 0) {
    lines.push('All links validated successfully.');
  } else {
    if (summary.problems.networkOrStatus.length) {
      lines.push('## Network/HTTP Problems');
      summary.problems.networkOrStatus.forEach(r => {
        lines.push(`- ${r.scaleId}: ${r.refTitle} -> ${r.url} (status: ${r.status}) ${r.notes.join('; ')}`);
      });
      lines.push('');
    }
    if (summary.problems.contentMismatch.length) {
      lines.push('## Content Mismatch (title keywords not found)');
      summary.problems.contentMismatch.forEach(r => {
        lines.push(`- ${r.scaleId}: ${r.refTitle} -> ${r.finalUrl}`);
      });
      lines.push('');
    }
    if (summary.problems.disallowedHost.length) {
      lines.push('## Disallowed Hosts');
      summary.problems.disallowedHost.forEach(r => {
        lines.push(`- ${r.scaleId}: ${r.refTitle} -> ${r.url}`);
      });
      lines.push('');
    }
  }

  fs.writeFileSync(MD_REPORT, lines.join('\n'), 'utf8');

  console.log('Validation complete.');
  console.log('- JSON:', path.relative(PROJECT_ROOT, JSON_REPORT));
  console.log('- Markdown:', path.relative(PROJECT_ROOT, MD_REPORT));
}

run().catch(err => {
  console.error('Validator failed:', err);
  process.exit(1);
});
