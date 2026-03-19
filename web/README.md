# LuminaKafka Frontend

This is the Next.js frontend for LuminaKafka.

## Run

From the `web/` directory:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Backend Connection

The frontend calls the Go backend through `INTERNAL_API_BASE_URL`.

Default:

```bash
INTERNAL_API_BASE_URL=http://127.0.0.1:9099
```

If your backend is running at that address, no extra setup is required.

Example override:

```bash
INTERNAL_API_BASE_URL=http://127.0.0.1:9099 pnpm dev
```

## Current Frontend Scope

- topics list
- topic detail
- bounded message browsing
- brokers page
- consumer-groups list and detail
- theme switching

## Checks

Lint:

```bash
pnpm lint
```
