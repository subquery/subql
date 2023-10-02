FROM postgres:16.0

ENV PGWORKSPACE="/workspace/.pgsql"
ENV PGDATA="$PGWORKSPACE/data"

ENV PATH="/usr/lib/postgresql/16/bin:$PATH"

ENV DATABASE_URL="postgresql://gitpod@localhost"
ENV PGHOSTADDR="127.0.0.1"
ENV PGDATABASE="postgres"

USER gitpod
