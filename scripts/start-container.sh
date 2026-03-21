#!/bin/sh
set -eu

if [ -z "${KAFKA_BROKERS:-}" ]; then
  echo "KAFKA_BROKERS is required" >&2
  exit 1
fi

export INTERNAL_API_BASE_URL="${INTERNAL_API_BASE_URL:-http://127.0.0.1:9099}"
export PORT="${PORT:-3000}"

/app/luminakafka &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait_for_api() {
  attempts=0

  while [ "$attempts" -lt 60 ]; do
    if ! kill -0 "$API_PID" 2>/dev/null; then
      echo "Backend exited before becoming ready" >&2
      wait "$API_PID"
      exit 1
    fi

    if node -e "
      fetch('${INTERNAL_API_BASE_URL}/health', { cache: 'no-store' })
        .then((response) => process.exit(response.ok ? 0 : 1))
        .catch(() => process.exit(1));
    " >/dev/null 2>&1; then
      return 0
    fi

    attempts=$((attempts + 1))
    sleep 1
  done

  echo "Backend did not become ready at ${INTERNAL_API_BASE_URL}" >&2
  exit 1
}

wait_for_api

cd /app/web
node server.js
