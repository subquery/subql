# @subql/query

## Run this package

To quickly setup the project, add a `.env` file in the `subql/packages/query` folder with the following content:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_DATABASE=postgres
```

then run the following command

```sh
NODE_OPTIONS="-r dotenv/config" yarn start:dev -- --name <subquery_name> --playground
```
