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

## Query Historical State

We added two more special columns to the data to make it versionable: `pid` and `_$block height`
(these two columns will be hidden from the user and will not appear in the generated graphql schema).

`pid` is the generated primary key, we add this column to resolve issues around ID conflicts and will use the `id` column as virtual primary key instead, allowing user can query a single entity by using its `id`.

```gql
user(id: "001") {
  address
  balance
}
```

`_@block_hegiht` is the important column that allowed user to query what the state of the data was at a certain blockheight.

For example, on block 1000 your balance is $2000, then at the block 2200, someone sends you 500 coin, so when you query with `blockHeight: 2100` your result should be `2000`

```gql
account(id: "0x0004", blockHeight: 2100) {
  balance  # result is 2000
}
```

but if you use `blockHeight: 2200`, your result should be `2500` instead

```gql
account(id: "0x0004", blockHeight: 2200) {
  balance  # result is 2500
}
```
