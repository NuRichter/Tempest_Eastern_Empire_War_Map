# Security maintenance

How to keep the site hardened while it grows.

## Where things live

| What | File |
|---|---|
| CSP and response headers (one source) | `src/security/policy.mjs` |
| Trusted Types default policy | `src/security/trusted-types.ts` |
| Input validation (URL, links, stored settings) | `src/security/input.ts` |
| Verified fetch and safe JSON | `src/security/fetch.ts` |
| Data hashes (generated, do not edit) | `src/security/integrity.generated.json` |
| Inline script hashes and script integrity (post-build) | `scripts/security/harden-build.mts` |
| Static rules for new code | `scripts/security/lint.mts` |
| Regression tests | `scripts/security/test.mts`, `scripts/security/browser.mts` |
| Header and injection scanner | `scripts/security/scan.mts` |

## Adding features safely

- **New JSON file** under `public/data`, `public/locales` or `public/maps`: load it with `fetchVerified`. It is hashed automatically at build time.
- **New image, audio or font** in `public/`: nothing to do, same-origin is allowed.
- **New outside service or CDN**: add its exact origin to the one CSP directive that needs it in `policy.mjs`. Never a wildcard. Never `script-src` without an integrity hash.
- **New URL parameter**: parse it with `intParam`, `enumParam` or `idParam`.
- **Link built from data**: pass it through `safeExternalHref`.
- **Rendering text**: through React. Never `dangerouslySetInnerHTML`, `innerHTML` or MapLibre `setHTML` (the lint and Trusted Types will stop it).
- **New inline script** in the layout: it is hashed automatically after the build. Keep it a constant string.

## Before every deployment

```bash
npm run verify            # data, lint, security lint, types, i18n, tests, security tests, build
npm run qa                # browser QA
npm run security:browser  # browser security tests (local build)
npm run security:scan -- http://127.0.0.1:<port>   # with `npm start -- -p <port>` running
```

After deploying, a passive check only (a handful of GET and HEAD requests):

```bash
npm run security:scan -- https://tempestwar.vercel.app
```

Never point active tests or load tests at production or at shared hosting.

## Dependencies

- Weekly: review Dependabot pull requests. Minor and patch updates come grouped, majors one at a time.
- A major upgrade needs its changelog read, `npm run verify`, `npm run qa` and `npm run security:browser` green before merging. (MapLibre 6 is the example: it was tried and rolled back because its worker does not load under the Next build.)
- Never `npm audit fix --force`.
- `npm run security:audit` must stay clean for runtime dependencies. Dev-only findings are listed in the audit report with their reason.

## When a new advisory or finding appears

1. Check whether the vulnerable code path is reachable in this app.
2. Patch with the smallest compatible version, or add a compensating control and a lint or test that keeps the path closed.
3. Add a regression test next to the finding in `scripts/security/test.mts` or `browser.mts`.
4. Record it in `docs/security/AUDIT-REPORT.md` and the verification matrix.
5. Reports from others arrive through GitHub private vulnerability reporting (see `SECURITY.md`). Do not discuss unfixed details in public issues.

## Hosting and domain changes

- A new domain or alias: update `SITE_URL` (`src/app/site.ts`), the `Access-Control-Allow-Origin` value in `policy.mjs`, `security.txt` and the canonical URL, then run the passive scan.
- Changing Vercel settings or environment variables: rerun the passive scan afterwards. Secrets never go in `NEXT_PUBLIC_*` variables (they are shipped to the browser).

## After an incident

1. Roll back in Vercel to the last good deployment (Deployments, Promote).
2. Rotate any credential that might be involved (Vercel, GitHub, Google Search Console).
3. Find the cause from the commit history and CI logs, fix it with a regression test, redeploy, and run the passive scan.
4. Write down what happened in the audit report.

## After big changes

Rerun the full list in "Before every deployment", then review the threat model: a new server feature (an API route, middleware, a form) changes the architecture and needs its own review (rate limits, input validation on the server, secrets handling).
