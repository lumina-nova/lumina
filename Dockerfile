# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS web-deps
WORKDIR /app/web
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-bookworm-slim AS web-builder
WORKDIR /app/web
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=web-deps /app/web/node_modules ./node_modules
COPY web ./
RUN corepack enable && pnpm build

FROM --platform=$BUILDPLATFORM golang:1.25-bookworm AS go-builder
WORKDIR /app
ARG TARGETOS=linux
ARG TARGETARCH
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /out/luminakafka ./cmd/luminakafka

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV INTERNAL_API_BASE_URL=http://127.0.0.1:9099
ENV PORT=3000

COPY --from=go-builder /out/luminakafka /app/luminakafka
COPY --from=web-builder /app/web/.next/standalone /app/web
COPY --from=web-builder /app/web/.next/static /app/web/.next/static
COPY --from=web-builder /app/web/public /app/web/public
COPY scripts/start-container.sh /app/start-container.sh

RUN chmod +x /app/start-container.sh

EXPOSE 3000

CMD ["/app/start-container.sh"]
