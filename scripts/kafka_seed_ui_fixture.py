#!/usr/bin/env python3
"""
Seed a Kafka cluster with UI fixture data for Lumina.

What it does:
- creates a useful set of topics with varied partition counts
- loads mixed-format records into most topics
- leaves one topic empty for empty-state testing
- creates consumer groups in different states:
  - idle with lag
  - idle and caught up
  - active single-member
  - active multi-member
  - active group on an empty topic

What it does not do:
- create brokers

Brokers must already exist in the target Kafka cluster. If you want multiple
brokers to appear in the UI, point this script at an existing multi-broker
cluster.

Requires:
    python3 -m pip install kafka-python

Examples:
    python3 scripts/kafka_seed_ui_fixture.py --brokers localhost:9092

    python3 scripts/kafka_seed_ui_fixture.py \
      --brokers localhost:9092 \
      --prefix demo \
      --keep-alive-seconds 180
"""

from __future__ import annotations

import argparse
import sys
import threading
import time
from dataclasses import dataclass

from kafka import KafkaConsumer
from kafka.admin import KafkaAdminClient
from kafka.errors import KafkaError

import kafka_load_test_data as load_test_data


@dataclass(frozen=True)
class TopicFixture:
    name: str
    partitions: int
    message_count: int
    note: str


TOPIC_FIXTURES = [
    TopicFixture("app-logs", 6, 2000, "High-volume log stream."),
    TopicFixture("orders", 6, 1600, "Operational events."),
    TopicFixture("payments", 4, 1200, "Mixed business payloads."),
    TopicFixture("audit-events", 3, 600, "Lower-volume audit trail."),
    TopicFixture("dead-letter", 2, 180, "Sparse failure topic."),
    TopicFixture("empty-topic", 1, 0, "Intentional empty topic."),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed Kafka with topics and consumer groups that exercise Lumina UI states."
    )
    parser.add_argument(
        "--brokers",
        default="localhost:9092",
        help=(
            "Comma-separated Kafka bootstrap brokers. Use a listener reachable from where "
            "this script is running."
        ),
    )
    parser.add_argument(
        "--prefix",
        default="lumina",
        help="Prefix used for generated consumer group ids.",
    )
    parser.add_argument(
        "--replication-factor",
        type=int,
        default=1,
        help="Replication factor for created topics.",
    )
    parser.add_argument(
        "--producer-workers",
        type=int,
        default=4,
        help="Concurrent producer threads used while loading records.",
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
        "--keep-alive-seconds",
        type=int,
        default=120,
        help="How long active consumer groups stay alive.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for repeatable payload generation.",
    )
    parser.add_argument(
        "--expected-broker-count",
        type=int,
        default=0,
        help="Optional minimum broker count to assert before seeding.",
    )
    args = parser.parse_args()

    if args.replication_factor <= 0:
        parser.error("--replication-factor must be > 0")
    if args.producer_workers <= 0:
        parser.error("--producer-workers must be > 0")
    if args.poll_ms <= 0:
        parser.error("--poll-ms must be > 0")
    if args.session_timeout_ms <= 0:
        parser.error("--session-timeout-ms must be > 0")
    if args.keep_alive_seconds <= 0:
        parser.error("--keep-alive-seconds must be > 0")
    if args.expected_broker_count < 0:
        parser.error("--expected-broker-count must be >= 0")
    return args


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def discover_brokers(brokers: list[str]) -> list[str]:
    admin = KafkaAdminClient(bootstrap_servers=brokers)
    try:
        admin.list_topics()
        cluster = admin._client.cluster
        discovered = []
        for broker in cluster.brokers():
            discovered.append(f"{broker.nodeId}@{broker.host}:{broker.port}")
        return sorted(discovered)
    finally:
        admin.close()


def ensure_topic_set(brokers: list[str], replication_factor: int) -> None:
    fixtures_by_partition_count: dict[int, list[str]] = {}
    for fixture in TOPIC_FIXTURES:
        fixtures_by_partition_count.setdefault(fixture.partitions, []).append(fixture.name)

    for partitions, topics in sorted(fixtures_by_partition_count.items()):
        load_test_data.ensure_topics(
            brokers=brokers,
            topics=topics,
            partitions=partitions,
            replication_factor=replication_factor,
        )


def load_messages(
    brokers: list[str],
    producer_workers: int,
    linger_ms: int,
    batch_size: int,
    seed: int,
) -> None:
    plans = load_test_data.build_topic_plans(
        [fixture.name for fixture in TOPIC_FIXTURES if fixture.message_count > 0],
        1,
    )
    plans = [
        load_test_data.TopicPlan(name=fixture.name, message_count=fixture.message_count)
        for fixture in TOPIC_FIXTURES
        if fixture.message_count > 0
    ]

    format_counts = load_test_data.produce_all_topics(
        brokers=brokers,
        plans=plans,
        producer_workers=producer_workers,
        linger_ms=linger_ms,
        batch_size=batch_size,
        seed=seed,
    )
    load_test_data.print_summary(format_counts, plans)


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


def consume_and_commit(
    brokers: list[str],
    group_id: str,
    topics: list[str],
    target_messages: int,
    poll_ms: int,
    session_timeout_ms: int,
) -> int:
    consumer = make_consumer(brokers, group_id, topics, session_timeout_ms)
    consumed = 0

    try:
        idle_polls = 0
        while consumed < target_messages and idle_polls < 3:
            batch = consumer.poll(timeout_ms=poll_ms)
            if not batch:
                idle_polls += 1
                continue

            idle_polls = 0
            batch_count = sum(len(records) for records in batch.values())
            consumed += batch_count
            consumer.commit()
    finally:
        consumer.close()

    return consumed


def keep_group_alive(
    brokers: list[str],
    group_id: str,
    topics: list[str],
    poll_ms: int,
    session_timeout_ms: int,
    keep_alive_seconds: int,
    worker_count: int,
) -> None:
    stop_event = threading.Event()

    def worker() -> None:
        consumer = make_consumer(brokers, group_id, topics, session_timeout_ms)
        try:
            deadline = time.time() + keep_alive_seconds
            while time.time() < deadline and not stop_event.is_set():
                batch = consumer.poll(timeout_ms=poll_ms)
                if batch:
                    consumer.commit()
        finally:
            consumer.close()

    threads = [threading.Thread(target=worker, daemon=True) for _ in range(worker_count)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()


def seed_consumer_groups(
    brokers: list[str],
    prefix: str,
    poll_ms: int,
    session_timeout_ms: int,
    keep_alive_seconds: int,
) -> None:
    print("\nSeeding consumer groups")

    lagging_group = f"{prefix}-app-logs-lagging"
    lagging_consumed = consume_and_commit(
        brokers=brokers,
        group_id=lagging_group,
        topics=["app-logs"],
        target_messages=250,
        poll_ms=poll_ms,
        session_timeout_ms=session_timeout_ms,
    )
    print(f"  {lagging_group}: committed {lagging_consumed} messages, idle with lag")

    caught_up_group = f"{prefix}-orders-caught-up"
    caught_up_consumed = consume_and_commit(
        brokers=brokers,
        group_id=caught_up_group,
        topics=["orders"],
        target_messages=1600,
        poll_ms=poll_ms,
        session_timeout_ms=session_timeout_ms,
    )
    print(f"  {caught_up_group}: committed {caught_up_consumed} messages, idle and near caught-up")

    mixed_group = f"{prefix}-mixed-lagging"
    mixed_consumed = consume_and_commit(
        brokers=brokers,
        group_id=mixed_group,
        topics=["payments", "audit-events"],
        target_messages=320,
        poll_ms=poll_ms,
        session_timeout_ms=session_timeout_ms,
    )
    print(f"  {mixed_group}: committed {mixed_consumed} messages across two topics")

    active_single = f"{prefix}-payments-active"
    active_multi = f"{prefix}-app-logs-active"
    empty_topic_group = f"{prefix}-empty-topic-active"

    print(
        f"  {active_single}: active single-member group for {keep_alive_seconds}s"
    )
    print(
        f"  {active_multi}: active multi-member group for {keep_alive_seconds}s"
    )
    print(
        f"  {empty_topic_group}: active group on empty-topic for {keep_alive_seconds}s"
    )

    active_threads = [
        threading.Thread(
            target=keep_group_alive,
            kwargs={
                "brokers": brokers,
                "group_id": active_single,
                "topics": ["payments"],
                "poll_ms": poll_ms,
                "session_timeout_ms": session_timeout_ms,
                "keep_alive_seconds": keep_alive_seconds,
                "worker_count": 1,
            },
            daemon=True,
        ),
        threading.Thread(
            target=keep_group_alive,
            kwargs={
                "brokers": brokers,
                "group_id": active_multi,
                "topics": ["app-logs"],
                "poll_ms": poll_ms,
                "session_timeout_ms": session_timeout_ms,
                "keep_alive_seconds": keep_alive_seconds,
                "worker_count": 2,
            },
            daemon=True,
        ),
        threading.Thread(
            target=keep_group_alive,
            kwargs={
                "brokers": brokers,
                "group_id": empty_topic_group,
                "topics": ["empty-topic"],
                "poll_ms": poll_ms,
                "session_timeout_ms": session_timeout_ms,
                "keep_alive_seconds": keep_alive_seconds,
                "worker_count": 1,
            },
            daemon=True,
        ),
    ]

    for thread in active_threads:
        thread.start()
    for thread in active_threads:
        thread.join()


def print_topic_overview() -> None:
    print("Topic fixture set")
    for fixture in TOPIC_FIXTURES:
        print(
            f"  {fixture.name}: partitions={fixture.partitions}, "
            f"messages={fixture.message_count}, note={fixture.note}"
        )


def main() -> int:
    args = parse_args()
    brokers = split_csv(args.brokers)
    if not brokers:
        print("No brokers provided.", file=sys.stderr)
        return 1

    print(f"Using brokers: {', '.join(brokers)}")
    discovered_brokers = discover_brokers(brokers)
    print(f"Discovered brokers: {', '.join(discovered_brokers)}")

    if args.expected_broker_count and len(discovered_brokers) < args.expected_broker_count:
        print(
            f"Expected at least {args.expected_broker_count} brokers, "
            f"found {len(discovered_brokers)}.",
            file=sys.stderr,
        )
        return 1

    print_topic_overview()
    ensure_topic_set(brokers, args.replication_factor)
    print("\nLoading topic records")
    load_messages(
        brokers=brokers,
        producer_workers=args.producer_workers,
        linger_ms=args.linger_ms,
        batch_size=args.batch_size,
        seed=args.seed,
    )
    seed_consumer_groups(
        brokers=brokers,
        prefix=args.prefix,
        poll_ms=args.poll_ms,
        session_timeout_ms=args.session_timeout_ms,
        keep_alive_seconds=args.keep_alive_seconds,
    )

    print("\nFixture complete")
    print("Recommended UI checks:")
    print("  brokers: verify all discovered brokers appear")
    print("  topics: verify varied partition counts and one empty topic")
    print("  consumer groups: verify lagging, caught-up, idle, and active groups")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KafkaError as error:
        print(f"Kafka error: {error}", file=sys.stderr)
        raise SystemExit(1)
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        raise SystemExit(130)
