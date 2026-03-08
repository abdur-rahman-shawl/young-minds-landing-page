#!/usr/bin/env bash

set -euo pipefail

DUMP_PATH="${1:-docker/backup.sql}"
TARGET_DB="${2:-sharing_minds_dump}"
CONTAINER_NAME="${3:-sharing-minds-postgres}"
TMP_SQL="/tmp/backup_public_only.sql"

if [[ ! -f "$DUMP_PATH" ]]; then
  echo "Dump file not found: $DUMP_PATH" >&2
  exit 1
fi

node - "$DUMP_PATH" "$TMP_SQL" <<'NODE'
const fs = require('fs');

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const lines = fs.readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n').split('\n');

const blocks = [];
let current = null;

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  const next = lines[i + 1] || '';

  if (line === '--' && /^-- (?:Data for Name|Name): /.test(next)) {
    if (current) {
      blocks.push(current);
    }
    current = [line, next];
    i += 1;
    continue;
  }

  if (current) {
    current.push(line);
  }
}

if (current) {
  blocks.push(current);
}

const excludedTypes = new Set(['ACL', 'POLICY', 'PUBLICATION', 'PUBLICATION TABLE', 'EVENT TRIGGER']);
const out = [
  '-- Sanitized public-schema restore generated from the source dump',
  'SET statement_timeout = 0;',
  'SET lock_timeout = 0;',
  'SET idle_in_transaction_session_timeout = 0;',
  'SET transaction_timeout = 0;',
  "SET client_encoding = 'UTF8';",
  'SET standard_conforming_strings = on;',
  'SET check_function_bodies = false;',
  'SET xmloption = content;',
  'SET client_min_messages = warning;',
  'SET row_security = off;',
  'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
  'SET search_path = public, pg_catalog;',
  '',
];

for (const block of blocks) {
  const header = block[1] || '';
  const match = header.match(/^-- (?:Data for Name|Name): (.*?); Type: (.*?); Schema: (.*?); Owner: (.*)$/);
  if (!match) {
    continue;
  }

  const [, , type, schema] = match;
  if (schema !== 'public') {
    continue;
  }
  if (excludedTypes.has(type)) {
    continue;
  }

  out.push(block.join('\n').trimEnd());
  out.push('');
}

fs.writeFileSync(outputPath, out.join('\n'));
NODE

docker exec "$CONTAINER_NAME" psql -U postgres -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if; if not exists (select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin; end if; end \$\$;"
docker exec "$CONTAINER_NAME" psql -U postgres -c "drop database if exists $TARGET_DB with (force);"
docker exec "$CONTAINER_NAME" psql -U postgres -c "create database $TARGET_DB;"
docker cp "$TMP_SQL" "$CONTAINER_NAME:$TMP_SQL"
docker exec "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d "$TARGET_DB" -f "$TMP_SQL"

echo "Imported sanitized public dump into database: $TARGET_DB"
