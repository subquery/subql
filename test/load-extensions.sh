#!/bin/sh

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<EOF
CREATE EXTENSION IF NOT EXISTS btree_gist;
EOF
