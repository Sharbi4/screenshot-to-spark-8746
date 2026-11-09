#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres and runs the SQL tests.
# Usage: db-tests/run.sh   (requires postgres 15+ binaries on PATH or in /usr/lib/postgresql/*/bin)
set -euo pipefail
shopt -s nullglob
cd "$(dirname "$0")/.."
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true); export PATH="$BIN:$PATH"
DATA=$(mktemp -d); PORT=${PGTEST_PORT:-54329}
cleanup() { $RUNAS pg_ctl -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
RUNAS=""; if [ "$(id -u)" = "0" ]; then chown -R postgres "$DATA"; RUNAS="runuser -u postgres --"; fi
trap cleanup EXIT
$RUNAS initdb -D "$DATA" -A trust -U postgres >/dev/null
$RUNAS pg_ctl -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -w start >/dev/null
PSQL="psql -h /tmp -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f db-tests/supabase-shim.sql
for f in drizzle/migrations/[0-9]*.sql; do echo "migrate $f"; $PSQL -f "$f"; done
for t in db-tests/*.test.sql; do echo "test $t"; $PSQL -o /dev/null -f "$t" 2>&1 | sed -n -e "s/.*NOTICE:  /  /p" -e "/ERROR/p"; done
echo "All database tests passed."
