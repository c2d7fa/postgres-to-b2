Create bucket and application keys in B2. It's recommended that you set a prefix
for the application key, e.g. `database-backup/` so you can share one bucket for
multiple backups.

Files are automatically named with the prefix, and also contain the database name
and a timestamp. Backups are saved as plain-text SQL files.

    $ which pg_dump
    /usr/bin/pg_dump
    $ export B2_KEY_ID="..."
    $ export B2_KEY="..."
    $ export PG_HOST="..."
    $ export PG_USER="..."
    $ export PG_PASSWORD="..."
    $ export PG_DATABASE="..."
    $ deno run --allow-run --allow-net --allow-env ./main.ts

Build image:

    $ docker build . -t c2d7fa/postgres-to-b2:$VERSION && docker push c2d7fa/postgres-to-b2

