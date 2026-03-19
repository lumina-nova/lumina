# LuminaKafka

LuminaKafka is a read-only Kafka inspection UI with a Go backend and a Next.js frontend.

Current MVP scope:
- browse brokers, topics, and consumer groups
- inspect topic partitions and bounded message slices
- browse by `latest`, `earliest`, `offset`, or `timestamp`
- inspect consumer-group members and lag

Out of scope for the current MVP:
- live tailing / streaming
- topic or consumer-group mutations
- authentication / authorization
- multi-cluster management

## Stack

- Backend: Go + `franz-go`
- Frontend: Next.js + React + TypeScript + Tailwind CSS

## Local Run

Prerequisites:
- Go 1.25+
- Node.js 20+
- `pnpm`
- a reachable Kafka cluster

Environment:

```bash
export KAFKA_BROKERS=localhost:9092
```

Start the backend:

```bash
go run cmd/luminakafka/main.go
```

Backend listens on `http://127.0.0.1:9099`.

Start the frontend:

```bash
cd web
pnpm install
pnpm dev
```

Frontend runs on `http://localhost:3000`.

The frontend talks to the backend through `INTERNAL_API_BASE_URL`, which defaults to `http://127.0.0.1:9099`. You only need to override it if your backend is running somewhere else.

## API Surface

Current backend endpoints:
- `GET /health`
- `GET /api/brokers`
- `GET /api/topics`
- `GET /api/topics/{name}`
- `GET /api/topics/{name}/messages`
- `GET /api/consumer-groups`
- `GET /api/consumer-groups/{name}`

## Test Data

Seed topic data:

```bash
python3 -m pip install kafka-python

python3 scripts/kafka_load_test_data.py \
  --brokers localhost:9092 \
  --topics app-logs,orders,payments \
  --partitions 6 \
  --messages-per-topic 1500 \
  --producer-workers 4
```

Seed consumer groups:

```bash
python3 scripts/kafka_seed_consumer_groups.py \
  --brokers localhost:9092 \
  --topics app-logs,orders,payments
```

Keep one seeded group active for UI testing:

```bash
python3 scripts/kafka_seed_consumer_groups.py \
  --brokers localhost:9092 \
  --topics app-logs,orders,payments \
  --keep-alive-group
```

## Verification

Backend tests:

```bash
env GOCACHE=$PWD/.gocache go test ./...
```

Frontend lint:

```bash
cd web
pnpm lint
```

## Repo Layout

- `cmd/luminakafka/`: backend entrypoint
- `internal/kafka/`: Kafka access layer
- `internal/api/http/`: HTTP handlers and routes
- `web/`: Next.js frontend
- `scripts/`: local Kafka test-data utilities

## License

Apache 2.0
