# Threat model

Audit date 9 October 2026. Audited commit `334aac7` plus the hardening in this change.

## Architecture as built

The application is a **static site**. `next build` prerenders every route (`/`, `/_not-found`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`). There is no middleware, no route handler, no server action, no API, no database, no authentication, no cookie and no secret at runtime. Evidence: the build route table lists only static (`○`) routes, and `src/` contains no `route.ts`, `middleware.ts` or `'use server'`.

All behaviour runs in the visitor's browser: React UI, MapLibre map, a three.js 3D view, Canvas overlays, Web Audio playback. Runtime data is static JSON under `public/` (dataset, locales, coastline), compiled at build time from `data-source/` by `scripts/compile-data.ts` and `scripts/compile-front.ts`. Vercel serves the output from its CDN.

## Assets

| Asset | Why it matters |
|---|---|
| Visitor's browser session on the site | Code running in it could deface the page, phish, or mine resources |
| Integrity of the published dataset | The project's value is a sourced, labelled record |
| Build machine and repository | A compromised build ships code to every visitor |
| Deployment configuration (Vercel project, env vars) | Controls what is served and with which headers |
| Art, maps and music files | Third-party material, not for re-hosting by others |

## Trust boundaries and attacker capabilities

| # | Boundary | Attacker can | Controls |
|---|---|---|---|
| 1 | Internet to browser | Send links, frame the site, run other sites in the same browser | CSP (hashed inline scripts, no eval, Trusted Types), `frame-ancestors 'none'`, COOP, COEP, CORP, `nosniff` |
| 2 | Query parameters and deep links | Craft `?frame=`, `?event=`, `?view=` and selection ids | `src/security/input.ts` (range, enum and id validation), React text rendering |
| 3 | React and the DOM | Reach an HTML or script sink with a string | No HTML sinks in app code (`security:lint`), Trusted Types default policy refuses HTML and script strings |
| 4 | Runtime JSON in `public/` | Alter a file between build and browser (CDN, proxy, extension) | SHA-256 Subresource Integrity on every JSON fetch, fail-closed JSON parse |
| 5 | Sources in `data-source/` | Submit a pull request with hostile or malformed data | Build fails on malformed JSON or prototype keys, `validate-data`, review, CI |
| 6 | Dependencies | Ship a vulnerable or malicious version | Lockfile + `npm ci`, `npm audit`, dependency review on PRs, weekly manual update check, CodeQL |
| 7 | Build machine and CI | Abuse CI permissions or a third-party action | Read-only `GITHUB_TOKEN`, no secrets in CI, actions pinned to commit SHAs, `persist-credentials: false` |
| 8 | Hosting configuration | Weaken headers or caching | Headers generated from one policy module, checked by `security:scan` (passive on production) |
| 9 | Browser APIs, WebGL, Canvas | Exhaust GPU or memory | Bounded inputs, context released on close, rendering paused in hidden tabs |
| 10 | External links | Lure visitors to a hostile page | `https:` only links from data, `rel="noopener noreferrer"` |

## Scenarios, ranked

1. **Script injection in the browser** (XSS through a deep link, search, data or a library). High impact, now low likelihood: no app HTML sinks, CSP without `unsafe-inline` or `unsafe-eval` for scripts, Trusted Types.
2. **Supply chain** (a vulnerable or malicious dependency or CI action). High impact. Controls: audit gates, pinned actions, least privilege, weekly manual update check, CodeQL. Residual: a zero-day in a dependency is not preventable, only containable (CSP and Trusted Types limit what injected code can do).
3. **Tampered data** in transit or through a pull request. Medium impact (misinformation). Controls: SRI on fetch, build validation, review.
4. **Clickjacking and cross-site embedding.** Low impact. Controls: `frame-ancestors 'none'`, `X-Frame-Options`, CORP.
5. **Resource exhaustion in the visitor's own tab** (huge input, repeated 3D toggles). Low impact. Controls: input caps, WebGL context release.
6. **Volumetric attack on the host.** Out of the project's control and out of test scope. Vercel's platform mitigation applies (observed: its firewall challenged an automated probe during this audit).

## Not applicable, with evidence

SQL injection, NoSQL injection, SSRF, server-side template injection, XML external entities, command injection from user input, session fixation, CSRF, authentication bypass and HTTP response header injection from application code do not apply: there is no server-side code path that takes request input (see Architecture). `sitemap.xml` and `robots.txt` are generated once at build time from constants. The `xlsx` workbook parser named in older notes is not installed (`npm ls xlsx` is empty): the pipeline reads JSON only.
