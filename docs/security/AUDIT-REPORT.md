# Security audit report

| | |
|---|---|
| Scope | This repository and its production deployment `https://tempestwar.vercel.app` (Vercel project `tempest-eastern-empire-war-map`, whose other aliases serve the same deployment) |
| Date | 9 October 2026 |
| Audited commit | `334aac7` (findings), hardening in the commit that adds this report |
| Method | White-box review of the source, dependency audit, a black-box scanner and browser regression tests against a local production build, passive header checks on production |
| References | OWASP Top 10 (2025), OWASP ASVS 4.0.3 (chapters V1, V5, V10, V12, V14 as relevant to a static client application) |

See also [THREAT-MODEL.md](./THREAT-MODEL.md), [VERIFICATION-MATRIX.md](./VERIFICATION-MATRIX.md) and [MAINTENANCE.md](./MAINTENANCE.md).

## Summary

The site is static: no server code takes request input, so the risk sits in the visitor's browser, in the data and in the supply chain. Before this audit the site already had a same-origin CSP and the usual headers, but allowed any inline script, did not verify its data files, and had vulnerable dependencies. After it, inline scripts are pinned by hash, every script file and data file carries an integrity hash, Trusted Types lock the DOM sinks, inputs at every boundary are validated, the build fails closed on hostile data, and CI enforces audits and tests.

No claim of absolute security is made. A zero-day in the browser, a dependency or the hosting platform remains possible. The controls above limit what such a flaw could do.

## Findings

Severity follows exploitability and impact in this architecture, not the advisory's generic score.

| ID | Severity | Component | Finding | Remediation | Regression test | Status |
|---|---|---|---|---|---|---|
| SEC-01 | Medium (advisory: Critical) | `maplibre-gl` 5.24.0 | GHSA-jrc7-96c5-q579, sanitizer bypass in `DOM.sanitize()`. No 5.x fix. Reached only through `Popup.setHTML` and attribution HTML, neither used (`attributionControl: false`) | Upgrade to 6.13 tried and rolled back (its module worker does not load under the Next build). Kept 5.24 with compensating controls: lint rule bans `setHTML`, `customAttribution` and `Popup`, Trusted Types refuse any HTML string at the DOM sink | `security:lint` rule `maplibre-html`, browser test "Trusted Types refuse an innerHTML string" | ACCEPTED RISK |
| SEC-02 | Medium | `next` 15.5.25 | Advisories for SSG/ISR cache poisoning (self-hosted) | Patch release 15.5.27 | `security:audit` | FIXED AND VERIFIED |
| SEC-03 | Medium | `postcss` bundled in `next` | Advisories (stringify XSS, file read), build-time | `overrides` to 8.5.29 | `security:audit` | FIXED AND VERIFIED |
| SEC-04 | Medium | `sharp`, `source-map-js` | Advisories (librsvg CVE, DoS), build-time | `npm audit fix` (compatible versions) | `security:audit` | FIXED AND VERIFIED |
| SEC-05 | Low | `braces`, `postcss-selector-parser` (Tailwind 3, dev only) | Advisories, no fixed `braces` release | None possible without replacing Tailwind 3. Only processes the project's own config at build time | `npm audit` (full) lists them | ACCEPTED RISK |
| SEC-06 | Medium | CSP | `script-src 'unsafe-inline'`: any injected inline script would run | Inline scripts pinned by SHA-256 after the build (`scripts/security/harden-build.mts`), Subresource Integrity on every script file, Trusted Types, `script-src-attr 'none'`, `base-uri` and `form-action 'none'` | `security:scan` (local), browser tests "CSP refuses eval / new Function", "Trusted Types refuse ..." | FIXED AND VERIFIED |
| SEC-07 | Medium | Deep links (`AppShell.tsx`) | `frame` and `day` unchecked (`NaN`, out of range), ids unchecked | `intParam`, `enumParam`, `idParam` (`src/security/input.ts`) | `security:test` URL cases, browser "deep link ..." (11 hostile links) | FIXED AND VERIFIED |
| SEC-08 | Medium | Runtime JSON | Data, locales and coastline fetched without integrity | `fetchVerified` with build-time SHA-256 (`scripts/security/integrity.mts`), fail-closed JSON parse | Browser "a dataset file altered in transit is refused", "a locale file ..." | FIXED AND VERIFIED |
| SEC-09 | Medium | Build (`compile-data.ts`) | Recursive delete of an output directory taken from an environment variable without checks | Guard: never a drive root, the repository or a folder holding it, never a non-empty folder without an earlier compile | `security:test` "refuses to wipe ..." | FIXED AND VERIFIED |
| SEC-10 | Low | Build | Contributor JSON parsed without refusing prototype keys | Build fails on `__proto__`, `constructor`, `prototype` keys | `security:test` "a source with a __proto__ key fails the compile" | FIXED AND VERIFIED |
| SEC-11 | Low | Dossier links | Link from data put in `href` without a scheme check | `safeExternalHref` (https only, no credentials) | `security:test` "external links ..." | FIXED AND VERIFIED |
| SEC-12 | Low | Preferences (`localStorage`) | Stored values merged without type checks | Restored against the defaults' types, bookmarks validated | `security:test` "stored settings ...", browser "a tampered localStorage ..." | FIXED AND VERIFIED |
| SEC-13 | Low | Search | Query length unbounded (main-thread cost) | 120 characters, 8 words | `security:test` "search cost stays bounded", browser "search input is capped" | FIXED AND VERIFIED |
| SEC-14 | Low | 3D view | WebGL context released only at garbage collection | `forceContextLoss()` on close | Browser "the 3D view releases its WebGL context and memory" | FIXED AND VERIFIED |
| SEC-15 | Low | Error screen | Raw error text and build commands shown to visitors | Production shows a heading and a Reload button, details go to the console | Browser "the error screen leaks no paths ..." | FIXED AND VERIFIED |
| SEC-16 | Low | Headers | No COEP, Origin-Agent-Cluster, site-wide CORP. Platform default `Access-Control-Allow-Origin: *` | Added from `src/security/policy.mjs` | `security:scan` | FIXED AND VERIFIED (local). Production: see verification matrix |
| SEC-17 | Info | Repository | No CI, no security policy, no automated dependency updates | CI (`npm ci`, audit, verify), CodeQL, dependency review, Dependabot, `SECURITY.md`, `security.txt` | Workflow files | FIXED (runs on the next push) |

## Process notes, stated plainly

- Before the audit mandate restricted production testing to passive checks, one run of the active scanner (about 100 requests with injection probes) went to production. Vercel's firewall answered with a challenge, no disruption was observed. The scanner now refuses active probes against any non-local host.
- One local active scan went to an unrelated application that happened to listen on port 3000 on the owner's machine. No data was changed. The scanner no longer has a default target.

## Remaining risks

- `style-src 'unsafe-inline'`: React style attributes and `next/font` need it. Styles cannot run script. ACCEPTED RISK.
- Chunks loaded later by the webpack runtime (the 3D view) are not integrity-pinned. They are same-origin, content-hashed and covered by the CSP. ACCEPTED RISK.
- HSTS preload cannot be submitted for a `vercel.app` subdomain (a custom domain would allow it).
- Denial of service against the host is a platform matter and was deliberately not tested.
- Unknown vulnerabilities in browsers, dependencies or the platform. Mitigated by the layers above and the maintenance routine.
