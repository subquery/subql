# @subql/query

## run an app

for quickly setup all the required environment varialbes, add `.env` file in the query folder with content look like:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=postgres
```

then run the follow command
```
$ NODE_OPTIONS="-r dotenv/config" yarn start -- --schema <db_schema_name> 
```
