# Security verification matrix

9 October 2026. Statuses: PASS, FAIL, FIXED AND VERIFIED, NOT APPLICABLE, NOT VERIFIED, ACCEPTED RISK.
"Local" means a production build served by `next start` on 127.0.0.1, with the real headers.

| Area | Status | Evidence |
|---|---|---|
| XSS through deep links | FIXED AND VERIFIED | `security:browser`: 11 hostile links (script, attribute breakout, `javascript:`, CRLF, `__proto__`, 8 KB value), no dialog, no error, app loads, clock in range |
| XSS through search | PASS | `security:browser`: markup typed is shown as text, no element created |
| XSS through data and links | FIXED AND VERIFIED | `safeExternalHref` cases in `security:test` |
| DOM sinks (`innerHTML`, `eval`, `Function`, inline scripts, foreign script URLs) | FIXED AND VERIFIED | `security:browser`: CSP and Trusted Types refuse all six, control case runs. `security:lint` keeps app code free of sinks |
| Numeric boundaries (`frame`, `day`) | FIXED AND VERIFIED | `security:test` (13 invalid forms), `security:browser` |
| URL handling and open redirects | PASS | `security:scan` (local): 5 redirect probes stay on the same host |
| HTTP response splitting (CRLF) | PASS | `security:scan` (local): 3 probes, no injected header |
| Host header injection | PASS | `security:scan` (local) |
| Path traversal and sensitive files | PASS | `security:scan` (local): 5 traversal forms, 19 private paths not served, no source maps |
| HTTP methods | PASS | `security:scan` (local): TRACE not echoed, no write accepted |
| XML injection | NOT APPLICABLE | No XML parser. `sitemap.xml` is generated at build time from constants, scan confirms input is not reflected |
| SQL, NoSQL, SSRF, command and template injection | NOT APPLICABLE | No server code takes request input (static routes only). Template payloads not reflected (`security:scan`) |
| Request smuggling | NOT VERIFIED | Hosting infrastructure, deliberately not tested |
| JSON validation and prototype pollution | FIXED AND VERIFIED | `security:test`: forbidden keys refused at runtime and in the build, stored settings restored by type, `Object.prototype` untouched. `security:browser`: hostile localStorage |
| Data integrity in transit | FIXED AND VERIFIED | `security:browser`: altered dataset and locale files refused by SRI |
| Script integrity | FIXED AND VERIFIED | `security:scan` (local): every inline script covered by a CSP hash, every script tag carries `integrity` |
| Build pipeline: malformed and hostile sources | FIXED AND VERIFIED | `security:test`: malformed JSON and `__proto__` fail the compile, `public/data` untouched |
| Build pipeline: file paths | FIXED AND VERIFIED | `security:test`: output guard refuses the repository, its parent, a drive root and an unrelated folder |
| Error handling | FIXED AND VERIFIED | `security:browser`: error screen shows no path, stack or command |
| Clickjacking | PASS | `security:browser`: the page does not render inside a frame |
| Headers and CSP (local build) | FIXED AND VERIFIED | `security:scan` (local): all header checks pass |
| Headers and CSP (Vercel preview build of this change) | PASS | Vercel's own build served the hashed CSP (no placeholder left), 11 of 11 inline scripts covered by hashes, 9 of 9 script tags with integrity, Trusted Types on, document headers on the page only, CORP and nosniff on data |
| Headers and CSP (production) | NOT VERIFIED | Pending the merge to `main`. Run the passive `security:scan` against production afterwards |
| Resource cleanup (WebGL, memory) | FIXED AND VERIFIED | `security:browser`: 6 open and close cycles of the 3D view, handle released, heap growth under 25 MB, no context warnings |
| Search cost | FIXED AND VERIFIED | `security:test`: 1 MB, 100k-word and markup queries each under 250 ms |
| Oversized requests | PASS | `security:browser`: a 60 KB URL is refused by the server, which keeps serving |
| Runtime dependency advisories | FIXED AND VERIFIED, one ACCEPTED RISK | `npm audit --omit=dev`: only GHSA-jrc7-96c5-q579 (MapLibre, unreachable path, see SEC-01) |
| Dev dependency advisories | ACCEPTED RISK | `braces`, `postcss-selector-parser` (Tailwind 3, build-time only) |
| Lifecycle install scripts | PASS | 4 packages: `esbuild`, `fsevents`, `puppeteer`, `unrs-resolver` (known tooling) |
| Secrets in the repository | PASS (limited) | `.env*` and `.vercel` are git-ignored. The only environment variable is the public Search Console token, kept in Vercel. No history-wide secret scanner was run |
| CI least privilege | FIXED (not yet run) | `contents: read`, no secrets, SHA-pinned actions, `persist-credentials: false` |
| UI regression | PASS | `npm run qa` 43/43 with all hardening enabled |
| Volumetric DoS | NOT VERIFIED | Platform matter, deliberately not tested |
