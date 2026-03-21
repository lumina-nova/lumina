#!/usr/bin/env python3
"""
Create predictable consumer groups for Lumina UI testing.

Requires:
    python3 -m pip install kafka-python

Examples:
    python3 scripts/kafka_seed_consumer_groups.py \
      --brokers localhost:9092 \
      --topics app-logs,orders,payments

    python3 scripts/kafka_seed_consumer_groups.py \
      --brokers localhost:9092 \
      --topics app-logs,orders,payments \
      --prefix demo \
      --keep-alive-group
"""

from __future__ import annotations

import argparse
import sys
import time
import uuid
from dataclasses import dataclass

from kafka import KafkaConsumer
from kafka.errors import KafkaError


@dataclass(frozen=True)
class GroupScenario:
    suffix: str
    topics: list[str]
    max_messages: int
    description: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed Kafka consumer groups with partial committed offsets for UI testing."
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
        default="app-logs,orders,payments",
        help="Comma-separated topics already containing data.",
    )
    parser.add_argument(
        "--prefix",
        default="lumina",
        help="Prefix used for generated consumer group ids.",
    )
    parser.add_argument(
        "--poll-ms",
        type=int,
        default=1000,
        help="Kafka poll timeout in milliseconds.",
    )
    parser.add_argument(
        "--session-timeout-ms",
        type=int,
        default=10000,
        help="Kafka consumer session timeout.",
    )
    parser.add_argument(
        "--keep-alive-group",
        action="store_true",
        help="After seeding, keep one group alive for a short period so it shows as active/stable.",
    )
    parser.add_argument(
        "--keep-alive-seconds",
        type=int,
        default=45,
        help="How long to keep the active test group running.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-batch progress.",
    )
    args = parser.parse_args()
    if args.poll_ms <= 0:
        parser.error("--poll-ms must be > 0")
    if args.session_timeout_ms <= 0:
        parser.error("--session-timeout-ms must be > 0")
    if args.keep_alive_seconds <= 0:
        parser.error("--keep-alive-seconds must be > 0")
    return args


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def build_scenarios(topics: list[str], prefix: str) -> list[GroupScenario]:
    app_logs = topics[0]
    secondary = topics[1] if len(topics) > 1 else topics[0]
    tertiary = topics[2] if len(topics) > 2 else secondary

    return [
        GroupScenario(
            suffix=f"{prefix}-app-logs-partial",
            topics=[app_logs],
            max_messages=250,
            description="Partially consumed app-logs group.",
        ),
        GroupScenario(
            suffix=f"{prefix}-orders-lagging",
            topics=[secondary],
            max_messages=120,
            description="Lagging single-topic group.",
        ),
        GroupScenario(
            suffix=f"{prefix}-mixed-catchup",
            topics=[secondary, tertiary],
            max_messages=400,
            description="Multi-topic group with committed progress on two topics.",
        ),
    ]


def make_consumer(
    brokers: list[str],
    group_id: str,
    topics: list[str],
    session_timeout_ms: int,
) -> KafkaConsumer:
    consumer = KafkaConsumer(
        bootstrap_servers=brokers,
        group_id=group_id,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        session_timeout_ms=session_timeout_ms,
        consumer_timeout_ms=1000,
    )
    consumer.subscribe(topics=topics)
    return consumer


def seed_group(
    brokers: list[str],
    scenario: GroupScenario,
    poll_ms: int,
    session_timeout_ms: int,
    verbose: bool,
) -> int:
    consumer = make_consumer(
        brokers=brokers,
        group_id=scenario.suffix,
        topics=scenario.topics,
        session_timeout_ms=session_timeout_ms,
    )
    consumed = 0

    try:
        while consumed < scenario.max_messages:
            batch = consumer.poll(timeout_ms=poll_ms)
            if not batch:
                break

            batch_count = sum(len(records) for records in batch.values())
            consumed += batch_count
            consumer.commit()

            if verbose:
                print(
                    f"[{scenario.suffix}] consumed {batch_count} records "
                    f"(total {min(consumed, scenario.max_messages)}/{scenario.max_messages})"
                )

            if consumed >= scenario.max_messages:
                break
    finally:
        consumer.close()

    return min(consumed, scenario.max_messages)


def keep_group_alive(
    brokers: list[str],
    scenario: GroupScenario,
    poll_ms: int,
    session_timeout_ms: int,
    keep_alive_seconds: int,
) -> None:
    group_id = f"{scenario.suffix}-active"
    consumer = make_consumer(
        brokers=brokers,
        group_id=group_id,
        topics=scenario.topics,
        session_timeout_ms=session_timeout_ms,
    )

    deadline = time.time() + keep_alive_seconds
    print(f"[{group_id}] staying active for {keep_alive_seconds}s")
    try:
        while time.time() < deadline:
            batch = consumer.poll(timeout_ms=poll_ms)
            if batch:
                consumer.commit()
    finally:
        consumer.close()


def main() -> int:
    args = parse_args()
    brokers = split_csv(args.brokers)
    topics = split_csv(args.topics)

    if not brokers:
      print("No brokers provided.", file=sys.stderr)
      return 1
    if not topics:
      print("No topics provided.", file=sys.stderr)
      return 1

    scenarios = build_scenarios(topics, args.prefix)
    print(f"Using brokers: {', '.join(brokers)}")
    print(f"Using topics: {', '.join(topics)}")

    for scenario in scenarios:
        print(f"\nSeeding {scenario.suffix}")
        print(f"  topics: {', '.join(scenario.topics)}")
        print(f"  target messages: {scenario.max_messages}")
        consumed = seed_group(
            brokers=brokers,
            scenario=scenario,
            poll_ms=args.poll_ms,
            session_timeout_ms=args.session_timeout_ms,
            verbose=args.verbose,
        )
        print(f"  committed messages: {consumed}")
        print(f"  note: {scenario.description}")

    if args.keep_alive_group:
        keep_group_alive(
            brokers=brokers,
            scenario=scenarios[0],
            poll_ms=args.poll_ms,
            session_timeout_ms=args.session_timeout_ms,
            keep_alive_seconds=args.keep_alive_seconds,
        )

    print("\nCreated consumer groups:")
    for scenario in scenarios:
        print(f"  {scenario.suffix}")
    if args.keep_alive_group:
        print(f"  {scenarios[0].suffix}-active")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KafkaError as error:
        print(f"Kafka error: {error}", file=sys.stderr)
        raise SystemExit(1)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        raise SystemExit(130)
