# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.2.2] - 2024-08-14
### Added
- Update polkadot/api library

## [5.2.1] - 2024-08-12
### Fixed
- Subcommands not working because of yargs dependency

## [5.2.0] - 2024-08-05
### Changed
- Update dependencies (#2518)

## [5.1.0] - 2024-08-01
### Added
- Support endpoint configs and specifying headers for network endpoints (#2511)

### Fixed
- Fixed timestamp can be undefined in some network blocks, it should return undefined (#2513)

## [5.0.2] - 2024-07-31
### Fixed
- Fixed api not reloading new deployment chainTypes when project upgrades (#2505)

## [5.0.1] - 2024-07-29
### Fixed
- Fixed default Timezone to UTC in dockerfile and package.json (#2505)
- Bump with `node-core`, fixed various data consistency issue with db and cache (#2504)

## [5.0.0] - 2024-07-25
### Changed
- Breaking change: Update with `@subql/node-core`, require indexing environment timezone set to UTC (#2495)
- Update SubqueryProject to use code from node-core (#2496)

### Fixed
- Bump with `@subql/node-core`, fixed various issues causing poi inconsistency (#2497)

## [4.9.0] - 2024-07-22
### Changed
- Tidy up modules to match changes with node-core (#2491)

## [4.8.2] - 2024-07-16
### Fixed
- Fix dockerfile missing set timezone to UTC (#2489)

## [4.8.1] - 2024-07-11
### Removed
- Unused type (#2484)

### Changed
- Make change with `node-core` fetch service, change `getFinalizedHeight` to `getFinalizedHeader` (#2487)

## [4.8.0] - 2024-07-10
### Changed
- Bump with `@subql/node-core`, fix admin api `dbSize` issue

## [4.7.1] - 2024-07-09
### Added
- Enable ts strict model

### Fixed
- "currentRuntimeVersion is undefined" error (#2475)

## [4.7.0] - 2024-07-01
### Changed
- Update with `@subql/node-core`, `@subql/common-substrate`

## [4.6.6] - 2024-06-21
### Fixed
- Update with common-substrate, fix `EventFilter` incorrectly extend `BlockFilter`, lead dictionary error (#2463)
- Fix dictionary query entries included undefined fields (#2463)

## [4.6.5] - 2024-06-18
### Fixed
- Add missing chainType validation for local mode

## [4.6.4] - 2024-06-12
### Changed
- Update `@subql/utils`

## [4.6.3] - 2024-06-12
### Changed
- Update polkadot dependencies to 11.2.1 (#2440)

## [4.6.2] - 2024-06-06
### Fixed
- Fix import monitor service from node-core

## [4.6.1] - 2024-06-06
### Fixed
- Fix import admin from node-core, update dockerfile to fix monitor default directory permission issue

## [4.6.0] - 2024-06-05
### Added
- Add monitor service to record block indexing actions in order to improve POI accuracy, and provide debug info for Admin api

## [4.5.1] - 2024-05-27
### Fixed
- Error processing chain types

## [4.5.0] - 2024-05-22
### Added
- Add support to chainTypes, allow user use hasher name string in chainTypes

### Fixed
- Bump version with node-core, fix CacheModel.clear behaviour if height was 0

## [4.4.2] - 2024-05-20
### Fixed
- Fix load chain types missing some builtins modules

## [4.4.1] - 2024-05-08
### Fixed
- Temp disable console warn for `Unable to map [u8; 32] to a lookup index` ,until [this issue](https://github.com/polkadot-js/api/issues/5871) fixed

## [4.4.0] - 2024-05-08
### Changed
- Update polkadot dependencies to v11
- Bump with node-core, fix various issue with project upgrade

## [4.3.2] - 2024-05-03
### Fixed
- Bump dependency with node-core, fix block timestamp filter could be undefined

## [4.3.1] - 2024-05-02
### Fixed
- Bump dependency with node-core, fix failed to start issue due to missing `pg`

## [4.3.0] - 2024-05-02
### Removed
- Unused deps (#2375)

## [4.2.1] - 2024-04-29
### Fixed
- Startup error with DS processors (`this.isCustomDs is not a function`) (#2369)

## [4.2.0] - 2024-04-24
### Changed
- Use code that has been moved to node core, tidy up dependencies (#2357)

## [4.1.0] - 2024-04-12
### Removed
- Unused `@subql/testing` dependency (#2346)
- `WorkerUnfinalizedBlocksService` and use version from node-core (#2346)

### Changed
- Update ApiService to match changes with `@subql/node-core` (#2350)
- Simplify specVersions code (#2353)

## [4.0.1] - 2024-04-05
### Fixed
- Fix modulo block didn't apply correctly with multiple dataSources (#2331)
- Now when `workers` set to 0, it will use block dispatcher instead of throw and exit

## [4.0.0] - 2024-03-28
### Changed
- Updated with node-core to support both versions of dictionaries. Now also support multiple dictionary endpoints, indexer will fetch and switch dictionaries base on available blocks (#2257)
- Update Polkadot/api to 10.12.4

### Removed
- Special case for dictionary resolver (#2305)

## [3.10.0] - 2024-03-20
### Changed
- Update `@subql/node-core` with fixes and optimisations

## [3.9.3] - 2024-03-15
### Changed
- Update `@subql/node-core` to 4.7.3 with retry changes

## [3.9.2] - 2024-03-14
### Fixed
- Escaping graphql comments (#2299)

## [3.9.1] - 2024-03-08
### Changed
- Remove usage of deprecated type
- Update `@subql/node-core` with bug fixes

## [3.9.0] - 2024-03-05
### Changed
- Update `@subql/node-core` to 7.4.0

## [3.6.1] - 2024-02-29
### Fixed
- Update `@subql/node-core` to fix Poi generation issue with negative integer, also drop subscription triggers and notifiy_functions

## [3.6.0] - 2024-02-23
### Changed
- Update `@subql/node-core` to 7.3.0

## [3.5.3] - 2024-02-07
### Fixed
- Critical bug introduced in 3.5.0 which broke historical indexing

## [3.5.1] - 2024-01-30
### Changed
- Update `@subql/node-core` with updates to `@subql/apollo-links`

## [3.5.0] - 2024-01-25
### Changed
- Update `@subql/node-core` with support for CSV exports and schema migrations

## [3.4.11] - 2024-01-10
### Fixed
- Update with node-core , improve project initialization query from x-sequelize (#2212)

## [3.4.10] - 2024-01-04
### Fixed
- Update with node-core, fix x-sequelize same table name issue. (#2209)
- Sync postgres version to 16 in docker-compose file. (#2209)

## [3.4.9] - 2023-12-20
### Fixed
- Metadata lastProcessedHeight undefined issue via `@subql/node-core`

## [3.4.8] - 2023-12-14
### Changed
- Update @subql/common

## [3.4.7] - 2023-12-05
### Fixed
- Fix init dynamic ds failed with workers, due to incorrect injection in fetch module.

## [3.4.6] - 2023-12-04
### Fixed
- Update `@subql/node-core` with fixes

## [3.4.5] - 2023-11-30
### Changed
- Update `@subql/node-core` with fixes (#2187, #2189)

## [3.4.4] - 2023-11-28
### Fixed
- Fix ipfs deployment templates path failed to resolved, issue was introduced node-core 7.0.0
- Update with node-core to fix network dictionary timeout but not fallback to config dictionary issue

## [3.4.3] - 2023-11-27
### Changed
- Remove unused PoiService from block dispatchers (#2176)
- Update `@subql/node-core` with bug fixes

## [3.4.2] - 2023-11-16
### Fixed
- Sync with node-core 6.4.2 (#2167, #2169)

## [3.4.1] - 2023-11-13
### Fixed
- Sync with node-core 6.4.1, store not having access to blockHeight and causing workers to fail on startup

## [3.4.0] - 2023-11-10
### Changed
- Update Polkadot/api to 10.10.1 (#2150)
- Use yargs config from node-core (#2144)

## [3.3.0] - 2023-11-06
### Added
- With `dictionary-query-size` now dictionary can config the query block range(#2139)

### Fixed
- Sync with node-core 6.3.0 with various fixes

## [3.2.0] - 2023-10-31
### Fixed
- Sync with node-core, fixed modulo block ahead of finalized block issue (#2132)
- Missing dependencies for testing command

### Changed
- Use WorkerInMemoryCacheService from node core (#2125)
- Update `@subql/node-core` with latest features and fixes

### Added
- Logger now supports negative filters. To use this prefix the logger name with a `-`. E.g `--debug="*,-SQL"` (#2133)

## [3.1.1] - 2023-10-25
### Fixed
- Update node-core with fix for crash when creating a dynamic datasource

## [3.1.0] - 2023-10-20
### Added
- Inject in-memory cache to sandbox (#2110)

### Fixed
- Bump with `@subq/node-core` 3.1.0 , fixed poi migration init check, and improve logging

## [3.0.8] - 2023-10-18
### Fixed
- Update node-core, fix store bulk methods failing with workers

## [3.0.7] - 2023-10-17
### Changed
- Update with node-core 6.0.3

## [3.0.6] - 2023-10-12
### Changed
- Update node-core

## [3.0.5] - 2023-10-11
### Changed
- debug has changed from a boolean to a string to allow scoping debug log level (#2077)

### Fixed
- Sync with node-core.
  - Fixed Poi migration performance issue.
  - Fixed AutoQueue timeout issue. (#2081)
  - Fixed Poi sync could block DB IO and drop connection issue.(#2086)

## [3.0.4] - 2023-10-03
### Changed
- Version bump with `types-core` 0.1.1

## [3.0.3] - 2023-10-03
### Fixed
- Empty string causing main command to not run, this happened with the default docker compose in starters

## [3.0.2] - 2023-10-02
### Fixed
- Use specific dictionary metadata validation for substrate (#2057)

## [3.0.1] - 2023-09-28
### Fixed
- Fix crashes when intialization fails for one of the endpoint (#1970)
- Remove `@willsoto/nestjs-prometheus` from dependency as it is already added in node-core (#2012)
- Project node runner options being overwritten by yargs defaults (#1967)
- Sync with node-core, fix dictionary resolver failed to get token issue

### Changed
- Move code to node-core (#1797)

### Added
- Project upgrades feature which allows upgrading projects at specific heights (#1797)
- Support for `skipTransactions` and LightBlock (#1968)

## [2.12.2] - 2023-08-17
### Fixed
- Testing framework not starting because of missing dependency (#1955)
- Bump with node-core 4.2.3, delay getPoiBlocksByRange when fully synced, fixes the high CPU usage issue

## [2.12.1] - 2023-08-17
### Fixed
- Incorrect dictionary query for methods/calls filter (#1950)

## [2.12.0] - 2023-08-16
### Added
- Support for `isSigned` filter (#1940)

### Fixed
- Dictionary query only working if `module` AND `method` filters are provided for call or event handlers (#1940)

## [2.11.1] - 2023-08-11
### Fixed
- injected `unsafeApi` in global, revert previous change in #1932. (#1935)

## [2.11.0] - 2023-08-10
### Fixed
- fix injected unsafe api name in sandbox (#1932)

### Added
- add `--primary-network-endpoint` cli option (#1927)
- Support for update availability logs (#1930)

## [2.10.1] - 2023-08-04
### Changed
- Sync with node-core 4.1.0:
  - moved `indexBlock` to base `TestingService` (#1913)
  - Simplify conneciton pool logic (#1915)
  - Fix poi operationHash and miss poi blocks (#1917)

## [2.10.0] - 2023-07-31
### Fixed
- Update license (#1891)
- Performance scoring fix (#1895)

## [2.9.3] - 2023-07-17
### Changed
- Inti DB schema manually during test run (#1870)

### Fixed
- Fixed missing mmrQueryService in indexer module (#1885)
- Sync
  - for `@subql/apollo-links` update (#1886)
  - fix retry logic for workers in connection pool (#1829)

## [2.9.2] - 2023-07-11
### Fixed
- Use `ConnectionPoolStateManager` from host when workers are turned on (#1829)
- Handle RPC error for oversized block responses (#1876)
- Modidy `TestingService` to use `TestRunner` from node-core (#1870)
- Sync with @node/core, various improvements for POI feature (#1869)

## [2.9.1] - 2023-07-06
### Fixed
- Sync with @subql/node-core, fixed Poi table missing mmr issue (#1871)

## [2.9.0] - 2023-07-04
### Added
- `store-cache-upper-limit` flag to control limiting the max size of the store cache (#1859)

## [2.8.0] - 2023-06-26
### Added
- import `PgMmrCacheService` into indexer module (#1828)

### Changed
- Move code into node-core (#1823)

### Fixed
- Fix apiConnect issues in ApiPromiseConnection

## [2.7.0] - 2023-06-19
### Changed
- Sync with @subql/node-core, upgrade @subql/apollo-links, enable dictionary-resolver by default (#1801)

## [2.6.1] - 2023-06-16
### Fixed
- sync with node-core 2.5.1, fixed meta service missing construct (#1804)

## [2.6.0] - 2023-06-15
### Added
- Integrated multiple endpoint improvements from node-core (#1657)
- Improved error handling within ApiPromiseConnection class (#1657)

## [2.5.5] - 2023-06-09
### Changed
- Use @subql/x-sequelize in order to support cockroach (#1791)

## [2.5.4] - 2023-06-07
### Fixed
- Sync with node-core 2.4.4, fixed various issue for mmr (#1787)

## [2.5.3] - 2023-06-02
### Fixed
- Sync with node-core 2.4.3, fixed mmr missing node due to cache lock (#1784)

## [2.5.2] - 2023-06-01
### Fixed
- Testing db schema (#1766)

## [2.5.1] - 2023-05-31
### Changed
- Improve incorrect runner message (#1775)
- Update node-core to fix MMR db issues (#1777)

## [2.5.0] - 2023-05-30
### Fixed
- Workers creating their own temp dir for IPFS based projects (#1771)
- Workers failing to start (#1769)

### Added
- Cache rpc requests for `state_getRuntimeVersion` and `chain_getHeader` (#1760)

## [2.4.1] - 2023-05-26
### Fixed
- Improve mmr error and status, set `mmr-store-type` default to postgres db (#1752)
- Fix subcommand could escape issue, setup profiler at application init (#1755)

## [2.4.0] - 2023-05-24
### Changed
- Tidy up commands and their args (#1741)
- Update node-core

## [2.3.0] - 2023-05-19
### Changed
- Update polkadot api to 10.7.1 (#1736)
- Update Node to 18 (#1719)

## [2.2.1] - 2023-05-17
### Changed
- Update node-core with fixes

## [2.2.0] - 2023-05-16
### Fixed
- `--dictionray-resolver` flag also requiring dictionary flag (#1714)

### Changed
- Changes relating to node-core and updating node-core

## [2.1.3] - 2023-05-12
### Changed
- Sync fix with
  - Fix app could fail to start, due to flush before metadata repo been set (#1688)

## [2.1.2] - 2023-05-12
### Changed
- Sync change with
  - Fix metadata check, allow base indexer manager to parse abis with ethereum (#1682)
  - Move validate function to common (#1683)
  - Inject the chain id into sandboxes (#1684)

## [2.1.1] - 2023-05-11
### Fixed
- Fix missing scheduler subcommands (#1677)

## [2.1.0] - 2023-05-10
### Added
- `bulkRemove` method on the store. (#1666)
- Ability to regenerate MMR (#1664)
- Ability to migrade MMR from file based db to postgres db and vice versa (#1618)

### Changed
- Move more chain agnostic to node-core. (#1658) (#1659)
- Move any polkadot imports to utils package. (#1653)
- Update node-core

## [2.0.2] - 2023-04-27
### Fixed
- Fix api not being defined, fix not using filter on dataSources (#1647)

### Changed
- Deprecate `localMode` (#1648)

## [2.0.1] - 2023-04-27
### Fixed
- Fix ApiService abstract class, improve getting all DS (#1638)
- Fix tests (#1640)
- Force flush cache with reindex command (#1645)
- Sync with
  - Fixed `StoreService` not been init due to assertion issue (#1641)

## [2.0.0] - 2023-04-20
### Added
- Added Database cache feature, this significantly improve indexing performance
  - Data flush to database when number of records reaches `--store-cache-threshold` value (default is 1000), this reduces number of transactions to database in order to save time.
  - Direct get data from the cache rather than wait to retrieve it from database, with flag `--store-get-cache-size` user could decide how many records for **each** entity they want to keep in the cache (default is 500)
  - If enabled `--store-cache-async` writing data to the store is asynchronous with regard to block processing (default is enabled)
- Testing Framework, allow users to test their projects filters and handler functions without having to index the project (#1584)
  - Create test files with the naming convention `*.test.ts` and place them in the `src/tests` or `src/test` folder. Each test file should contain test cases for specific mapping handlers.
  - Run the testing service using the command: `subql-node test`.

## [1.21.2] - 2023-04-17
### Fixed
- Fix workers fetching blocks out of order (#1616)

## [1.21.1] - 2023-03-30
### Added
- Support multiple endpoints (#1551)

### Fixed
- Fix previous release 1.21.0 failed

## [1.21.0] - 2023-03-29
### Changed
- Increase wsProvider timeout (#1550)
- Rename `--sponsored-dictionary` to `--dictionary-resolver` (#1559)

### Added
- Add SmartBatchService and BlockSizeBuffer (#1506)
- Improve api error handling (#1576)
- Update polkadot api to 10.1.4 (#1580)

### Fixed
- Fix POI block offset been reset to 1 (#1571)
- Remove blocking in process queueing (#1572)

## [1.20.0] - 2023-03-06
### Changed
- Move enum under schema (#1527)

### Fixed
- update for Deprecate `excludeConstraint` in node-core

## [1.19.0] - 2023-02-21
### Added
- Support Cockroach database (#1521)
- Add SSL connection option (#1513)

### Changed
- Worker use runtime service (#1491)

### Fixed
- When create new dynamic datasource, check queue for lower blocks before processing fetched blocks (#1509)
- Fix error with tempDsRecords being undefined with workers (#1516)

## [1.18.0] - 2023-01-23
### Added
- Add validation of dictionary with start height (#1473)
- Add block hash validation after fetch (#1494)

### Changed
- Update Polkadot api to 9.11.1 (#1469)

### Fixed
- Fix workers stuck due to missing set last buffered height from empty dictionary (#1492)

## [1.17.1] - 2022-12-22
### Changed
- error message for `genesisHash` (#1471)

### Fixed
- `triggerName`/ `channelName` too long, preventing indexer to start (#1469)

## [1.17.0] - 2022-12-19
### Fixed
- Remove unused RuntimeService from indexer module, it had missing dependencies (#1453)
- Fix subcommands bug (#1451)
- Fix SequelizeDatabaseError - tuple concurrently updated (#1458)
- Fix handle when Poi offset is 0 (#1459)
- Fix missing blocks when using workers (#1464)

### Added
- Add start height to project metadata (#1456)

## [1.16.0] - 2022-12-06
### Added
- Support for `bypassBlocks`feature. User can now state blocks to skip, this can be implemented by stating an array of blocks in the `project.yaml`. See docs [link](https://github.com/subquery/documentation/blob/master/docs/build/manifest/polkadot.md#bypass-blocks) (#1435)

## [1.15.1] - 2022-11-30
### Fixed
- Patch release with @subql/node-core fix

## [1.15.0] - 2022-11-23
### Added
- Dictionary auth link integration (#1411)
- Support multi chain indexing (#1375)

### Changed
- Move runtime logic to its own service, fix missing speChanged logic with getRuntime (#1421)

### Fixed
- Fix force-clean missing remove relate enums (#1427)

## [1.14.1] - 2022-11-16
### Changed
- Patch release with @subql/node-core fix (#1404)

## [1.14.0] - 2022-11-15
### Added
- Support hot schema reload (#1401)

## [1.13.3] - 2022-11-09
### Fixed
- Fix issue with reindex missing bind (#1391)

## [1.13.2] - 2022-11-08
### Changed
- Patch release with @subql/node-core fix

## [1.13.1] - 2022-11-08
### Changed
- Patch release with @subql/node-core fix

## [1.13.0] - 2022-11-07
### Changed
- Update polkadot to 9.7.1 (#1384)

### Fixed
- Fix logic with reindex and unfinalized height, also reset dynamic ds (#1382)
- Improve dictionary query (#1371)

## [1.12.0] - 2022-10-28
### Added
- Support for unfinalized blocks. This can be enabled with `--unfinalized-blocks` and requires historical indexing to be enabled. (#1308)

### Fixed
- Incomplete dynamic datasources in the same block. (#1370)

## [1.11.0] - 2022-10-27
### Fixed
- Issues with Dynamic Datasources being created in the same block. (#1363)
- Fixed log format flag not being applied. (#1351)

### Changed
- Optimise modulo filter when only using block filters. (#1358)
- Update to `@polkadot/api@9.4.2`/ (#1356)

### Added
- Timestamp block filter. (#1310)
- Log the node version on startup. (#1348)

## [1.10.2] - 2022-10-10
### Removed
- `Subqueries` database table. This is an internal change that should not affect users. (#1340)

## [1.10.1] - 2022-10-06
### Changed
- Update IPFS endpoints. (#1337)

### Fixed
- Benchmark info not being logged. (#1138)

## [1.10.0] - 2022-09-29
### Changed
- Enable historical feature by default. (#1327)

### Added
- Subcommands for `force-clean` and `reindex`. (#1281)
- `yargs` file has been moved back into `node` from `node-core`. (#1281)
- Update @polkadot/api to `9.4.2`. (#1325)

## [1.9.2] - 2022-09-19
### Changed
- In order to fix go-dictionary integration we changed dictionary query to use case-insensitive search for events/extrinsics name. (#1301)

## [1.9.1] - 2022-08-29
### Fixed
- Fixed `@subql/node-core` import path issues (#1272)

## [1.9.0] - 2022-08-26
### Changed
- Use `@subql/node-core` package. (#1222)
- Updated store.getByField to have limit and offset options. `getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;`. (#1259)

### Fixed
- Indexing stop processing blocks. (#1261)

## [1.8.0] - 2022-08-17
### Fixed
- Not parsing BigInt array entity fields correctly. (#1252)
- Cache lookup error with worker threads due to schema migration changes. (#1250)

### Added
- Improved performance logging. (#1244)
- `bulkUpdate` and `bulkGet` to the injected store. This can be used to optimise handlers and speed up indexing. (#1246)

## [1.7.0] - 2022-08-11
### Changed
- Update Polkadot/api to v9 (#1234)
- schema migration, allow user add/remove entity field after indexing started (#1226)

### Fixed
- Utilise dictionary if all block filters have `modulo` set (#1232)
- Bring back profiling fetchBlocksBatches, remove unnecessary await (#1235)
- Fix running custom ds processors in parallel on different data (#1243)

## [1.6.1] - 2022-08-02
### Fixed
- Fix one off events being missed on startup (#1224)

## [1.6.0] - 2022-07-27
### Changed
- Make handler data types generic (#1194)

### Added
- \[Experimental Feature] Support for worker threads. This will move block fetching and processing into a worker. It can increase performance by up to 4 times. By default, this feature is disabled. You can enable it with the `--workers=<number>` flag. The number of workers will be capped to the number of CPU cores. (#1103)
- \[Experimental Feature] Add reindexing feature. You can use `--reindex=<blockNumber>` to remove indexed data and reindex from specified block height. Please note that the way of using this feature will be updated soon. (#1208)
- Add block modulo filter on substrate blockHandler, E.g. if modulo: 50, the block handler will run on every 50 blocks. (#1196)

## [1.5.1] - 2022-07-15
### Fixed
- Unable to create ds processor from template when project hosted on IPFS (#1190)

## [1.5.0] - 2022-07-12
### Added
- add option `dictionary-timeout`, allow indexer decide timeout for query dictionary result (#1177)

### Changed
- Improve error log (#1174)
- Update Polkadot to 8.12.2 (#1179)
- Use `node-core` package

## [1.4.1] - 2022-07-07
### Fixed
- Fix oversize subscription notification trigger name (#1171)

## [1.4.0] - 2022-07-05
### Fixed
- Fix DI issue with EventEmitter not being resolved (#1154)
- Validate dictionary before use its specVersion (#1152)

### Changed
- use Http keepAlive and maxSockets, use http2 (#1150)

## [1.3.0] - 2022-06-29
### Changed
- Update tests with Manifest v1.0.0 (#1114)
- Update redecorate api, allow apiAt object to query data earlier than current indexing block (#1111)
- Using chain block time as interval to fetch latest finalized and best block height (#1134)

### Fixed
- Fix set block offset twice issue (#1133)
- Fix warning for fetch specVersion when dictionary undefined, and tidy up logs (#1127)
- Fix pending data being used when it should be reset with new DS (#1140)

## [1.2.1] - 2022-06-22
### Fixed
- Handle when templates are undefined

## [1.2.0] - 2022-06-22
### Added
- Use dictionary SpecVersion map (#1046)
- Support dictionary for dynamic ds (#1110)

### Changed
- Split setup code from indexer manager to another service (#1092)

### Fixed
- Handle when specVersion query response is undefined (#1097)
- Fix templates not being processed for manifest v1.0.0 (#1116)

## [1.1.2] - 2022-06-02
### Fixed
- Fixed btree_gist extension, also provide docker postgres with extension (#1090)
- Fixed handle multi datasources with different start block height (#1091)

## [1.1.1] - 2022-06-01
### Fixed
- Fix disabling historical (#1085)
- Fix benchmark logging (#1083)

## [1.1.0] - 2022-05-31
### Fixed
- Move POI logic under option check (#1064)

### Added
- Add api to query file based mmr (#968)
- Experimental feature: Support query by block number (#992)

## [1.0.0] - 2022-05-11
### Changed
- Major release

## [0.35.2] - 2022-05-10
### Fixed
- Priority: High. Fixes events being handled multiple times, issue was introduced in 0.34.0 (#994)

## [0.35.1] - 2022-05-06
### Changed
- Bump with `@subql/utils`

## [0.35.0] - 2022-05-02
### Added
- Add utils package (#928)

### Fixed
- Handle undefined filters (#929)

### Changed
- Update polkadot 8.2.1 (#910)

## [0.34.0] - 2022-04-26
### Changed
- Remove notify trigger if subscription disabled (#882)
- Drop support for manifest v0.0.1 (#900)
- Process block content in time secquence rather than ds/handler order (#853)

### Fixed
- Fixed the mmr inconsistent value issue, remove redundant code,  and set `blockOffset` value to the first store operation blockHeight -1 (#894)

## [0.33.0] - 2022-04-06
### Added
- Add support for handle manifest 1.0.0 (#845)

## [0.32.0] - 2022-04-04
### Changed
- Update to use `vm2`(#869)
- Update Polkadot/api to 7.14.3 (#866)
- move subscription to dedicate flag (#867)

## [0.31.1] - 2022-03-23
### Fixed
- Fix subscription notification trigger name invalid issue(#862)

## [0.31.0] - 2022-03-22
### Changed
- Update Polkadot/api to 7.12.1 (#849)

### Added
- Add Notification Trigger in order to support GraphQL subscription (#846)

## [0.30.2] - 2022-03-15
### Fixed
- Fix unable able fetch with small batch size issue (#847)

## [0.30.1] - 2022-03-10
### Fixed
- Fix enum sort order (#844)

## [0.30.0] - 2022-03-01
### Changed
- Update imports, as substrate related components now will be imported from `subql/common-substrate`. (#781)

## [0.29.1] - 2022-02-23
### Fixed
- Fix get default subquery name (#820)

## [0.29.0] - 2022-02-23
### Changed
- Update Polkadot/api to 7.9.1 (#815)
- Support node indexing from a manifest file (#800)

## [0.28.2] - 2022-02-16
### Changed
- Update Polkadot/api to 7.8.1 ,in order to resolve previous release issue (#806)

## [0.28.1] - 2022-02-15
### Fixed
- Fixed issue that node stop fetch block when set batch size to 1. (#802)

## [0.28.0] - 2022-02-09
### Added
- Support running the indexer from locations other than the filesystem, and refactor `SubqueryProject` class (#511)
- Add support for index dynamic datasources (#773)
- Add support for historical RPC methods that use BlockNumber (#788)

### Changed
- Update Polkadot/api to 7.7.1 (#787)

### Fixed
- Fixed mmr initialization start height issue (#600)

## [0.27.2] - 2022-01-23
### Changed
- Update Polkadot/api to 7.4.1 (#757)

### Fixed
- Fix genesis hash validation for manifest v0.0.1 (#762)

## [0.27.1] - 2022-01-18
### Changed
- Ready endpoint return code (#750)

## [0.27.0] - 2022-01-13
### Changed
- Deprecate local mode (#725)
- Update Polkadot/api to 7.3.1 (#745)

### Added
- Add ready status of indexer to endpoint (#728)
- Add `--port` option, auto find available port when the default one is occupied. (#739)ss

### Fixed
- Fix handle chainTypes error (#732)
- Try catch on init api with chainTypes (#738)
- Verify project store genesis hash with network genesis hash, instead of check specName only (#735)
- Remove update metadata last processed block by interval (#740)
- Use Promise.all for set metadata (#743)

## [0.26.0] - 2021-12-16
### Added
- Support dictionary for custom datasource (#686)
- Automatic adjust fetched block batch size based on memory usage, enable by passing `--scale-batch-size` (#668)
- Depreciate subqueries table (#683)
- Add `bulkCreate()` to `store`  (#699)
- Add support for loading chaintypes from js (#698)

### Fixed
- Fix name escaping with db queries (#702)
- Fix `lastProcessedHeight` value representation (#711)

## [0.25.3] - 2021-12-02
### Fixed
- Skip insert poi when db transaction is null (#687)
- Replace enum index with unique hash value, in order resolve schema type name conflict issue.(#688)

## [0.25.2] - 2021-11-30
### Fixed
- Upgrade dependency common, in order to remove auto generated enum types from entities relations (#682)

## [0.25.1] - 2021-11-27
### Fixed
- Fix variable replacement in dictionary's gql, remove the quote wrapping (#673)

### Changed
- set default false for `--timestamp-field` (#661)

## [0.25.0] - 2021-11-19
### Fixed
- Fix publish failing with custom ds and assets (#610)
- Support for enum, add into store and store operations (#551)

### Added
- Allow running node from a different port through flag `—port`(#618)
- Add flag `force-clean`, force clean the database, dropping project schemas and tables (#619)
- Add `unsafe` flag for subql/node (#629)

### Changed
- Merge metadata from query and node (#555)
- Refactor dictionary gql queries (#613)
- Use types mapping in storeOperation (#532)
- Replace patch api with `api.at()` (#638)
- Update polkadot api to 6.9.2 (#648)

## [0.24.0] - 2021-11-03
### Added
- \[custom ds] Read and feed assets to custom ds's `validate()` (#547)
- Improve error msg when fetch block fails (#602)

### Changed
- Bump dependencies (#584)
- Moonbeam EVM,  filter before transforming with custom datasource (#593)
- Update Polkadot/api to 6.6.1 (#599)

### Fixed
- Moonbeam networks shows negative bps and fail Healthy checks (#589)

## [0.23.1] - 2021-10-27
### Fixed
- Disable the profiler on health check and remove logs (#569)

## [0.23.0] - 2021-10-26
### Added
- Add MMR service allow to acquire Proof of index information and generate Merkle mountain range root, create and store root value in a file-based database, simultaneously it updates in the corresponding MMR value in the `_poi` table.
  This feature will be running along with the Proof of index service, also allow the user to specify a local path for .mmr by using flag `--mmr-path`. (#488)
- Introduce custom datasource (beta), enable subql to support a vary kind of smart contract solutions that embedded in parachains (#512)

### Changed
- Update Polkadot/api to 6.5.2 (#564)

### Fixed
- Performance improvement (#565)

## [0.22.0] - 2021-10-12
### Changed
- Update Polkadot/api to 6.3.1 to support metadata v14 (#505)
- Fetch service improve logs to include block height，it threw error at the time (#492)

### Fixed
- Throw errors when connection dropped by http, and exit (#519)
- Addition fix for Poi service with if condition (#508)

### Added
- Support project manifest 0.2.0 (#495)

## [0.21.1] - 2021-09-18
### Fixed
- Fixed apollo/client dependency issue (#482)

## [0.21.0] - 2021-09-16
### Changed
- Update Polkadot/api to 5.9.1 (#476)

### Added
- Api service support http(s) endpoint (#474)
- Add Proof-of-index service allow generate and record the hash of indexed work. User can enable this feature through the `--proof-of-work` command. Please note that this feature is currently in an experimental stage. (#443)

## [0.20.3] - 2021-09-01
### Changed
- Update Polkadot/api to 5.7.1 (#460)

## [0.20.2] - 2021-08-28
### Fixed
- Solve the missing block height of the event/extrinsic in the batch returned by the dictionary service  (#452)

## [0.20.1] - 2021-08-27
### Fixed
- Deprecated warnings (#448)

## [0.20.0] - 2021-08-20
### Changed
- Update Polkadot/api to 5.5.2 (#439)

### Added
- support interpret Bytea type (#432)

## [0.19.2] - 2021-08-16
### Fixed
- Improve data sources filtering handling and error messages (#417)

### Changed
- Adjust health check time to be the same as indexer timeout, or a minimum of 900 seconds. Also, log error when it is not healthy (#420)
- Update Polkadot/api to 5.5.1 (#433)

## [0.19.1] - 2021-07-29
### Fixed
- When the schema object type is an array convert to Jsonb type (#406)

## [0.19.0] - 2021-07-27
### Changed
- Bump `polkadot/api` to 5.2.1 (#402)

### Fixed
- Disable `api.at()` in patched API (#402)
- Fix to improve snake case handling for foreign keys and unique index constraint (#382)
- Fix `subql-node --help` so that it displays full options (#396)

### Added
- Expose best block height in meta (#392)

## [0.18.0] - 2021-07-06
### Fixed
- Fix metric listener handle skip dictionary (#380)

## [0.17.4] - 2021-07-06
### Fixed
- Fix problem when filling the block number buffer missing the last number which has caused some block records are missing. (#378)

## [0.17.3] - 2021-07-06
### Fixed
- Fixed bug that prevented indexes from being added automatically on foreign keys (#371)

### Added
- add profiler to monitoring indexer performance (#369)
- add metrics to listen status of using dictionary and number of times it been skipped. (#369)

## [0.17.2] - 2021-07-01
### Fixed
- fix get runtimeVersion failed when fetch service initialization (#367)
- set useDictionary to false when one of the event/extrinsic filters are not provided (#367)

## [0.17.1] - 2021-06-29
### Fixed
- Fix an edge case for dictionary query, add blocknumber max range to speed up dictionary (#365)

## [0.17.0] - 2021-06-25
### Added
- Add an external dictionary feature to massively improve indexing speed.
  - Enable by `--network-dictionary=<dictionary_HTTP_url>` or in `project.yaml` - [read more](https://doc.subquery.network/run/run.html#using-a-dictionary) (#342)
  - Add dictionary service to fetch dictionary from external GraphQL API (#342)
  - Add additional block number buffer in fetch service to handle incoming dictionary data (#342)

### Changed
- replace vm2 with @subql/x-vm2 (#358)
- Update other dependencies (#358)

## [0.16.2] - 2021-06-28
### Changed
- Bump polkadot/api to 4.16.2 (#363)

## [0.16.1] - 2021-06-22
### Added
- Add arg for enable/disable timestamp created_at and updated_at though `--timestamp-field` (#352)

## [0.16.0] - 2021-06-22
### Changed
- metadata expose last processed block (#327)
- Remove created_at and updated_at from table (#343)
- Bump polkadot/api to 4.15.1 (#350)

## [0.15.1] - 2021-05-27
### Changed
- Bump polkadot/api to 4.11.2

## [0.15.0] - 2021-05-24
### Changed
- Bump polkadot/api to 4.11.1

### Fixed
- Skip fetch finalized block until API is ready.
- Fix indexes detection

## [0.14.0] - 2021-05-19
### Fixed
- Use pull instead of subscribe to get new block height. This solves issues where the subscription stalls and SubQuery reports an incorrect block height.

### Changed
- Not all `api.rpc` are banned now, historical RPC methods can be called. See the docs [link](https://doc.subquery.network/create/mapping.html#rpc-calls) (#304)
- Bump polkadot/api dependency (#310)
- Replace vm2 with fork to support lib like `@polkadot/*` that uses esm as default (#311)

## [0.13.0] - 2021-05-06
### Added
- Bump release version due to recent major updates, also need publish new release to npm.

## [0.12.3] - 2021-05-04
### Added
- Automatically verifies that a model's indexed fields are supported by extracting indexed fields from the database (#289)
- \[Experimental Feature] We're removed the restrictions on using third party CommonJS libraries in your SubQuery project sandbox - please read more about this in our [updated documentation](https://doc.subquery.network/create/mapping.html##modules-and-libraries) (#292)
- Support for more NodeJS modules (`buffer`, `crypto`, `util`, `events`, and `path`) (#294)

## [0.12.2] - 2021-04-21
### Added
- Enforce index on foreign key field (#285)

### Fixed
- Improve logs for db sync, catch error and exit (#283)

## [0.12.0] - 2021-04-20
### Fixed
- Bump dependencies for logger
- Fix query for double map storage (#269)

### Added
- Support network filter for dataSources (#247)
- Expose events in SubstrateBlock (#256)
- api.findCall and api.findError will use current block's metadata (#251)
- Inject global variable logger in sandbox and depricated console.log in subquery project, use logger instead. (#259)
- Create indexes on the fields with @index and allow querying by indexed field (#271)
- Create jsonb column for fields marked as jsonField in schema.graphql (#275)
- Bump @polkadot/api version to v4.6.2

## [0.11.0] - 2021-03-25
### Fixed
- Fix benchmark output format issues (#235)
- Only warning when user set start block to number smaller than 1. (#239)

### Added
- Support entity relations (#132)
- Refactor api.query...multi(),  api.queryMulti() to use rpc.queryStorageAt() (#244)

## [0.10.2] - 2021-03-11
### Added
- refactor logger to @subql/common (#220)
- Bump polkadot/js version to v4.0.3 which shall fix a chain data decoding issue (#222)

## [0.10.1] - 2021-03-03
### Fixed
- use parent's specVersion to decide if metadata need to be injected (#211)

## [0.10.0] - 2021-03-03
### Added
- performance improvement: reduce injectMetadata call (#206)
- performance improvement: reduce specVersion query for each batch (#207)

## [0.9.2] - 2021-03-03
### Added
- more comprehensive timeout error stack (#198)
- use logger.info() instead of log() for sandbox logging (#197)
- estimate time remaining consider block increases (#199)
- add configurable timeout (#202)
- bump @polkadot/api to 3.11.1 (#203)

## [0.9.1] - 2021-03-03
### Fixed
- revert metrics name changes (#193)

### Added
- Update subquery starter repo path to new organization (#196)

## [0.9.0] - 2021-02-23
### Added
- Ian improve error logging (#181): support --log-level flag, error stack will be correctly organized
- Add benchmark outputs (#183): will print benchmark stats every 15s
- add meta api and store network info in subqueries table (#191)

### Fixed
- fix memory overflow and timeouts while indexing a large number of events

## [0.8.3] - 2021-02-17
### Fixed
- keep retrying failed block not skipping it (#175)

## [0.8.2] - 2021-02-16
### Fixed
- fix query.system.lastRuntimeUpgrade return null before the first runtime upgrade, use rpc.state.getRuntimeVersion instead (#169)
- after connection reconnected, indexing will now resume (#168)

## [0.8.1] - 2021-02-15
### Fixed
- fix dependencies (#164)

## [0.8.0] - 2021-02-15
### Changed
- bump dependencies
- don't freeze table name (#161)

### Added
- cache metadata if specVersion bumped (#156)
- improve logging, support --output-fmt=json (#158)
- support override network endpoint from --network-endpoint flag (#157)
- add prometheus metrics (#159)

## [0.7.0] - 2021-01-27
### Fixed
- fix crash for events not own by extrinsic (#120)

### Added
- batch fetch blocks (#124)
- wrap all handler executions of same block in a db transaction (#125)
- node add startscript (#128)

## [0.6.0] - 2021-01-25
### Changed
- bump @polkadot/api (#90)
- clean up console output unless start with --debug (#95)
- bump @polkadot/api to v3.6.3 (#109)

### Added
- patch and inject api in sandbox context (#103)
- support specVersion filter and success filter (#106)
- support other custom types option that @polkadot/api has (#107)

## [0.5.0] - 2021-01-15
### Fixed
- Fix BigInt transformation (#79)

### Changed
- escalate sandbox out of IndexerManager (#83)

## [0.4.0] - 2021-01-12
### Added
- allow user to define start block in project (#54)
- add local flag to support create all tables in the default db schema (#59)
- retry when can not establish connection with postgres (#61)
- add priority to find subquery project entry point from package json file (#60)
- support load project from tarball file (#55)

### Fixed
- read db connection strings from env (#63)

### Changed
- \[BREAKING] project manifest spec updated to support custom types (#65)

## [0.3.0] - 2021-01-06
### Added
- support callHandler and eventHandler (#47)

## [0.2.0] - 2020-12-22
### Added
- support block handler
- put subquery tables in their own db schema
- use BigInt instead of BN (#27)

### Changed
- bump @polkadot/api to 3.1.1

[Unreleased]: https://github.com/subquery/subql/compare/node/5.2.2...HEAD
[5.2.2]: https://github.com/subquery/subql/compare/node/5.2.1...node/5.2.2
[5.2.1]: https://github.com/subquery/subql/compare/node/5.2.0...node/5.2.1
[5.2.0]: https://github.com/subquery/subql/compare/node/5.1.0...node/5.2.0
[5.1.0]: https://github.com/subquery/subql/compare/node/5.0.2...node/5.1.0
[5.0.2]: https://github.com/subquery/subql/compare/node/5.0.1...node/5.0.2
[5.0.1]: https://github.com/subquery/subql/compare/node/5.0.0...node/5.0.1
[5.0.0]: https://github.com/subquery/subql/compare/node/4.9.0...node/5.0.0
[4.9.0]: https://github.com/subquery/subql/compare/node/4.8.2...node/4.9.0
[4.8.2]: https://github.com/subquery/subql/compare/node/4.8.1...node/4.8.2
[4.8.1]: https://github.com/subquery/subql/compare/node/4.8.0...node/4.8.1
[4.8.0]: https://github.com/subquery/subql/compare/node/4.7.1...node/4.8.0
[4.7.1]: https://github.com/subquery/subql/compare/node/4.7.0...node/4.7.1
[4.7.0]: https://github.com/subquery/subql/compare/node/4.6.6...node/4.7.0
[4.6.6]: https://github.com/subquery/subql/compare/node/4.6.5...node/4.6.6
[4.6.5]: https://github.com/subquery/subql/compare/node/4.6.4...node/4.6.5
[4.6.4]: https://github.com/subquery/subql/compare/node/4.6.3...node/4.6.4
[4.6.3]: https://github.com/subquery/subql/compare/node/4.6.2...node/4.6.3
[4.6.2]: https://github.com/subquery/subql/compare/node/4.6.1...node/4.6.2
[4.6.1]: https://github.com/subquery/subql/compare/node/4.6.0...node/4.6.1
[4.6.0]: https://github.com/subquery/subql/compare/node/4.5.1...node/4.6.0
[4.5.1]: https://github.com/subquery/subql/compare/node/4.5.0...node/4.5.1
[4.5.0]: https://github.com/subquery/subql/compare/node/4.4.2...node/4.5.0
[4.4.2]: https://github.com/subquery/subql/compare/node/4.4.1...node/4.4.2
[4.4.1]: https://github.com/subquery/subql/compare/node/4.4.0...node/4.4.1
[4.4.0]: https://github.com/subquery/subql/compare/node/4.3.2...node/4.4.0
[4.3.2]: https://github.com/subquery/subql/compare/node/4.3.1...node/4.3.2
[4.3.1]: https://github.com/subquery/subql/compare/node/4.3.0...node/4.3.1
[4.3.0]: https://github.com/subquery/subql/compare/node/4.2.1...node/4.3.0
[4.2.1]: https://github.com/subquery/subql/compare/node/4.2.0...node/4.2.1
[4.2.0]: https://github.com/subquery/subql/compare/node/4.1.0...node/4.2.0
[4.1.0]: https://github.com/subquery/subql/compare/node/4.0.1...node/4.1.0
[4.0.1]: https://github.com/subquery/subql/compare/node/4.0.0...node/4.0.1
[4.0.0]: https://github.com/subquery/subql/compare/node/3.10.0...node/4.0.0
[3.10.0]: https://github.com/subquery/subql/compare/node/3.9.3...node/3.10.0
[3.9.3]: https://github.com/subquery/subql/compare/node/3.9.2...node/3.9.3
[3.9.2]: https://github.com/subquery/subql/compare/node/3.9.1...node/3.9.2
[3.9.1]: https://github.com/subquery/subql/compare/node/3.9.0...node/3.9.1
[3.9.0]: https://github.com/subquery/subql/compare/node/3.6.1...node/3.9.0
[3.6.1]: https://github.com/subquery/subql/compare/node/3.6.0...node/3.6.1
[3.6.0]: https://github.com/subquery/subql/compare/node/3.5.3...node/3.6.0
[3.5.3]: https://github.com/subquery/subql/compare/node/3.5.1...node/3.5.3
[3.5.1]: https://github.com/subquery/subql/compare/node/3.5.0...node/3.5.1
[3.5.0]: https://github.com/subquery/subql/compare/node/3.4.11...node/3.5.0
[3.4.11]: https://github.com/subquery/subql/compare/node/3.4.10...node/3.4.11
[3.4.10]: https://github.com/subquery/subql/compare/node/3.4.9...node/3.4.10
[3.4.9]: https://github.com/subquery/subql/compare/node/3.4.8...node/3.4.9
[3.4.8]: https://github.com/subquery/subql/compare/node/3.4.7...node/3.4.8
[3.4.7]: https://github.com/subquery/subql/compare/node/3.4.6...node/3.4.7
[3.4.6]: https://github.com/subquery/subql/compare/node/3.4.5...node/3.4.6
[3.4.5]: https://github.com/subquery/subql/compare/node/3.4.4...node/3.4.5
[3.4.4]: https://github.com/subquery/subql/compare/node/3.4.3...node/3.4.4
[3.4.3]: https://github.com/subquery/subql/compare/node/3.4.2...node/3.4.3
[3.4.2]: https://github.com/subquery/subql/compare/node/3.4.1...node/3.4.2
[3.4.1]: https://github.com/subquery/subql/compare/node/3.4.0...node/3.4.1
[3.4.0]: https://github.com/subquery/subql/compare/node/3.3.0...node/3.4.0
[3.3.0]: https://github.com/subquery/subql/compare/node/3.2.0...node/3.3.0
[3.2.0]: https://github.com/subquery/subql/compare/node/3.1.1...node/3.2.0
[3.1.1]: https://github.com/subquery/subql/compare/node/3.1.0...node/3.1.1
[3.1.0]: https://github.com/subquery/subql/compare/v3.0.8...v3.1.0
[3.0.8]: https://github.com/subquery/subql/compare/node/3.0.7...node/3.0.8
[3.0.7]: https://github.com/subquery/subql/compare/node/3.0.6...node/3.0.7
[3.0.6]: https://github.com/subquery/subql/compare/node/3.0.5...node/3.0.6
[3.0.5]: https://github.com/subquery/subql/compare/node/3.0.4...node/3.0.5
[3.0.4]: https://github.com/subquery/subql/compare/node/3.0.3...node/3.0.4
[3.0.3]: https://github.com/subquery/subql/compare/node/3.0.2...node/3.0.3
[3.0.2]: https://github.com/subquery/subql/compare/node/3.0.1...node/3.0.2
[3.0.1]: https://github.com/subquery/subql/compare/node/2.12.2...node/3.0.1
[2.12.2]: https://github.com/subquery/subql/compare/node/2.12.1...node/2.12.2
[2.12.1]: https://github.com/subquery/subql/compare/node/2.12.0...node/2.12.1
[2.12.0]: https://github.com/subquery/subql/compare/node/2.11.1...node/2.12.0
[2.11.1]: https://github.com/subquery/subql/compare/node/2.11.0...node/2.11.1
[2.11.0]: https://github.com/subquery/subql/compare/node/2.10.1...node/2.11.0
[2.10.1]: https://github.com/subquery/subql/compare/node/2.10.0...node/2.10.1
[2.10.0]: https://github.com/subquery/subql/compare/node/2.9.3...node/2.10.0
[2.9.3]: https://github.com/subquery/subql/compare/node/2.9.2...node/2.9.3
[2.9.2]: https://github.com/subquery/subql/compare/node/2.9.1...node/2.9.2
[2.9.1]: https://github.com/subquery/subql/compare/node/2.9.0...node/v2.9.1
[2.9.0]: https://github.com/subquery/subql/compare/node/2.8.0...node/2.9.0
[2.8.0]: https://github.com/subquery/subql/compare/node/2.7.0...node/2.8.0
[2.7.0]: https://github.com/subquery/subql/compare/node/2.6.1...node/2.7.0
[2.6.1]: https://github.com/subquery/subql/compare/node/2.6.0...node/2.6.1
[2.6.0]: https://github.com/subquery/subql/compare/node/2.5.5...node/2.6.0
[2.5.5]: https://github.com/subquery/subql/compare/node/2.5.4...node/2.5.5
[2.5.4]: https://github.com/subquery/subql/compare/node/2.5.3...node/2.5.4
[2.5.3]: https://github.com/subquery/subql/compare/node/2.5.2...node/2.5.3
[2.5.2]: https://github.com/subquery/subql/compare/node/2.5.1...node/2.5.2
[2.5.1]: https://github.com/subquery/subql/compare/node/2.5.0...node/2.5.1
[2.5.0]: https://github.com/subquery/subql/compare/node/2.4.1...node/2.5.0
[2.4.1]: https://github.com/subquery/subql/compare/node/2.4.0...node/2.4.1
[2.4.0]: https://github.com/subquery/subql/compare/node/2.3.0...node/2.4.0
[2.3.0]: https://github.com/subquery/subql/compare/node/2.2.1...node/2.3.0
[2.2.1]: https://github.com/subquery/subql/compare/node/2.2.0...node/2.2.1
[2.2.0]: https://github.com/subquery/subql/compare/node/2.1.3...node/2.2.0
[2.1.3]: https://github.com/subquery/subql/compare/node/2.1.2...node/2.1.3
[2.1.2]: https://github.com/subquery/subql/compare/node/2.1.1...node/2.1.2
[2.1.1]: https://github.com/subquery/subql/compare/node/2.1.0...node/2.1.1
[2.1.0]: https://github.com/subquery/subql/compare/node/2.0.2...node/2.1.0
[2.0.2]: https://github.com/subquery/subql/compare/node/2.0.1...node/2.0.2
[2.0.1]: https://github.com/subquery/subql/compare/node/2.0.0...node/2.0.1
[2.0.0]: https://github.com/subquery/subql/compare/node/1.21.2...node2.0.0/
[1.21.2]: https://github.com/subquery/subql/compare/node/1.21.1...node1.21.2/
[1.21.1]: https://github.com/subquery/subql/compare/node/1.21.0...node/1.21.1
[1.21.0]: https://github.com/subquery/subql/compare/node/1.20.0...node/1.21.0
[1.20.0]: https://github.com/subquery/subql/compare/node/1.19.0...node/1.20.0
[1.19.0]: https://github.com/subquery/subql/compare/node/1.18.0...node/1.19.0
[1.18.0]: https://github.com/subquery/subql/compare/node/1.17.1...node/1.18.0
[1.17.1]: https://github.com/subquery/subql/compare/node/1.17.0...node/1.17.1
[1.17.0]: https://github.com/subquery/subql/compare/node/1.16.0...node/1.17.0
[1.16.0]: https://github.com/subquery/subql/compare/node/1.15.1...node/1.16.0
[1.15.1]: https://github.com/subquery/subql/compare/node/1.15.0...node/1.15.1
[1.15.0]: https://github.com/subquery/subql/compare/node/1.14.1...node/1.15.0
[1.14.1]: https://github.com/subquery/subql/compare/node/1.14.0...node/1.14.1
[1.14.0]: https://github.com/subquery/subql/compare/node/1.13.3...node/1.14.0
[1.13.3]: https://github.com/subquery/subql/compare/node/1.13.2...node/1.13.3
[1.13.2]: https://github.com/subquery/subql/compare/node/1.13.1...node/1.13.2
[1.13.1]: https://github.com/subquery/subql/compare/node/1.13.0...node/1.13.1
[1.13.0]: https://github.com/subquery/subql/compare/node/1.12.0...node/1.13.0
[1.12.0]: https://github.com/subquery/subql/compare/node/1.11.0...node/1.12.0
[1.11.0]: https://github.com/subquery/subql/compare/node/1.10.2...node/1.11.0
[1.10.2]: https://github.com/subquery/subql/compare/node/1.10.1...node/1.10.2
[1.10.1]: https://github.com/subquery/subql/compare/node/1.10.0...node/1.10.1
[1.10.0]: https://github.com/subquery/subql/compare/node/1.9.2...node/1.10.0
[1.9.2]: https://github.com/subquery/subql/compare/node/1.9.1...node/1.9.2
[1.9.1]: https://github.com/subquery/subql/compare/node/1.9.0...node/1.9.1
[1.9.0]: https://github.com/subquery/subql/compare/node/1.8.0...node/1.9.0
[1.8.0]: https://github.com/subquery/subql/compare/node/1.7.0...node/1.8.0
[1.7.0]: https://github.com/subquery/subql/compare/node/1.6.1...node/1.7.0
[1.6.1]: https://github.com/subquery/subql/compare/node/1.6.0...node/1.6.1
[1.6.0]: https://github.com/subquery/subql/compare/node/1.5.1...node/1.6.0
[1.5.1]: https://github.com/subquery/subql/compare/node/1.5.0...node/1.5.1
[1.5.0]: https://github.com/subquery/subql/compare/node/1.4.1...node/1.5.0
[1.4.1]: https://github.com/subquery/subql/compare/node/1.4.0...node/1.4.1
[1.4.0]: https://github.com/subquery/subql/compare/node/1.3.0...node/1.4.0
[1.3.0]: https://github.com/subquery/subql/compare/node/1.2.1...node/1.3.0
[1.2.1]: https://github.com/subquery/subql/compare/node/1.2.0...node/1.2.1
[1.2.0]: https://github.com/subquery/subql/compare/node/1.1.2...node/1.2.0
[1.1.2]: https://github.com/subquery/subql/compare/node/1.1.1...node/1.1.2
[1.1.1]: https://github.com/subquery/subql/compare/node/1.1.0...node/1.1.1
[1.1.0]: https://github.com/subquery/subql/compare/node/1.0.0...node/1.1.0
[1.0.0]: https://github.com/subquery/subql/compare/node/0.35.2...node1.0.0/
[0.35.2]: https://github.com/subquery/subql/compare/node/0.35.1...node0.35.2/
[0.35.1]: https://github.com/subquery/subql/compare/node/0.35.0...node/0.35.1
[0.35.0]: https://github.com/subquery/subql/compare/node/0.34.0...node/0.35.0
[0.34.0]: https://github.com/subquery/subql/compare/node/0.33.0...node/0.34.0
[0.33.0]: https://github.com/subquery/subql/compare/node/0.32.0...node/0.33.0
[0.32.0]: https://github.com/subquery/subql/compare/node/0.31.1...node/0.32.0
[0.31.1]: https://github.com/subquery/subql/compare/node/0.31.0...node/0.31.1
[0.31.0]: https://github.com/subquery/subql/compare/node/0.30.2...node/0.31.0
[0.30.2]: https://github.com/subquery/subql/compare/node/0.30.1...node/0.30.2
[0.30.1]: https://github.com/subquery/subql/compare/node/0.30.0...node/0.30.1
[0.30.0]: https://github.com/subquery/subql/compare/node/0.29.1...node/0.30.0
[0.29.1]: https://github.com/subquery/subql/compare/node/0.29.0...node/0.29.1
[0.29.0]: https://github.com/subquery/subql/compare/node/0.28.2...node/0.29.1
[0.28.2]: https://github.com/subquery/subql/compare/node/0.28.1...node/0.28.2
[0.28.1]: https://github.com/subquery/subql/compare/node/0.28.0...node/0.28.1
[0.28.0]: https://github.com/subquery/subql/compare/node/0.27.2...node/0.28.0
[0.27.2]: https://github.com/subquery/subql/compare/node/0.27.1...node/0.27.2
[0.27.1]: https://github.com/subquery/subql/compare/node/0.27.0...node/0.27.1
[0.27.0]: https://github.com/subquery/subql/compare/node/0.26.0...node/0.27.0
[0.26.0]: https://github.com/subquery/subql/compare/node/0.25.3...node/0.26.0
[0.25.3]: https://github.com/subquery/subql/compare/node/0.25.2...node/0.25.3
[0.25.2]: https://github.com/subquery/subql/compare/node/0.25.1...node/0.25.2
[0.25.1]: https://github.com/subquery/subql/compare/node/0.25.0...node/0.25.1
[0.25.0]: https://github.com/subquery/subql/compare/node/0.24.0...node/0.25.0
[0.24.0]: https://github.com/subquery/subql/compare/node/0.23.1...node/0.24.0
[0.23.1]: https://github.com/subquery/subql/compare/node/0.23.0...node/0.23.1
[0.23.0]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.22.0]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.21.1]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.21.0]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.20.3]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.20.2]: https://github.com/subquery/subql/compare/v0.20.1...v0.20.2
[0.20.1]: https://github.com/subquery/subql/compare/v0.20.0...v0.20.1
[0.20.0]: https://github.com/subquery/subql/compare/v0.19.2...v0.20.0
[0.19.2]: https://github.com/subquery/subql/compare/v0.19.1...v0.19.2
[0.19.1]: https://github.com/subquery/subql/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/subquery/subql/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/subquery/subql/compare/v0.17.4...v0.18.0
[0.17.4]: https://github.com/subquery/subql/compare/v0.17.3...v0.17.4
[0.17.3]: https://github.com/subquery/subql/compare/v0.17.2...v0.17.3
[0.17.2]: https://github.com/subquery/subql/compare/v0.17.1...v0.17.2
[0.17.1]: https://github.com/subquery/subql/compare/v0.17.0...v0.17.1
[0.17.0]: https://github.com/subquery/subql/compare/v0.17.0...v0.17.0
[0.16.2]: https://github.com/subquery/subql/compare/v0.16.1...v0.16.2
[0.16.1]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.16.0]: https://github.com/subquery/subql/compare/v0.15.1...v0.16.0
[0.15.1]: https://github.com/subquery/subql/compare/v0.15.0...v0.15.1
[0.15.0]: https://github.com/subquery/subql/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/subquery/subql/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/subquery/subql/compare/v0.12.3...v0.13.0
[0.12.3]: https://github.com/subquery/subql/compare/v0.12.2...v0.12.3
[0.12.2]: https://github.com/subquery/subql/compare/v0.12.0...v0.12.2
[0.12.0]: https://github.com/subquery/subql/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/subquery/subql/compare/v0.10.2...v0.11.0
[0.10.2]: https://github.com/subquery/subql/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/subquery/subql/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/subquery/subql/compare/v0.9.2...v0.10.0
[0.9.2]: https://github.com/subquery/subql/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/subquery/subql/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/OnFinality-io/subql/compare/v0.8.3...v0.9.0
[0.8.3]: https://github.com/OnFinality-io/subql/compare/v0.8.2...v0.8.3
[0.8.2]: https://github.com/OnFinality-io/subql/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/OnFinality-io/subql/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/OnFinality-io/subql/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/OnFinality-io/subql/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/OnFinality-io/subql/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/OnFinality-io/subql/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/OnFinality-io/subql/tags/v0.2.0
