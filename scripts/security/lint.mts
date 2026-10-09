/**
 * Static security rules for src/. Runs in `npm run verify`, so new code that
 * opens a hole fails before it is built. Each rule is one entry in RULES;
 * a justified exception goes in ALLOW with the reason.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'src');

interface Rule { id: string; re: RegExp; why: string; files?: RegExp }
const RULES: Rule[] = [
  { id: 'eval', re: /\beval\s*\(|new\s+Function\s*\(/, why: 'runs strings as code' },
  { id: 'string-timer', re: /set(?:Timeout|Interval)\s*\(\s*['"`]/, why: 'string timers are eval' },
  { id: 'html-sink', re: /\.(?:innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(|document\.write(?:ln)?\s*\(|createContextualFragment\s*\(/, why: 'DOM XSS sink' },
  { id: 'react-html', re: /dangerouslySetInnerHTML/, why: 'raw HTML into the DOM' },
  { id: 'raw-fetch', re: /(?<![\w.])fetch\s*\(/, why: 'use fetchVerified (same-origin, integrity)', files: /^(?!security[\\/]).*/ },
  { id: 'blank-target', re: /target="_blank"(?![^>]*rel="(?:noopener noreferrer|noreferrer noopener)")/, why: 'needs rel with noopener and noreferrer' },
  { id: 'insecure-url', re: /['"`]http:\/\/(?!www\.w3\.org|127\.0\.0\.1|localhost)/, why: 'plain HTTP' },
  { id: 'js-url', re: /['"`]javascript:/i, why: 'javascript: URL' },
  { id: 'postmessage', re: /addEventListener\(\s*['"]message['"]/, why: 'postMessage listener needs an origin check' },
  // GHSA-jrc7-96c5-q579 (MapLibre DOM.sanitize bypass, unpatched in 5.x): keep its only entry points unused.
  { id: 'maplibre-html', re: /\.setHTML\s*\(|customAttribution|new\s+(?:maplibregl\.)?Popup\s*\(/, why: 'MapLibre HTML path (GHSA-jrc7-96c5-q579): render text with React instead' },
  { id: 'storage-secret', re: /localStorage\.setItem\([^)]*(?:token|secret|password|key)/i, why: 'secrets in localStorage' },
];

// file (relative to src) + rule id -> reason
const ALLOW: Record<string, string> = {
  'app/layout.tsx#react-html': 'two server-rendered scripts: the constant theme boot (pinned by CSP hash) and JSON-LD with < escaped',
};

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) yield p;
  }
}

let problems = 0;
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join('/');
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const rule of RULES) {
    if (rule.files && !rule.files.test(rel)) continue;
    if (ALLOW[`${rel}#${rule.id}`]) continue;
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      if (rule.re.test(line)) {
        problems += 1;
        console.log(`  ${rel}:${i + 1}  [${rule.id}] ${rule.why}\n      ${line.trim().slice(0, 140)}`);
      }
    });
  }
}
console.log(problems ? `\nsecurity lint: ${problems} problem(s).` : 'security lint: clean.');
process.exit(problems ? 1 : 0);
