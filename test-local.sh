#!/usr/bin/env bash
set -euo pipefail

# Start local Postgres (if needed), build and start the server,
# run integration tests, then stop the server.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_LOG=$(mktemp)
SERVER_PID=""

CONTAINER_NAME="mtg-postgres"
PG_USER="mtg_admin"
PG_PASS="localdev"
PG_DB="mtg"
PG_PORT="5432"

# Use finch if available, otherwise docker
if command -v finch &>/dev/null; then
    RUNTIME="finch"
elif command -v docker &>/dev/null; then
    RUNTIME="docker"
else
    echo "Error: neither finch nor docker found."
    exit 1
fi

cleanup() {
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
    rm -f "$SERVER_LOG"
}
trap cleanup EXIT

# --- Postgres ---
if $RUNTIME ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✓ Postgres already running"
elif $RUNTIME ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Starting existing Postgres container..."
    $RUNTIME start "$CONTAINER_NAME"
else
    echo "Creating Postgres container..."
    $RUNTIME run -d --name "$CONTAINER_NAME" \
        -e POSTGRES_USER="$PG_USER" \
        -e POSTGRES_PASSWORD="$PG_PASS" \
        -e POSTGRES_DB="$PG_DB" \
        -p "$PG_PORT":5432 \
        postgres:16
fi

echo -n "Waiting for Postgres..."
for i in $(seq 1 30); do
    if $RUNTIME exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" &>/dev/null; then
        echo " ready"
        break
    fi
    echo -n "."
    sleep 1
done

# --- Server ---
echo "Building server..."
cargo build --bin mtg-server --manifest-path "$SCRIPT_DIR/server/Cargo.toml"

echo "Starting server..."
DATABASE_URL="host=localhost port=${PG_PORT} user=${PG_USER} password=${PG_PASS} dbname=${PG_DB}" \
  RUST_LOG=info \
  cargo run --bin mtg-server --manifest-path "$SCRIPT_DIR/server/Cargo.toml" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!

echo -n "Waiting for server..."
for i in $(seq 1 15); do
    if curl -sf http://localhost:13734/ping > /dev/null 2>&1; then
        echo " ready"
        break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo " server crashed!"
        cat "$SERVER_LOG"
        exit 1
    fi
    echo -n "."
    sleep 2
done

# --- Tests ---
echo "Running integration tests..."
cd "$SCRIPT_DIR/integration-tests"
API_URL=http://localhost:13734 npm test
TEST_EXIT=$?

if [ $TEST_EXIT -ne 0 ]; then
    echo ""
    echo "--- Server log ---"
    tail -30 "$SERVER_LOG"
fi

exit $TEST_EXIT
