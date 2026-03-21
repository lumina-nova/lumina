# LuminaKafka

LuminaKafka is a read-only Kafka inspection UI. It gives you a browser for brokers, topics, partitions, messages, and consumer groups through a Go backend and a Next.js frontend.

Current MVP scope:
- browse brokers, topics, and consumer groups
- inspect topic partitions and bounded message slices
- browse by `latest`, `earliest`, `offset`, or `timestamp`
- inspect consumer-group lag, members, and partition progress

Out of scope for the current MVP:
- live tailing / streaming
- topic or consumer-group mutations
- authentication / authorization
- multi-cluster management

## Quick Start

Prerequisites:
- Docker
- a reachable Kafka cluster

Build the image:

```bash
docker build -t luminakafka/lumina:0.1.0 .
```

Run it:

```bash
docker run -p 3000:3000 \
  -e KAFKA_BROKERS=<your-bootstrap-brokers> \
  luminakafka/lumina:0.1.0
```

Open `http://localhost:3000`.

Example:

```bash
docker run -p 3000:3000 \
  -e KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092 \
  luminakafka/lumina:0.1.0
```

Required runtime input:
- `KAFKA_BROKERS`

Optional runtime input:
- `PORT` defaults to `3000`

## Kafka Connectivity

`KAFKA_BROKERS` is only the bootstrap broker list. Kafka clients use it to fetch cluster metadata, then they reconnect to the broker addresses advertised by Kafka.

That means Lumina will only work if:
- the bootstrap brokers are reachable from the Lumina container
- Kafka advertises broker addresses that are also reachable from the Lumina container

Common cases:

1. Kafka is running in Docker on the same Docker network as Lumina

Use the Kafka container or service hostnames, for example:

```bash
docker run --network my-kafka-net -p 3000:3000 \
  -e KAFKA_BROKERS=kafka:19092 \
  luminakafka/lumina:0.1.0
```

2. Kafka is running on the host machine

Use a host-reachable listener that the container can access. On macOS this is often:

```bash
docker run -p 3000:3000 \
  -e KAFKA_BROKERS=host.docker.internal:9092 \
  luminakafka/lumina:0.1.0
```

3. Kafka is remote

Use the real broker list:

```bash
docker run -p 3000:3000 \
  -e KAFKA_BROKERS=broker1.company.net:9092,broker2.company.net:9092 \
  luminakafka/lumina:0.1.0
```

## Local Docker Demo

For a local single-broker demo, use the root compose file:

```bash
docker compose down -v
docker compose up --build
```

This starts:
- Kafka for local testing
- Lumina on `http://localhost:3000`

In this setup:
- Lumina uses `kafka:19092` internally
- host-side tools use `localhost:9092`

## Local Multi-Broker Demo

For a local three-broker test cluster, use:

```bash
docker compose -f scripts/docker-compose.multi-broker.yml down -v
docker compose -f scripts/docker-compose.multi-broker.yml up --build
```

This starts:
- a three-broker Kafka cluster
- Lumina on `http://localhost:3001`

In this setup:
- Lumina uses `kafka-1:19092,kafka-2:19092,kafka-3:19092`
- host-side tools use `localhost:29092,localhost:39092,localhost:49092`

## Seed Test Data

If you want realistic demo data for the UI, create a virtualenv first:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install kafka-python
```

### Single-broker seed

Load topic data:

```bash
python3 scripts/kafka_load_test_data.py --brokers localhost:9092
```

Create consumer groups:

```bash
python3 scripts/kafka_seed_consumer_groups.py \
  --brokers localhost:9092 \
  --topics app-logs,orders,payments
```

### Full UI fixture

This is the most useful seeding path for manual testing. It creates:
- multiple topics
- multiple partition counts
- an empty topic
- idle consumer groups
- lagging consumer groups
- active consumer groups

Single-broker:

```bash
python3 scripts/kafka_seed_ui_fixture.py --brokers localhost:9092
```

Multi-broker:

```bash
python3 scripts/kafka_seed_ui_fixture.py \
  --brokers localhost:29092,localhost:39092,localhost:49092 \
  --expected-broker-count 3
```

## Local Development

Prerequisites:
- Go 1.25+
- Node.js 20+
- `pnpm`
- a reachable Kafka cluster

Set Kafka brokers:

```bash
export KAFKA_BROKERS=localhost:9092
```

Start the backend:

```bash
go run cmd/luminakafka/main.go
```

The backend listens on `http://127.0.0.1:9099`.

Start the frontend:

```bash
cd web
pnpm install
pnpm dev
```

The frontend runs on `http://localhost:3000`.

The frontend talks to the backend through `INTERNAL_API_BASE_URL`, which defaults to `http://127.0.0.1:9099`.

## API Surface

Current backend endpoints:
- `GET /health`
- `GET /api/brokers`
- `GET /api/topics`
- `GET /api/topics/{name}`
- `GET /api/topics/{name}/messages`
- `GET /api/consumer-groups`
- `GET /api/consumer-groups/{name}`

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
- `scripts/`: Docker test stacks and Kafka test-data utilities

## License

Apache 2.0
