# @subql/query

## run an app

for quickly setup all the required environment variables, add `.env` file in the query folder with content look like:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_DATABASE=postgres
```

then run the follow command
```
$ NODE_OPTIONS="-r dotenv/config" yarn start -- --name <subuqery_name> --playground
```
