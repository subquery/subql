# @subql/query

## Run this package

To quickly setup the project, add a `.env` file in the `subql/packages/query` folder with the following ontent:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_DATABASE=postgres
```

then run the following command

```
$ NODE_OPTIONS="-r dotenv/config" yarn start -- --name <subuqery_name> --playground
```
