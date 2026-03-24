#!/usr/bin/env bash
set -euo pipefail

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
    echo "Error: neither finch nor docker found. Install one to continue."
    exit 1
fi

# Start Postgres if not already running
if $RUNTIME ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✓ Postgres container already running"
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

# Wait for Postgres to be ready
echo -n "Waiting for Postgres..."
for i in $(seq 1 30); do
    if $RUNTIME exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -d "$PG_DB" &>/dev/null; then
        echo " ready"
        break
    fi
    echo -n "."
    sleep 1
done

export DATABASE_URL="host=localhost port=${PG_PORT} user=${PG_USER} password=${PG_PASS} dbname=${PG_DB}"
export RUST_LOG="${RUST_LOG:-info}"

echo "Starting server..."
echo "  DATABASE_URL=${DATABASE_URL}"
echo "  RUST_LOG=${RUST_LOG}"
echo ""

cargo run --bin mtg-server
