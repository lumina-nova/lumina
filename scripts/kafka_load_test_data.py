#!/usr/bin/env python3
"""
Seed Kafka with mixed-format test data for Lumina manual testing.

Requires:
    pip install kafka-python

Examples:
    python3 scripts/kafka_load_test_data.py \
      --brokers kafka:9092 \
      --topics orders,payments,logs \
      --partitions 6 \
      --messages-per-topic 1500 \
      --producer-workers 4

    python3 scripts/kafka_load_test_data.py \
      --brokers kafka:9092 \
      --topics orders,payments \
      --partitions 3 \
      --messages-per-topic 1000 \
      --consumer-workers 2
"""

from __future__ import annotations

import argparse
import base64
import csv
import io
import json
import random
import string
import sys
import threading
import time
import uuid
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Iterable

from kafka import KafkaConsumer, KafkaProducer
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import KafkaError, NoBrokersAvailable, NodeNotReadyError, TopicAlreadyExistsError


FORMAT_JSON = "application/json"
FORMAT_TEXT = "text/plain"
FORMAT_CSV = "text/csv"
FORMAT_BINARY = "application/octet-stream"


@dataclass(frozen=True)
class TopicPlan:
    name: str
    message_count: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create topics and load mixed-format test messages into Kafka."
    )
    parser.add_argument(
        "--brokers",
        default="localhost:9092",
        help=(
            "Comma-separated Kafka bootstrap brokers. "
            "Use localhost:9092 from your terminal against the default docker-compose setup, "
            "or kafka:19092 from another container on the same Docker network."
        ),
    )
    parser.add_argument(
        "--topics",
        default="orders,payments,app-logs",
        help="Comma-separated topic names to create and populate.",
    )
    parser.add_argument(
        "--partitions",
        type=int,
        default=6,
        help="Partition count per topic.",
    )
    parser.add_argument(
        "--replication-factor",
        type=int,
        default=1,
        help="Replication factor for new topics.",
    )
    parser.add_argument(
        "--messages-per-topic",
        type=int,
        default=1500,
        help="How many messages to publish to each topic.",
    )
    parser.add_argument(
        "--producer-workers",
        type=int,
        default=4,
        help="Concurrent producer threads.",
    )
    parser.add_argument(
        "--consumer-workers",
        type=int,
        default=0,
        help="Optional consumer threads to verify message flow after seeding.",
    )
    parser.add_argument(
        "--linger-ms",
        type=int,
        default=10,
        help="Kafka producer linger_ms.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32768,
        help="Kafka producer batch_size.",
    )
    parser.add_argument(
        "--max-wait-seconds",
        type=int,
        default=20,
        help="How long the optional consumer verification waits before timing out.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for repeatable payload generation.",
    )
    args = parser.parse_args()

    if args.partitions <= 0:
        parser.error("--partitions must be > 0")
    if args.replication_factor <= 0:
        parser.error("--replication-factor must be > 0")
    if args.messages_per_topic <= 0:
        parser.error("--messages-per-topic must be > 0")
    if args.producer_workers <= 0:
        parser.error("--producer-workers must be > 0")
    if args.consumer_workers < 0:
        parser.error("--consumer-workers must be >= 0")
    return args


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def broker_usage_hint(brokers: list[str]) -> str:
    joined = ", ".join(brokers)

    if any("localhost:" in broker or "127.0.0.1:" in broker for broker in brokers):
        return (
            "You are using a host-local bootstrap address. This only works if Kafka "
            "also advertises a host-reachable listener such as localhost:19092."
        )

    if any(broker.startswith("kafka:") or broker.endswith(".internal:9092") for broker in brokers):
        return (
            "You are using a container/Docker-network bootstrap address. This works "
            "only from another container on the same Docker network."
        )

    return (
        f"Kafka clients use {joined} only for bootstrap. After that, the broker must "
        "advertise addresses reachable from where this script is running."
    )


def print_connection_help(error: Exception, brokers: list[str]) -> None:
    print(f"Kafka error: {error}", file=sys.stderr)
    print("", file=sys.stderr)
    print("Connection hint:", file=sys.stderr)
    print(f"  {broker_usage_hint(brokers)}", file=sys.stderr)
    print("", file=sys.stderr)
    print("Common working setups:", file=sys.stderr)
    print("  Host terminal -> Docker Kafka: use a host listener like localhost:19092", file=sys.stderr)
    print("  Docker container -> Docker Kafka on same network: use kafka:9092", file=sys.stderr)
    print("", file=sys.stderr)
    print("Important:", file=sys.stderr)
    print(
        "  The bootstrap broker you pass is not enough by itself. Kafka must advertise",
        file=sys.stderr,
    )
    print(
        "  broker addresses that are reachable from this script's network location.",
        file=sys.stderr,
    )


def ensure_topics(
    brokers: list[str], topics: list[str], partitions: int, replication_factor: int
) -> None:
    admin = KafkaAdminClient(bootstrap_servers=brokers)
    try:
        existing = set(admin.list_topics())
        missing = [topic for topic in topics if topic not in existing]
        if not missing:
            print(f"Topics already exist: {', '.join(topics)}")
            return

        new_topics = [
            NewTopic(
                name=topic,
                num_partitions=partitions,
                replication_factor=replication_factor,
            )
            for topic in missing
        ]
        try:
            admin.create_topics(new_topics=new_topics, validate_only=False)
            print(
                "Created topics: "
                + ", ".join(
                    f"{topic}({partitions} partitions, rf={replication_factor})"
                    for topic in missing
                )
            )
        except TopicAlreadyExistsError:
            print("One or more topics were created concurrently. Continuing.")
    finally:
        admin.close()


def make_producer(brokers: list[str], linger_ms: int, batch_size: int) -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=brokers,
        acks="all",
        retries=10,
        linger_ms=linger_ms,
        batch_size=batch_size,
        compression_type="gzip",
        key_serializer=lambda value: value.encode("utf-8"),
    )


def generate_json_payload(topic: str, index: int, rng: random.Random) -> tuple[bytes, list[tuple[str, bytes]]]:
    payload = {
        "eventId": str(uuid.uuid4()),
        "topic": topic,
        "eventType": rng.choice(["created", "updated", "deleted", "processed"]),
        "customerId": f"cust-{rng.randint(1000, 9999)}",
        "amount": round(rng.uniform(10, 5000), 2),
        "currency": rng.choice(["USD", "EUR", "INR", "GBP"]),
        "sequence": index,
        "createdAt": datetime.now(UTC).isoformat(),
    }
    return json.dumps(payload, separators=(",", ":")).encode("utf-8"), [
        ("content-type", FORMAT_JSON.encode("utf-8")),
        ("payload-format", b"json"),
    ]


def generate_text_payload(topic: str, index: int, rng: random.Random) -> tuple[bytes, list[tuple[str, bytes]]]:
    level = rng.choice(["INFO", "WARN", "ERROR", "DEBUG"])
    message = (
        f"{level} service={topic} seq={index} "
        f"request_id={uuid.uuid4()} latency_ms={rng.randint(5, 900)}"
    )
    return message.encode("utf-8"), [
        ("content-type", FORMAT_TEXT.encode("utf-8")),
        ("payload-format", b"text"),
    ]


def generate_csv_payload(topic: str, index: int, rng: random.Random) -> tuple[bytes, list[tuple[str, bytes]]]:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            topic,
            index,
            rng.choice(["queued", "running", "done", "failed"]),
            rng.randint(1, 100),
            datetime.now(UTC).isoformat(),
        ]
    )
    return buffer.getvalue().strip().encode("utf-8"), [
        ("content-type", FORMAT_CSV.encode("utf-8")),
        ("payload-format", b"csv"),
    ]


def generate_binary_payload(topic: str, index: int, rng: random.Random) -> tuple[bytes, list[tuple[str, bytes]]]:
    raw = bytes(rng.getrandbits(8) for _ in range(48))
    prefix = f"{topic}:{index}:".encode("utf-8")
    payload = prefix + base64.b64encode(raw)
    return payload, [
        ("content-type", FORMAT_BINARY.encode("utf-8")),
        ("payload-format", b"binary"),
    ]


def generate_message(topic: str, index: int, seed: int) -> tuple[str, bytes, list[tuple[str, bytes]]]:
    rng = random.Random((seed * 10_000_019) + index)
    format_name = rng.choice(["json", "text", "csv", "binary"])
    key = f"{topic}-key-{index % 250}"

    if format_name == "json":
        value, headers = generate_json_payload(topic, index, rng)
    elif format_name == "text":
        value, headers = generate_text_payload(topic, index, rng)
    elif format_name == "csv":
        value, headers = generate_csv_payload(topic, index, rng)
    else:
        value, headers = generate_binary_payload(topic, index, rng)

    headers.extend(
        [
            ("producer-seed", str(seed).encode("utf-8")),
            ("message-index", str(index).encode("utf-8")),
        ]
    )
    return key, value, headers


def build_topic_plans(topics: Iterable[str], messages_per_topic: int) -> list[TopicPlan]:
    return [TopicPlan(name=topic, message_count=messages_per_topic) for topic in topics]


def produce_topic_range(
    brokers: list[str],
    topic: str,
    start_index: int,
    end_index: int,
    seed: int,
    linger_ms: int,
    batch_size: int,
) -> Counter:
    producer = make_producer(brokers, linger_ms, batch_size)
    counter: Counter = Counter()

    try:
        futures = []
        for index in range(start_index, end_index):
            key, value, headers = generate_message(topic, index, seed)
            payload_format = next(header_value for header_key, header_value in headers if header_key == "payload-format")
            counter[payload_format.decode("utf-8")] += 1
            futures.append(
                producer.send(
                    topic,
                    key=key,
                    value=value,
                    headers=headers,
                )
            )

        for future in futures:
            future.get(timeout=30)

        producer.flush()
        return counter
    finally:
        producer.close()


def chunk_ranges(total: int, chunks: int) -> list[tuple[int, int]]:
    chunks = max(1, min(total, chunks))
    base = total // chunks
    remainder = total % chunks
    ranges: list[tuple[int, int]] = []
    start = 0
    for index in range(chunks):
        size = base + (1 if index < remainder else 0)
        end = start + size
        if start != end:
            ranges.append((start, end))
        start = end
    return ranges


def produce_all_topics(
    brokers: list[str],
    plans: list[TopicPlan],
    producer_workers: int,
    linger_ms: int,
    batch_size: int,
    seed: int,
) -> dict[str, Counter]:
    results: dict[str, Counter] = defaultdict(Counter)

    with ThreadPoolExecutor(max_workers=producer_workers) as executor:
        future_map = {}
        for topic_number, plan in enumerate(plans):
            ranges = chunk_ranges(plan.message_count, producer_workers)
            for start_index, end_index in ranges:
                future = executor.submit(
                    produce_topic_range,
                    brokers,
                    plan.name,
                    start_index,
                    end_index,
                    seed + topic_number,
                    linger_ms,
                    batch_size,
                )
                future_map[future] = plan.name

        for future in as_completed(future_map):
            topic = future_map[future]
            results[topic].update(future.result())

    return results


def consume_worker(
    brokers: list[str],
    topics: list[str],
    group_id: str,
    max_wait_seconds: int,
    stop_event: threading.Event,
    totals: Counter,
    lock: threading.Lock,
) -> None:
    consumer = KafkaConsumer(
        *topics,
        bootstrap_servers=brokers,
        group_id=group_id,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        consumer_timeout_ms=1000,
        value_deserializer=lambda value: value,
        key_deserializer=lambda value: value.decode("utf-8") if value is not None else None,
    )

    deadline = time.time() + max_wait_seconds
    try:
        while time.time() < deadline and not stop_event.is_set():
            batch = consumer.poll(timeout_ms=1000)
            if not batch:
                continue
            with lock:
                for topic_partitions in batch.values():
                    totals["records"] += len(topic_partitions)
    finally:
        consumer.close()


def verify_with_consumers(
    brokers: list[str],
    topics: list[str],
    worker_count: int,
    max_wait_seconds: int,
) -> int:
    stop_event = threading.Event()
    totals: Counter = Counter()
    lock = threading.Lock()
    threads = []
    group_id = f"lumina-seed-check-{uuid.uuid4()}"

    for index in range(worker_count):
        thread = threading.Thread(
            target=consume_worker,
            kwargs={
                "brokers": brokers,
                "topics": topics,
                "group_id": group_id,
                "max_wait_seconds": max_wait_seconds,
                "stop_event": stop_event,
                "totals": totals,
                "lock": lock,
            },
            daemon=True,
        )
        thread.start()
        threads.append(thread)

    for thread in threads:
        thread.join()

    return totals["records"]


def print_summary(format_counts: dict[str, Counter], plans: list[TopicPlan]) -> None:
    total_messages = sum(plan.message_count for plan in plans)
    print("\nSeed summary")
    print(f"  topics: {', '.join(plan.name for plan in plans)}")
    print(f"  total messages: {total_messages}")
    for plan in plans:
        counts = format_counts[plan.name]
        print(
            f"  {plan.name}: {plan.message_count} messages "
            f"(json={counts['json']}, text={counts['text']}, csv={counts['csv']}, binary={counts['binary']})"
        )


def main() -> int:
    args = parse_args()
    random.seed(args.seed)

    brokers = split_csv(args.brokers)
    topics = split_csv(args.topics)
    if not brokers:
        print("No brokers provided.", file=sys.stderr)
        return 1
    if not topics:
        print("No topics provided.", file=sys.stderr)
        return 1

    plans = build_topic_plans(topics, args.messages_per_topic)

    try:
        print(f"Using brokers: {', '.join(brokers)}")
        ensure_topics(brokers, topics, args.partitions, args.replication_factor)

        started_at = time.time()
        format_counts = produce_all_topics(
            brokers=brokers,
            plans=plans,
            producer_workers=args.producer_workers,
            linger_ms=args.linger_ms,
            batch_size=args.batch_size,
            seed=args.seed,
        )
        elapsed = time.time() - started_at

        print_summary(format_counts, plans)
        print(f"Publish time: {elapsed:.2f}s")

        if args.consumer_workers > 0:
            consumed = verify_with_consumers(
                brokers=brokers,
                topics=topics,
                worker_count=args.consumer_workers,
                max_wait_seconds=args.max_wait_seconds,
            )
            print(f"Consumer verification observed {consumed} records across {args.consumer_workers} workers.")
    except (NoBrokersAvailable, NodeNotReadyError, KafkaError) as error:
        print_connection_help(error, brokers)
        return 1

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        raise SystemExit(130)
