# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.23.3] - 2025-07-24
### Changed
- Improved docker image size (#2866)

## [2.23.2] - 2025-07-17
### Changed
- Workspace dependencies now match to patch versions rather than exact (#2855)

## [2.23.1] - 2025-07-02
### Fixed
- Filtering out \_Global table (#2840)

## [2.23.0] - 2025-07-01
### Removed
- Test files and artifacts from published package (#2838)

## [2.22.2] - 2025-06-25
### Fixed
- Playgroung unable to load because of graphiql dependency (#2832)

## [2.22.1] - 2025-05-21
### Changed
- Hide \`\_global\` table from being queried (#2799)

## [2.22.0] - 2025-04-30
### Removed
- Usage of node-fetch and use fetch instead (#2772)

## [2.21.2] - 2025-04-24
### Changed
- Update graphlile utils (#2727)

## [2.21.1] - 2025-03-24
### Changed
- Update compression dependency (#2687)

## [2.21.0] - 2025-02-19
### Changed
- Update node version to LTS (#2655)

## [2.20.1] - 2025-02-04
### Changed
- Update copyright header to 2025

## [2.20.0] - 2025-01-28
### Fixed
- Subscriptions `_entity` field now returns all properties (#2626)

## [2.19.0] - 2024-12-11
### Added
- Support for ordering with fulltext search (#2623)

## [2.18.0] - 2024-12-04
### Fixed
- High CPU usage caused by interval with 0ms (#2614)

### Added
- Add PgOrderByRelatedPlugin to GraphQL query package

## [2.17.1] - 2024-11-28
### Fixed
- Crash with query service subscriptions on multichain projects (#2609)

## [2.17.0] - 2024-11-25
### Changed
- WS library with support for graphiql (#2600)
- Subscription type from JSON to the correct entity type (#2600)

## [2.16.0] - 2024-11-22
### Changed
- Update the playground to the latest GraphiQL (#2588)

### Added
- Support for historical indexing by timestamp as well as block height (#2584)

## [2.15.2] - 2024-09-25
### Changed
- Bump common, Added manifest support for query-subgraph.

## [2.15.1] - 2024-08-23
### Fixed
- Missing rxjs dependency

## [2.15.0] - 2024-08-23
### Added
- Support for null ordering (#2526)

## [2.14.1] - 2024-08-12
### Fixed
- Revert yargs version

### Changed
- Update how idle psql pool connections are handled (#2520)

## [2.14.0] - 2024-08-05
### Changed
- Update dependencies (#2518)

### Added
- add support for null ordering in 'order by' query (#2387)

## [2.13.3] - 2024-07-25
### Changed
- Bump version with `@subql/common` and `@subql/utils` (#2498)

## [2.13.2] - 2024-07-09
### Changed
- Enable TS strict setting

## [2.13.1] - 2024-06-26
### Fixed
- Fixed the aggregate query, type conversion causes precision loss.

## [2.13.0] - 2024-06-21
### Fixed
- Fixed query service unable to query dynamic datasource due to change from #2302

### Added
- enable ts strict mode

## [2.12.1] - 2024-06-12
### Changed
- Update `@subql/utils`

## [2.12.0] - 2024-06-12
### Added
- Add query `dbSize` under metadata (#2430)

## [2.11.1] - 2024-05-09
### Fixed
- Certain historical queries not appliying block height (#2398)

## [2.11.0] - 2024-05-08
### Changed
- Bump with @subql/utils, update polkadot dependencies to v11

## [2.10.5] - 2024-05-03
### Fixed
- Block height missing from certain historical queries (#2384)

## [2.10.4] - 2024-05-02
### Changed
- Update `@subql/utils`

## [2.10.3] - 2024-04-29
### Fixed
- Aggregate queries with historical not filtering by block height (#2367)

## [2.10.1] - 2024-04-24
### Changed
- Executable path in docker (#2344)

## [2.10.0] - 2024-03-05
### Added
- Fulltext search plugin to sanitise search input (#2280)

## [2.9.1] - 2024-02-29
### Fixed
- Relation filters not taking into account block height when historical is enabled (#2276)

## [2.9.0] - 2024-01-25
### Added
- gzip compression to queries (#2195)

## [2.8.0] - 2023-11-22
### Added
- Allow restrictions on alias queries, with flag `--query-alias-limit` (#2174)
- Allow restrictions on array based queries, with flag `--query-batch-limit` (#2172)

## [2.7.0] - 2023-11-15
### Added
- Allow restrictions on query depth, with flag `--query-depth-limit` (#2164)

## [2.6.0] - 2023-10-17
### Added
- Add `lastFinalizedVerifiedHeight`, `unfinalizedBlocks`, `lastCreatedPoiHeight` and `latestSyncedPoiHeight` to metadata

## [2.5.0] - 2023-08-10
### Added
- Support for update availability logs (#1930)

## [2.4.0] - 2023-07-31
### Fixed
- Avoid get `metadataTableName` call system table (#1893)
- Update license (#1891)

### Added
- Custom OrderBy plugin to improve dictionary query performance (#1907)

## [2.3.0] - 2023-07-04
### Changed
- Update x-graphile-build-pg to improve query service init speed (#1855)

## [2.2.0] - 2023-06-26
### Changed
- Update apollo server with security fixes (#1834)

### Added
- Add the ability to get all metadata tables with multichain projects (#1839)

## [2.1.0] - 2023-05-24
### Changed
- Tidy up commands and their args (#1741)

## [2.0.1] - 2023-04-27
### Fixed
- Fix tests (#1640)

## [2.0.0] - 2023-04-20
### Changed
- Major release for 2.0.0, align with other package versions

## [1.11.2] - 2023-04-11
### Added
- `evmChainId` to metadata (#1607)

## [1.11.1] - 2023-03-30
### Added
- Support multiple endpoints (#1551)

### Fixed
- Fix previous release 1.11.0 failed

## [1.11.0] - 2023-02-21
### Added
- Add flag `--query-limit`, moved from `--unsafe` (#1514)
- Add `dictionary-optimisation` flag to improve dictionary query performance (#1519)
- Add SSL connection option (#1513)
- Support Cockroach database (#1521)

### Changed
- Update postgraphile enable table partitions (#1520)

## [1.10.2] - 2023-01-23
### Changed
- Enable connection filters (#1484)

## [1.10.1] - 2022-12-22
### Fixed
- Updated subscription `triggerName` (#1469)

## [1.10.0] - 2022-12-06
### Added
- Add start height to \_metadata (#1456)

## [1.9.0] - 2022-11-30
### Added
- Add `--playground-settings` options for passing the settings to the playground (#1436)

## [1.8.0] - 2022-11-23
### Fixed
- Fix row estimate in \_metadata, only execute SQL when `rowEstimate` included in graphql query field (#1417)

### Changed
- Query explain include graphql query (#1426)
- Support for multi-chain indexing (#1375)

## [1.7.0] - 2022-11-15
### Added
- Added distinct query plugin. (#1401)

### Fixed
- Fix permission restrictions when using hot-schema reload. (#1398)
- Fix query distinct dependencies. (#1274)

## [1.6.1] - 2022-10-27
### Changed
- Disable hot schema reload by default. It can be enabled with `--disable-hot-schema=false`. (#1349)

## [1.6.0] - 2022-10-26
### Changed
- Change max connection to 10 ms and query timeout to 10000 ms. (#1322)

### Added
- Added hot-schema reload, query-service no longer needs to restart to see schema changes. (#1321)

## [1.5.0] - 2022-08-11
### Fixed
- Fix db selection in configuration when subscription is enabled (#1241)
- Fork OrderByAggregatesPlugin and modify to be compatible with historical feature (#1242)
- Fix block height being applied to all queries (#1238)

### Changed
- Move aggregation feature out from `unsafe` and apply it by default, can be control though `aggregate` flag.

## [1.4.0] - 2022-07-27
### Added
- Add `query-explain` flag, by enable this console will log actual SQL statement been queried. (#1192)

## [1.3.0] - 2022-07-05
### Changed
- Try to catch error if server creation failed, also give retry build schema (#1153)

### Fixed
- Fix tests (#1160)

## [1.2.1] - 2022-06-27
### Fixed
- Fixed subql-query doesn't show all help docs issue (#1137)

## [1.2.0] - 2022-06-22
### Added
- added `max-connection` and `query-timeout` configuration for pg pool (#1108)

## [1.1.1] - 2022-06-02
### Changed
- Now query-complexity is indicated in the header (#1088)

## [1.1.0] - 2022-05-31
### Added
- Experimental feature: Support query by block number, require enable by indexing node (#992)

## [1.0.0] - 2022-05-11
### Changed
- Major release

## [0.16.1] - 2022-05-06
### Changed
- Bump with `@subql/utils`

## [0.16.0] - 2022-05-02
### Added
- Add utils package (#928)
- Allow set query-complexity for query (#923)

## [0.15.0] - 2022-04-26
### Added
- Add support for querying historical state (#859)

## [0.14.1] - 2022-04-04
### Changed
- Bump with `subql/common`

## [0.14.0] - 2022-04-04
### Changed
- move subscription to dedicate flag (#867)

## [0.13.0] - 2022-03-22
### Added
- Add GraphQL subscription support (#846)

## [0.12.0] - 2022-02-09
### Added
- Add `dynamicDatasources` in metadata (#773)

## [0.11.0] - 2022-01-21
### Added
- Enable full aggregates support when `--unsafe`, and group-by only when `--unsafe=false` (#765)

## [0.10.0] - 2022-01-13
### Added
- Add rowCountEstimate to Metadata (#736)
- Support allocate port automatically (#739)

## [0.9.0] - 2021-12-16
### Changed
- Limit query record size to 100, though by using `--unsafe` can remove this limit. (#644)
- Update `getProjectSchema` to handle when subqueries table has been deprecated (#683)
- Update `Dockerfile` to use `node:16-alpine` (#640)

### Added
- Add query log to file (#667)

### Fixed
- Fix fetch metadata (#700)

## [0.8.0] - 2021-11-19
### Added
- Support enum in postgraphile plugin (#551)

### Changed
- Update `GetMetadataPlugin` to support fetch from both api and table (#555)

## [0.7.4] - 2021-11-03
### Changed
- Bump dependencies (#584)

## [0.7.3] - 2021-09-25
### Fixed
- Change `_metadata` back, and use `smartTagPlugin` to omit node `metadata` class. By doing this, previous project that rely on query `_metadata` won't be affected, such as Dictionaries.

## [0.7.2] - 2021-09-22
### Changed
- Changed query indexer `_metadata` to `_meta`, current `_metadata` is created from indexer service included `blockOffset` data (#489)

## [0.7.1] - 2021-08-27
### Fixed
- Deprecated warnings (#448)

## [0.7.0] - 2021-06-25
### Changed
- Update dependencies (#358)

## [0.6.0] - 2021-06-22
### Added
- Allow query service to query indexer metadata though add `--indexer <indexer-meta-api>` (#327)
- Add `_Metadata` in the query schema (#327)

### Changed
- change `lastProcessedHeight` and `targetHeight` type to `Int`. (#347)

## [0.5.0] - 2021-04-20
### Added
- Remove `condition` in query schema, please use `filter` instead (#260)
- annotation is now supported in
- We'll automatically generate coresponding JSON interfaces when querying this data (#275)
- Read more about how you can use this in our [updated docs](https://doc.subquery.network/create/graphql.html#json-type)

## [0.4.0] - 2021-03-25
### Added
- support filter for condition search (#240)

## [0.3.2] - 2021-03-11
### Fixed
- add dependency of @subql/common for @subql/query (#233)

## [0.3.1] - 2021-03-11
### Fixed
- fix wrong cross package imports (#231)

## [0.3.0] - 2021-03-11
### Added
- refactor logger: support --output-fmt and --log-level (#220)
- use read db host (DB_HOST_READ from env) as priority (#221)

## [0.2.0] - 2021-02-05
### Added
- init query service project
- customise first/last plugin to give max record to query (#114)
- disable debug mode in production (#115)
- overwrite plugin to fix one to one unique key check
- update query publish and docker build process

[Unreleased]: https://github.com/subquery/subql/compare/query/2.23.3...HEAD
[2.23.3]: https://github.com/subquery/subql/compare/query/2.23.2...query/2.23.3
[2.23.2]: https://github.com/subquery/subql/compare/query/2.23.1...query/2.23.2
[2.23.1]: https://github.com/subquery/subql/compare/query/2.23.0...query/2.23.1
[2.23.0]: https://github.com/subquery/subql/compare/query/2.22.2...query/2.23.0
[2.22.2]: https://github.com/subquery/subql/compare/query/2.22.1...query/2.22.2
[2.22.1]: https://github.com/subquery/subql/compare/query/2.22.0...query/2.22.1
[2.22.0]: https://github.com/subquery/subql/compare/query/2.21.2...query/2.22.0
[2.21.2]: https://github.com/subquery/subql/compare/query/2.21.1...query/2.21.2
[2.21.1]: https://github.com/subquery/subql/compare/query/2.21.0...query/2.21.1
[2.21.0]: https://github.com/subquery/subql/compare/query/2.20.1...query/2.21.0
[2.20.1]: https://github.com/subquery/subql/compare/query/2.20.0...query/2.20.1
[2.20.0]: https://github.com/subquery/subql/compare/query/2.19.0...query/2.20.0
[2.19.0]: https://github.com/subquery/subql/compare/query/2.18.0...query/2.19.0
[2.18.0]: https://github.com/subquery/subql/compare/query/2.17.1...query/2.18.0
[2.17.1]: https://github.com/subquery/subql/compare/query/2.17.0...query/2.17.1
[2.17.0]: https://github.com/subquery/subql/compare/query/2.16.0...query/2.17.0
[2.16.0]: https://github.com/subquery/subql/compare/query/2.15.2...query/2.16.0
[2.15.2]: https://github.com/subquery/subql/compare/query/2.15.1...query/2.15.2
[2.15.1]: https://github.com/subquery/subql/compare/query/2.15.0...query/2.15.1
[2.15.0]: https://github.com/subquery/subql/compare/query/2.14.1...query/2.15.0
[2.14.1]: https://github.com/subquery/subql/compare/query/2.14.0...query/2.14.1
[2.14.0]: https://github.com/subquery/subql/compare/query/2.13.3...query/2.14.0
[2.13.3]: https://github.com/subquery/subql/compare/query/2.13.2...query/2.13.3
[2.13.2]: https://github.com/subquery/subql/compare/query/2.13.1...query/2.13.2
[2.13.1]: https://github.com/subquery/subql/compare/query/2.13.0...query/2.13.1
[2.13.0]: https://github.com/subquery/subql/compare/query/2.12.1...query/2.13.0
[2.12.1]: https://github.com/subquery/subql/compare/query/2.12.0...query/2.12.1
[2.12.0]: https://github.com/subquery/subql/compare/query/2.11.1...query/2.12.0
[2.11.1]: https://github.com/subquery/subql/compare/query/2.11.0...query/2.11.1
[2.11.0]: https://github.com/subquery/subql/compare/query/2.10.5...query/2.11.0
[2.10.5]: https://github.com/subquery/subql/compare/query/2.10.4...query/2.10.5
[2.10.4]: https://github.com/subquery/subql/compare/query/2.10.3...query/2.10.4
[2.10.3]: https://github.com/subquery/subql/compare/query/2.10.1...query/2.10.3
[2.10.1]: https://github.com/subquery/subql/compare/query/2.10.0...query/2.10.1
[2.10.0]: https://github.com/subquery/subql/compare/query/2.9.1...query/2.10.0
[2.9.1]: https://github.com/subquery/subql/compare/query/2.9.0...query/2.9.1
[2.9.0]: https://github.com/subquery/subql/compare/query/2.8.0...query/2.9.0
[2.8.0]: https://github.com/subquery/subql/compare/query/2.7.0...query/2.8.0
[2.7.0]: https://github.com/subquery/subql/compare/query/2.6.0...query/2.7.0
[2.6.0]: https://github.com/subquery/subql/compare/query/2.5.0...query/2.6.0
[2.5.0]: https://github.com/subquery/subql/compare/query/2.4.0...query/2.5.0
[2.4.0]: https://github.com/subquery/subql/compare/query/2.3.0...query/2.4.0
[2.3.0]: https://github.com/subquery/subql/compare/query/2.2.0...query/2.3.0
[2.2.0]: https://github.com/subquery/subql/compare/query/2.1.0...query/2.2.0
[2.1.0]: https://github.com/subquery/subql/compare/query/2.0.1..query/2.1.0
[2.0.1]: https://github.com/subquery/subql/compare/query/2.0.0...query/2.0.1
[2.0.0]: https://github.com/subquery/subql/compare/query/1.11.2..query/2.0.0
[1.11.2]: https://github.com/subquery/subql/compare/query/1.11.1...query/1.11.2
[1.11.1]: https://github.com/subquery/subql/compare/query/1.11.0...query/1.11.1
[1.11.0]: https://github.com/subquery/subql/compare/query/1.10.2...query/1.11.0
[1.10.2]: https://github.com/subquery/subql/compare/query/1.10.1...query/1.10.2
[1.10.1]: https://github.com/subquery/subql/compare/query/1.10.0...query/1.10.1
[1.10.0]: https://github.com/subquery/subql/compare/query/1.9.0...query/1.10.0
[1.9.0]: https://github.com/subquery/subql/compare/query/1.8.0...query/1.9.0
[1.8.0]: https://github.com/subquery/subql/compare/query/1.7.0...query/1.8.0
[1.7.0]: https://github.com/subquery/subql/compare/query/1.6.1...query/1.7.0
[1.6.1]: https://github.com/subquery/subql/compare/query/1.6.0...query/1.6.1
[1.6.0]: https://github.com/subquery/subql/compare/query/1.5.0...query/1.6.0
[1.5.0]: https://github.com/subquery/subql/compare/query/1.4.0...query/1.5.0
[1.4.0]: https://github.com/subquery/subql/compare/query/1.3.0...query/1.4.0
[1.3.0]: https://github.com/subquery/subql/compare/query/1.2.1...query/1.3.0
[1.2.1]: https://github.com/subquery/subql/compare/query/1.2.0...query/1.2.1
[1.2.0]: https://github.com/subquery/subql/compare/query/1.1.1...query/1.2.0
[1.1.1]: https://github.com/subquery/subql/compare/query/1.1.0...query/1.1.1
[1.1.0]: https://github.com/subquery/subql/compare/query/1.0.0...query/1.1.0
[1.0.0]: https://github.com/subquery/subql/compare/query/0.16.1...query/1.0.0
[0.16.1]: https://github.com/subquery/subql/compare/query/0.16.0...query/0.16.1
[0.16.0]: https://github.com/subquery/subql/compare/query/0.15.0...query/0.16.0
[0.15.0]: https://github.com/subquery/subql/compare/query/0.14.1...query/0.15.0
[0.14.1]: https://github.com/subquery/subql/compare/query/0.14.0...query/0.14.1
[0.14.0]: https://github.com/subquery/subql/compare/query/0.13.0...query/0.14.0
[0.13.0]: https://github.com/subquery/subql/compare/query/0.12.0...query/0.13.0
[0.12.0]: https://github.com/subquery/subql/compare/query/0.11.0...query/0.12.0
[0.11.0]: https://github.com/subquery/subql/compare/query/0.10.0...query/0.11.0
[0.10.0]: https://github.com/subquery/subql/compare/query/0.9.0...query/0.10.0
[0.9.0]: https://github.com/subquery/subql/compare/query/0.8.0...query/0.9.0
[0.8.0]: https://github.com/subquery/subql/compare/query/0.7.4...query/0.8.0
[0.7.4]: https://github.com/subquery/subql/compare/query/0.7.3...query/0.7.4
[0.7.3]: https://github.com/subquery/subql/compare/query/0.7.2...query/0.7.3
[0.7.2]: https://github.com/subquery/subql/compare/query/0.7.1...query/0.7.2
[0.7.1]: https://github.com/subquery/subql/compare/query/0.7.0...query/0.7.1
[0.7.0]: https://github.com/subquery/subql/compare/query/0.6.0...query/0.7.0
[0.6.0]: https://github.com/subquery/subql/compare/query/0.5.0...query/0.6.0
[0.5.0]: https://github.com/subquery/subql/compare/query/0.4.0...query/0.5.0
[0.4.0]: https://github.com/subquery/subql/compare/query/0.3.2...query/0.4.0
[0.3.2]: https://github.com/subquery/subql/compare/query/0.3.1...query/0.3.2
[0.3.1]: https://github.com/subquery/subql/compare/query/0.3.0...query/0.3.1
[0.3.0]: https://github.com/subquery/subql/compare/query/0.2.0...query/0.3.0
[0.2.0]: https://github.com/subquery/subql/tag/query/0.2.0
