# Security Policy

## Supported versions

Security fixes target the `main` branch and the production deployment at
https://stride-os-livid.vercel.app.

## Reporting a vulnerability

Please **do not** open a public issue for sensitive security reports.

Prefer contacting the maintainer via WeChat **z17code**, or open a private
security advisory on GitHub if the repository has advisories enabled.

Include:

- Impact and affected endpoints (if known)
- Reproduction steps or PoC (non-destructive)
- Your contact for follow-up

## Scope notes

- Auth: scrypt passwords, HttpOnly session cookies, login lockout / rate limits
- Write APIs expect same-origin browser clients (Origin / Referer checks)
- Never commit `.env.local`, API keys, or Android keystores

## Production checklist after security-related changes

1. Merge to `main` (Vercel auto-deploys)
2. Run `npm run db:migrate` against production Neon when schema changed
3. Smoke-test login / register / reset-password
