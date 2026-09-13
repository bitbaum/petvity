# Petvity

Global pet care platform — owners manage multi-species pet profiles, track physical and
emotional health KPIs, connect with vets and sitters, access a marketplace, and list pets
for cross-border adoption. Built with Next.js 16 (App Router), TypeScript, Tailwind v4,
Drizzle ORM, and self-hosted PostgreSQL 17.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, conventions, and runbook.

## Getting Started

```bash
pnpm install
pnpm dev          # local dev at http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in the values (`DATABASE_URL`, `NEXTAUTH_SECRET`, etc.).

## Common commands

```bash
pnpm build        # production build (standalone output) — must pass before every push
pnpm lint         # eslint
pnpm test         # vitest unit tests
pnpm db:push      # push schema changes to Postgres
pnpm db:studio    # Drizzle Studio (visual DB explorer)
```

## Deployment

Petvity is self-hosted on the Hetzner box `bitbaum` (service `petvity-app`, behind Caddy
auto-TLS) at https://petvity.orangecat.ch, backed by self-hosted PostgreSQL 17.

Merging to `main` deploys automatically: `.github/workflows/deploy.yml` calls
loki's reusable `selfhost-deploy.yml` workflow, which waits for the commit's
own CI to go green before anything reaches the box.

```bash
# manual fallback, from the loki repo's scripts/hetzner/ — builds standalone,
# rsyncs to the box, restarts the systemd service, and health-checks
scripts/hetzner/deploy.sh petvity
```
