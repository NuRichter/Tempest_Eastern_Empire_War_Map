/**
 * Dependency audit gate for the runtime dependencies.
 *
 * Runs `npm audit --omit=dev --json` and fails on every advisory, of any
 * severity, except those in accepted-risks.json. An accepted entry only
 * covers its package, its advisory, the installed version line it was
 * reviewed for and the time until its review date. A new advisory, a
 * different version or an expired review fails the gate.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Via = { url?: string; title?: string; severity?: string } | string;
type Vulnerability = { name: string; severity: string; via: Via[] };
type Accepted = { id: string; advisory: string; package: string; versionPrefix: string; reviewBy: string };

const ROOT = join(import.meta.dirname, '..', '..');
const { accepted } = JSON.parse(readFileSync(join(import.meta.dirname, 'accepted-risks.json'), 'utf8')) as { accepted: Accepted[] };

let raw: string;
try {
  raw = execSync('npm audit --omit=dev --json', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  // npm audit exits non-zero when it finds anything. The report is still on stdout.
  raw = (e as { stdout?: string }).stdout ?? '';
}
const report = JSON.parse(raw) as { vulnerabilities?: Record<string, Vulnerability>; error?: unknown };
if (!report.vulnerabilities) throw new Error(`security:audit: npm audit gave no report ${JSON.stringify(report.error ?? '')}`);

const installed = (name: string) =>
  (JSON.parse(readFileSync(join(ROOT, 'node_modules', name, 'package.json'), 'utf8')) as { version: string }).version;
const today = new Date().toISOString().slice(0, 10);

const failures: string[] = [];
const notes: string[] = [];
for (const v of Object.values(report.vulnerabilities)) {
  for (const via of v.via) {
    // A string means "vulnerable through another package", which is reported under that package.
    if (typeof via === 'string') continue;
    const advisory = via.url?.split('/').pop() ?? '?';
    const label = `${v.name} ${advisory} (${via.severity}) ${via.title ?? ''}`;
    const entry = accepted.find((a) => a.package === v.name && a.advisory === advisory);
    if (!entry) failures.push(`new advisory: ${label}`);
    else if (!installed(v.name).startsWith(entry.versionPrefix)) failures.push(`${entry.id}: accepted for ${entry.versionPrefix}x, installed ${installed(v.name)}: ${label}`);
    else if (today > entry.reviewBy) failures.push(`${entry.id}: review date ${entry.reviewBy} has passed: ${label}`);
    else notes.push(`${entry.id} accepted until ${entry.reviewBy}: ${label}`);
  }
}

for (const n of notes) console.log(`  note  ${n}`);
for (const f of failures) console.log(`  FAIL  ${f}`);
if (failures.length) {
  console.log(`\n  ${failures.length} unaccepted advisory(ies) in runtime dependencies.`);
  process.exit(1);
}
console.log(`\n  security:audit passed (${notes.length} accepted risk(s) within their review date).`);
