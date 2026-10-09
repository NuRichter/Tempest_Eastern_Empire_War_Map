# Security policy

The Tensura War Map is a static fan project. It has no accounts, no server API and stores nothing about visitors.

## Reporting a vulnerability

Please report privately through GitHub: **Security, Report a vulnerability** on this repository
(<https://github.com/NuRichter/Tempest_Eastern_Empire_War_Map/security/advisories/new>). Do not open a public issue for an unfixed problem.

Please test only against a local build (`npm run build && npm start`). Do not run scanners, fuzzers or load tests against the deployed site.

## Supported version

Only the current `main` branch and its deployment at <https://tempestwar.vercel.app> are maintained.

## How the site is hardened

See [docs/security/AUDIT-REPORT.md](docs/security/AUDIT-REPORT.md), [THREAT-MODEL.md](docs/security/THREAT-MODEL.md) and [MAINTENANCE.md](docs/security/MAINTENANCE.md).
