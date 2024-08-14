# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [14.1.2] - 2024-08-14
### Added
- Update polkadot/api library

## [14.1.1] - 2024-08-12
### Fixed
- revert yargs version as it was returning a promise
- DS Processor types not being able to distinguish input and filter types (#2522)

## [14.1.0] - 2024-08-05
### Changed
- Update dependencies (#2518)

## [14.0.0] - 2024-08-01
### Added
- A more useful error message when failing to require modules from the VM (#2512)
- Support for endpoint configs (#2511)

### Fixed
- Handle when block timestamp can be undefined (#2513)

## [13.0.2] - 2024-07-31
### Fixed
- Fixed project upgrade missing reload network chainTypes when `onProjectChange` (#2505)

## [13.0.1] - 2024-07-29
### Fixed
- Fixed get and set data not been deepCloned and data is not mutable
- Improved get bigInt type from json type

## [13.0.0] - 2024-07-25
### Changed
- Breaking change: Require indexing environment timezone set to UTC, avoid inconsistent result from cache and database (#2495)

### Fixed
- Fix handle bigint type in jsonb array, both get and set method will generate consistent result (#2495)
- Update with `@subql/utils`, fixed json and json array hashcode issue, improve poi consistency (#2497)

### Added
- SubqueryProject base from extracting common code (#2496)

## [12.0.0] - 2024-07-22
### Changed
- Provide a better error message when user increases project start height beyond indexed height (#2492)
- Define new core modules to reduce duplicate code in nodes (#2491)

### Fixed
- "targetHeight" being updated out of sync with indexing, leading to it possibly being behind "lastProcessedHeight" (#2491)

## [11.0.0] - 2024-07-11
### Changed
- Create interval for flushing the cache, this is to support chains that only produce blocks with new transactions (#2485)
- Improved types for strict TS setting (#2484)

### Fixed
- Improve indexer could stall due to rpc finalized height could be smaller than previous result (#2487)

## [10.10.2] - 2024-07-10
### Fixed
- Fix issue admin api can not get `dbSize` due to it not been set in \_metadata table

## [10.10.1] - 2024-07-09
### Added
- Enable ts strict setting

### Fixed
- Incrementing the schemaMigration count on every start (#2476)

## [10.10.0] - 2024-07-01
### Changed
- Bump version with `@subql/common`

## [10.9.0] - 2024-06-21
### Fixed
- Store service index check failing with snake_case fields (#2461)

### Changed
- Error message for finding available port

## [10.6.0] - 2024-06-18
### Fixed
- Testing framework logging the same date if they were within 1s (#2453)

### Fixed
- Handle edge case when last processed height is same as chain target height, app will wait for new block rather than exit.

### Changed
- Skip using the dictionary if processing data within batch size of latest height (#2454)

## [10.5.1] - 2024-06-12
### Changed
- Update `@subql/utils`

## [10.5.0] - 2024-06-12
### Added
- Admin api add query `/db_size` to check database size and upsert in metadata

### Fixed
- `exitWithError` logging error messages rather than the error (#2435)

### Changed
- Logging around switching dictionary (#2435)

## [10.4.1] - 2024-06-06
### Fixed
- Fix various issue in monitor service, file naming issue and export admin service from node-core

## [10.4.0] - 2024-06-05
### Added
- Add monitor service to record block indexing actions in order to improve POI accuracy, and provide debug info for Admin api

### Fixed
- Update index block failed message  (#2414)

## [10.3.2] - 2024-05-27
### Changed
- Visibility of sandboxService in indexer manager to protected (#2416)

## [10.3.1] - 2024-05-22
### Fixed
- CacheModel.clear behaviour if height was 0 (#2402)

## [10.3.0] - 2024-05-20
### Changed
- Update cache to always flush with a block height and clear after transaction commit (#2386)
- Export `SANDBOX_DEFAULT_BUILTINS` to share with other sandboxes (#2404)

## [10.2.0] - 2024-05-08
### Changed
- Bump with @subql/utils, update polkadot dependencies to v11

### Fixed
- Fix `reindex` command failed due to `projectUpgradeService` not been initialized
- Fix project upgrade to an earlier height, deployments in metadata not been updated, and app restart will lead to reindex.

## [10.1.2] - 2024-05-03
### Fixed
- Fix `filterBlockTimestamp` when filter could be undefined

## [10.1.1] - 2024-05-02
### Fixed
- Add back missing dependencies `pg`, also rollback `Uint8Array` change for sandbox as it could break other sdk.

## [10.1.0] - 2024-05-02
### Fixed
- Fixed issue Buffer within sandbox could not concat Buffer and Uint8Array, also injected `atob`

### Added
- Expose option to add workerData to workers (#2372)

### Changed
- Simplify logger function (#2374)

## [10.0.0] - 2024-04-24
### Added
- Various pieces of code from node and generalised them (#2357)

### Changed
- Tidy up block dispatcher constructor args (#2357)

## [9.0.0] - 2024-04-12
### Added
- `WorkerUnfinalizedBlocksService` class from node that is now chain agnostic (#2346)

### Fixed
- Issue with using metadata if incorrect network endpoint was provided (#2350)
- Undefined dictionary response resulting in infinite loop (#2353)
- Fix at end of modulo block filter it could skip other dataSources, and jump to the latest height

### Changed
- Simplify ApiService and remove need for getChainId function (#2450)
- Logging for dictionary and simplify code (#2353)

## [8.0.1] - 2024-04-05
### Fixed
- Fix modulo filter not applying correctly with multiple dataSources (#2331)

## [8.0.0] - 2024-03-28
### Added
- Add service to support for dictionary v2 (#2257)
- Support for ordering with store `getBy*` methods (#2325)

### Removed
- `@subql/apollo-links` for resolving dictionary endpoints and matching `dictionary-resolver` flag (#2305)

### Fixed
- Various issues with store cache (#2325)
  - `getByFields` ignoring mutations from the current block
  - Order and offset issues when using store `getByFields`, `getByField` and `getOnByField`
  - Being able to mutate data in the store cache without calling methods
  - Matching cache data with `getByFields`, `getByField` and `getOneByField`

## [7.5.1] - 2024-03-26
### Fixed
- Fix unable to find index in `modelIndexedFields` due to a special case entity name (2327)
- Fix multi-chain has `block-range` issue due to migartion handle historical status incorrectly

## [7.5.0] - 2024-03-20
### Changed
- Optimise metadata query when dealing with a large number of dynamic datasources that regularly increase (#2302)

### Fixed
- Fields called `createdAt` or `updatedAt` having their type converted to timestamps

### Removed
- Unused `timestamps-field` flag (#2310)

## [7.4.3] - 2024-03-15
### Changed
- Update connection retry logic and add backoff to fetch blocks retries (#2301)

## [7.4.2] - 2024-03-14
### Fixed
- Graphql comments not being escaped (#2299)

## [7.4.1] - 2024-03-08
### Fixed
- Memory leak with workers and large number of (dynamic) datasources (#2292)
- Add missing `bytes` scalar type (#2293)

## [7.4.0] - 2024-03-05
### Fixed
- Fix missing incrememnt keys on `_metadata` table (#2283)
- Fixed unexpected `store` on testing suite Entity (#2285)

### Added
- Support for Full Text Search (#2280)

## [7.3.1] - 2024-02-29
### Removed
- `scale-batch-size` flag as it had no use (#2275)

### Fixed
- Drop subscription triggers and notifiy_functions (#2277)
- Fix poi issue due to Int hashCode failed (#2278)

## [7.3.0] - 2024-02-23
### Added
- Schema Migration support for Enums, Relations, Subscription (#2251)
- Check that the project start height is below the current chain height (#2259)

### Fixed
- Fixed non-atomic schema migration execution (#2244)
- Testing Suites should run with unfinalizedBlocks `false` (#2258)
- StoreService not being fully in sync with db (#2264)
- StoreService not being initialized early enough on startup (#2265)

### Changed
- Improve error handling when fetching blocks (#2256)
- Lock `@subql/apollo-links` to `1.3.2`

## [7.2.1] - 2024-02-07
### Added
- Update `ParentProject` to use `untilBlock` as and alias for `block` (#2235)

### Fixed
- Historical queries not using the correct block height (#2243)

## [7.2.0] - 2024-01-30
### Changed
- Update `@subql/apollo-links` and add specific logger for it

## [7.1.0] - 2024-01-25
### Added
- Support for CSV output with flag `--csv-out-dir` (#2224)
- Support for Schema Migration with `--allow-schema-migration` flag (#2179)

### Changed
- Improve modulo filter performance when there are other data sources (#2152)

### Fixed
- missing schema migration models (#2226)

## [7.0.8] - 2024-01-10
### Fixed
- Update with util package, improve project initialization query from x-sequelize (#2212)

## [7.0.7] - 2024-01-04
### Fixed
- Update with util package, fix `more than one row returned by a subquery used as an expression` error from x-sequelize (#2209)

## [7.0.6] - 2023-12-25
### Fixed
- Fix bypassBlock method `cleanedBatchBlocks` could throw Maximum call stack size exceeded error from lodash (#2206)

## [7.0.5] - 2023-12-20
### Fixed
- Fix issue with metadata cache setting lastProcessedHeight to undefined (#2200)

## [7.0.4] - 2023-12-14
### Changed
- Update @subql/common

## [7.0.3] - 2023-12-04
### Fixed
- Fixed resolved asset file with incorrect format and content in #2185

## [7.0.2] - 2023-11-29
### Changed
- dictionary registry path (#2187)

### Fixed
- bump `lru-cache` to `10.1.0` and remove default exports (#2189)

## [7.0.1] - 2023-11-28
### Fixed
- Fix ipfs deployment templates path failed to resolved, issue was introduced in #2182 (#2185)
- Update @subql/apollo-links to fix network dictionary timeout but not fallback to config dictionary issue

## [7.0.0] - 2023-11-27
### Added
- The ability to find the last indexed with a valid block hash using POI (#2176)

### Fixed
- Fix incorrect datasources map that could result in `Value at height 7408910 was undefined` (#2183)
- Fix template assets path not been resolved correctly and lead to `Failed to parse log data` (#2182)

## [6.4.2] - 2023-11-16
### Fixed
- Dictionaries timing out by updating `@subql/apollo-links` (#2169)
- Incorrect block queue with multiple ds (#2167)

## [6.4.1] - 2023-11-13
### Fixed
- Store not having access to blockHeight and causing workers to fail on startup (#2161)

## [6.4.0] - 2023-11-10
### Added
- Base yargs config for all SDKs (#2144)
- Support block skipping on unavailable blocks (#2151)

### Fixed
- When using store get methods the `save` function would be missing (#2153)
- Not indexing cleanly when all datasources have reached their end block

### Fixed
- Workers selecting apis for endpoints that aren't connected (#2154)

## [6.3.0] - 2023-11-06
### Added
- Add `dictionaryQuerySize` to nodeConfig, so the block range in dictionary can be configurable. (#2139)

### Fixed
- Fix `multi-chain` should disable historical by default, rather than exit
- Fix reindex targetHeight issue introduced in #2131 (#2138)
- `processedBlockCount` and `schemaMigrationCount` metadata fields incrementing exponentially (#2136)
- Fix regression introduced in [#2110](https://github.com/subquery/subql/pull/2110) that broke `unwrapProxy` if the input is an array

## [6.2.0] - 2023-10-31
### Fixed
- Improve reindex query to remove/update by batches. (#2131)
- Fix poi reindex beyond genesis height issue. (#2131)
- Fixed modulo block ahead of finalized block issue (#2132)
- Wrong link to docs for testing

### Added
- WorkerInMemoryCacheService from node (#2125)
- New `endBlock` option on datasources (#2064)

## [6.1.1] - 2023-10-25
### Fixed
- Not handling TaskFlushedErrors in block dispatchers (#2120)

## [6.1.0] - 2023-10-20
### Added
- Add in-memory cache to be used in sandbox #(2110)

### Fixed
- Fixed poi migration init check, and improve logging (#2112)

## [6.0.4] - 2023-10-18
### Fixed
- Store bulk methods failing with workers (#2107)

## [6.0.3] - 2023-10-17
### Fixed
- Dictionary validation error causing application exit (#2101)
- Auto queue flush getting the queue into a bad state (#2103)
- Fix getCache could not been cleared after reindex, and could have been re-used and lead to error, such as syncPoi

## [6.0.2] - 2023-10-12
### Fixed
- Issues with using object destructing for store interface and workers (#2094)

## [6.0.1] - 2023-10-12
### Fixed
- Store operations failing with workers when options are provided (#2092)
- skip managing connection pool for single endpoint (#2091)

## [6.0.0] - 2023-10-11
### Changed
- Support scoped debug logging (#2077)

### Added
- Debug logging for dictionary queries (#2077)

### Fixed
- Fixed Poi migration performance issue with `sqlIterator`
- Fixed AutoQueue timeout issue, align setting with nodeConfig. (#2081)
- Fixed Poi sync could block DB IO and drop connection issue (#2086)

## [5.0.3] - 2023-10-03
### Fixed
- Fix reindex service without poi feature (2062)

### Changed
- Version bump with `types-core` 0.1.1

## [5.0.2] - 2023-10-02
### Fixed
- Fix dictionary metadata validation (#2057)

## [5.0.1] - 2023-09-28
### Fixed
- Update apollo-links to 1.0.2, fix dictionary resolver failed to get token issue
- Use test runs as unit for tests instead of entity checks (#1957)
- Handle APIs in connection pool whose initialization failed (#1970)
- Fix generated operation hash with single entity, buffer did not get hashed issue.
- Infinite recursion in setValueModel with arrays (#1993)
- Fix health checks for Networks that produce batched blocks (#2005)
- Update `@willsoto/nestjs-prometheus` version to `5.4.0` (#2012)
- `scaleBatchSize` referring to itself instead of config (#2018)
- Set default startBlock of datasources to 1 (#2019)
- Use round-robin worker load balancing with memory constraint consideration (#2029)

### Changed
- Move more code from node to node-core. Including configure module, workers (#1797)
- Update api service generics to support multiple block types (#1968)
- UnfinalizedBlocksService: make private methods protected to allow custom fork detection (#2009)
- Update fetching blocks to use moving window rather than batches (#2000)

### Added
- Project upgrades feature and many other changes to support it (#1797)
- `skipTransactions` option to NodeConfig (#1968)
- `getByFields` to store (#1993)
- `getPoiBlocksBefore` method to PoiModel so we can get recent blocks with operations (#2009)

## [4.2.3] - 2023-08-17
### Fixed
- delay getPoiBlocksByRange when fully synced, fixes the high CPU usage issue (#1952)

## [4.2.2] - 2023-08-16
### Fixed
- Fix modulo filter wrongful block queueing (#1944)

## [4.2.1] - 2023-08-11
### Fixed
- Bump with `@subql/types` package, fix missing `unsafeApi`. (#1935)

## [4.2.0] - 2023-08-10
### Added
- Added primary network endpoint that is always used from connection pool unless it fails (#1927)

## [4.1.0] - 2023-08-04
### Fixed
- Fix poi operationHash and miss poi blocks (#1917)
- Sync @subql/apollo-links to 0.5.8, fix consuming cached token issue

### Changed
- moved `indexBlock` to base `TestingService` (#1913)
- Simplify connection pool logic (#1915)

## [4.0.1] - 2023-07-31
### Fixed
- Update license (#1891)
- Performance scoring fix (#1895)
- Fix mmrQuery should always read mmr leaf length from Db (#1900).

## [4.0.0] - 2023-07-17
### Changed
- **Breaking**: Inti DB schema manually during test run (#1870)

### Fixed
- Updated `@subql/apollo-links` to 0.5.3 for bug fixes. (#1886)
- Establish common connection pool state among workers using `ConnectionPoolStateManager` (#1829)

## [3.1.2] - 2023-07-11
### Fixed
- Fix `TestingService` to run tests in seperate application contexts (#1870)
- Cache race condition when flushing cache and getting data (#1873)
- Various improvements for POI feature: (#1869)
  - Benchmarking mmr processing
  - Improve performance when initialize mmr service, find the latest mmr height in Poi table by record it in `_metadata` table
  - Correct mmr query directly from Db rather than cache

## [3.1.1] - 2023-07-06
### Fixed
- Fixed Poi table missing mmr, due to incorrectly merged data from Db and cache. (#1871)

## [3.1.0] - 2023-07-04
### Added
- Configurable limit to the store cache size, this will cause indexing to wait for the cache to be flushed. This resolves an issue where OOM errors happen. (#1859)

## [3.0.0] - 2023-06-26
### Changed
- Added `pgMmrCacheService` to use independent Db connection, now mmr cache flush by itself. (#1828)
- Update meta exports to require `MmrQueryController` and move code from node core (#1823)
- Switch from node-fetch to cross-fetch. [See apollo issue for more](https://github.com/apollographql/apollo-client/issues/4857)

### Fixed
- Not being able to test with null/undefined values on entities (#1809)

### Fixed
- Fix reconnection issues in connection pool

## [2.6.0] - 2023-06-19
### Changed
- upgrade @subql/apollo-links (#1801)

## [2.5.1] - 2023-06-16
### Fixed
- Fixed meta service missing construct, align blockHeight update with store cache flush interval (#1804)

## [2.5.0] - 2023-06-15
### Added
- Implemented load balancing for multiple endpoints, with distribution based on endpoint performance (#1657)
- Introduced a suspension mechanism for rate-limited endpoints using exponential backoff to regulate usage (#1657)

## [2.4.5] - 2023-06-09
### Changed
- Use @subql/x-sequelize in order support cockroach (#1791)

### Fixed
- Base58 encoding check for POI (#1788)
- Fix project \_startHeight been blocked by poiSync (#1792)

## [2.4.4] - 2023-06-07
### Fixed
- Fixed various issue for mmr (#1787)

## [2.4.3] - 2023-06-02
### Fixed
- Fixed mmr missing node due to cache lock (#1784)

## [2.4.2] - 2023-06-01
### Changed
- Cache MMR leaf length and flush with rest of db, enable more mmr logging (#1782)

### Fixed
- Fix jump buffer height issue (#1781)
- Error if testing entitiy not found (#1766)

## [2.4.1] - 2023-05-31
### Fixed
- Sync flushing MMR potentially getting corrupt (#1777)

## [2.4.0] - 2023-05-30
### Added
- Add cache layer to postgres mmr db (#1762)
- Support for block hashes with base64 format for POI (#1761)

### Changed
- Update vm2 past problimatic version (#1770)
- Add optional root option to config (#1771)

## [2.3.1] - 2023-05-26
### Fixed
- Improve mmr error and expose ready status (#1752)
- Fix subcommand could escape issue, setup profiler at application init (#1755)

## [2.3.0] - 2023-05-24
### Fixed
- Fix datasource processors base filters not working (#1745)

### Added
- Support for base58 blockhashes with POI (#1750)
- Allow url in sandbox and set URL global (#1747)
- Log for unfound mappingHandlers and list available ones (#1742)

## [2.2.2] - 2023-05-19
### Fixed
- Fix project service init failing due to start height being 0 (#1735)
- No longer intialize store and indexer inside testing service (#1734)
- Fix poi read leaf height error under cockroach (#1733)
- Ensure min start height to be 1, even if set to 0 (#1737)
- Upgrade apollo link package (#1739)

### Changed
- allow dictionary when only --dictionaryResolver is enabled (#1730)
- Improve error messages (#1729)
- Deprecate project id from poi table, track deployment in metadata (#1696)

## [2.2.1] - 2023-05-17
### Fixed
- CockroachDB upsert performance issues (#1723)
- Exiting if dictionary-resolver fails (#1721)
- Typo in multi-chain logging message (#1722)

## [2.2.0] - 2023-05-16
### Added
- Worker threads support for unfinalized blocks (#1695)

### Fixed
- Logging historical enabled with cockroach db (#1715)
- Non-historical flushing order (#1711)
- Filtering arguments to include datasoruce (#1703)
- Not logging dictionary start height check (#1700)

### Changed
- Default matcher from insensitive to sensitive casing (#1706)

## [2.1.3] - 2023-05-12
### Fixed
- Fix app could fail to start, due to flush before metadata repo been set (#1688)

## [2.1.2] - 2023-05-11
### Fixed
- Fix metadata check, allow base indexer manager to parse abis with ethereum (#1682)

### Changed
- Move validate function to common (#1683)

### Added
- Inject the chain id into sandboxes (#1684)

## [2.1.1] - 2023-05-11
### Fixed
- Extract dictionary meta validation so it can be overridden (#1679)

## [2.1.0] - 2023-05-10
### Added
- Added interval for flushing the cache. (#1670)
- `bulkRemove` method on the store. (#1666)
- Ability to regenerate MMR (#1664)
- Ability to migrade MMR from file based db to postgres db and vice versa (#1618)

### Changed
- Move more chain agnostic code form node. (#1658) (#1659)
- Move any polkadot imports to utils package. (#1653)

### Fixed
- POI Cache issues (#1660)
- `store.getOneByField` with historical and index (#1667)
- Store cache threshold not including removed items (#1675)

## [2.0.2] - 2023-04-27
### Changed
- Deprecate `localMode` (#1648)

## [2.0.1] - 2023-04-27
### Fixed
- Fix ApiService abstract class, improve getting all DS (#1638)
- Fix assertion error and pk index type (#1641)
- Fix tests (#1640)

## [2.0.0] - 2023-04-20
### Changed
- Major release 2.0.0, align with other package versions
- Update metadata when dictionary skips large number of blocks (#1577)

### Added
- Added StoreCache service and various other improvements (#1561)
- Added TestingService (#1584)

### Fixed
- Enable Typescript strict setting and improve code quality (#1625)
- Fixed enum not being included in POI (#1561)
- Fixed when Poi block offset 0, it could get updated when app restart (#1459)
- Fixed index name too long issue (#1599)
- Fixed dictionary validation issues and improve error messages (#1561)

## [1.11.3] - 2023-04-17
### Fixed
- Improve log, update progress string (#1612)

## [1.11.2] - 2023-04-05
### Fixed
- Compute block size one property at a time to prevent RangeError
- Upgrade @subql/apollo-link version

## [1.11.1] - 2023-03-30
### Changed
- Change to support multiple endpoints (#1551)

### Fixed
- Fix previous release 1.11.0 failed

## [1.11.0] - 2023-03-29
### Added
- Add SmartBatchService and BlockSizeBuffer (#1506)
- Handle bigint in json.stringify (#1562)
- Generate sourcemap for projects (#1569)
- Update polkadot api to 10.1.4 (#1580)

### Fixed
- Fix enum under schema not being escaped (#1555)
- Remove blocking in process queueing (#1572)

### Changed
- Use `performance.now` instead of date for profiler. (#1549)
- Rename `--sponsored-dictionary` to `--dictionary-resolver` (#1559)

## [1.10.0] - 2023-03-06
### Fixed
- fix issue store getByField limit could potentially excess config limit (#1529)

### Changed
- Move enum under schema (#1527)
- Deprecate exclude constraint (#1543)

## [1.9.0] - 2023-02-21
### Added
- add blockTime to NodeConfig (#1501)

### Changed
- Support array type in dictionary queries (#1510)

## [1.8.0] - 2023-01-23
### Added
- Add validation of dictionary with start height (#1473)
- `Store` add count for entity (#1480)

### Fixed
- Fix custom metadata keys not being applied (#1496)

## [1.7.1] - 2022-12-22
### Fixed
- Fix trigger function name too long (#1469)

## [1.7.0] - 2022-12-19
### Fixed
- Workers: Fix SequelizeDatabaseError - tuple concurrently updated (#1458)
- Handle `bulkUpdate` when fields are undefined with historical indexing (#1463)

### Added
- Add start height to project metadata (#1456)

## [1.6.0] - 2022-12-06
### Added
- Support for `bypassBlocks` (#1435)

## [1.5.1] - 2022-11-30
### Fixed
- Fixed enum name (#1441)

## [1.5.0] - 2022-11-23
### Added
- Dictionary auth link integration (#1411)
- Support multi-chain indexing (#1375)

### Changed
- Move enum name generation method to node-core (#1427)

## [1.4.1] - 2022-11-15
### Fixed
- Hot fix for hot schema reload (#1404)

## [1.4.0] - 2022-11-15
### Added
- Support for hot schema reload. (#1401)
- Support for distinct query plugin. (#1274)

## [1.3.3] - 2022-11-09
### Added
- Added retry method for handle fetch errors (#1386)

## [1.3.2] - 2022-11-08
### Fixed
- Fix missing sequelize sync (#1389)

## [1.3.1] - 2022-11-08
### Fixed
- Remove sequelize alter table (#1387)

## [1.3.0] - 2022-11-07
### Fixed
- Improve dictionary query by filter with data sources start block. (#1371)

## [1.2.0] - 2022-10-28
### Added
- Support for unfinalized blocks. (#1308)

## [1.1.0] - 2022-10-27
### Changed
- Update to `@polkadot/api@9.4.2`/ (#1356)
- Backport dictionary service features from Algorand. (#1346)

## [1.0.1] - 2022-10-11
### Added
- Common code from sandbox and dictionary. (#1345)

## [1.0.0] - 2022-10-10
### Removed
- `Subqueries` database table. (#1340)

## [0.1.3] - 2022-10-06
### Changed
- Update IPFS endpoints. (#1337)

### Fixed
- Benchmark info not being logged. (#1138)

## [0.1.2] - 2022-09-27
### Changed
- Moved `yargs` file from `node-core` to `node`. (#1281)
- Update `sequelize`. (#1311)

## [0.1.1] - 2022-08-26
### Fixed
- Imports not being relative (#1268)

## [0.1.0] - 2022-08-26
### Changed
- Move blockchain agnostic code from `node` to `node-core` package. (#1222)

[Unreleased]: https://github.com/subquery/subql/compare/node-core/14.1.2...HEAD
[14.1.2]: https://github.com/subquery/subql/compare/node-core/14.1.1...node-core/14.1.2
[14.1.1]: https://github.com/subquery/subql/compare/node-core/14.1.0...node-core/14.1.1
[14.1.0]: https://github.com/subquery/subql/compare/node-core/14.0.0...node-core/14.1.0
[14.0.0]: https://github.com/subquery/subql/compare/node-core/13.0.2...node-core/14.0.0
[13.0.2]: https://github.com/subquery/subql/compare/node-core/13.0.1...node-core/13.0.2
[13.0.1]: https://github.com/subquery/subql/compare/node-core/13.0.0...node-core/13.0.1
[13.0.0]: https://github.com/subquery/subql/compare/node-core/12.0.0...node-core/13.0.0
[12.0.0]: https://github.com/subquery/subql/compare/node-core/11.0.0...node-core/12.0.0
[11.0.0]: https://github.com/subquery/subql/compare/node-core/10.10.2...node-core/11.0.0
[10.10.2]: https://github.com/subquery/subql/compare/node-core/10.10.1...node-core/10.10.2
[10.10.1]: https://github.com/subquery/subql/compare/node-core/10.10.0...node-core/10.10.1
[10.10.0]: https://github.com/subquery/subql/compare/node-core/10.9.0...node-core/10.10.0
[10.9.0]: https://github.com/subquery/subql/compare/node-core/10.6.0...node-core/10.9.0
[10.6.0]: https://github.com/subquery/subql/compare/node-core/10.5.1...node-core/10.6.0
[10.5.1]: https://github.com/subquery/subql/compare/node-core/10.5.0...node-core/10.5.1
[10.5.0]: https://github.com/subquery/subql/compare/node-core/10.4.1...node-core/10.5.0
[10.4.1]: https://github.com/subquery/subql/compare/node-core/10.4.0...node-core/10.4.1
[10.4.0]: https://github.com/subquery/subql/compare/node-core/10.3.2...node-core/10.4.0
[10.3.2]: https://github.com/subquery/subql/compare/node-core/10.3.1...node-core/10.3.2
[10.3.1]: https://github.com/subquery/subql/compare/node-core/10.3.0...node-core/10.3.1
[10.3.0]: https://github.com/subquery/subql/compare/node-core/10.2.0...node-core/10.3.0
[10.2.0]: https://github.com/subquery/subql/compare/node-core/10.1.2...node-core/10.2.0
[10.1.2]: https://github.com/subquery/subql/compare/node-core/10.1.1...node-core/10.1.2
[10.1.1]: https://github.com/subquery/subql/compare/node-core/10.1.0...node-core/10.1.1
[10.1.0]: https://github.com/subquery/subql/compare/node-core/10.0.0...node-core/10.1.0
[10.0.0]: https://github.com/subquery/subql/compare/node-core/9.0.0...node-core/10.0.0
[9.0.0]: https://github.com/subquery/subql/compare/node-core/8.0.1...node-core/9.0.0
[8.0.1]: https://github.com/subquery/subql/compare/node-core/8.0.0...node-core/8.0.1
[8.0.0]: https://github.com/subquery/subql/compare/node-core/7.5.1...node-core/8.0.0
[7.5.1]: https://github.com/subquery/subql/compare/node-core/7.5.0...node-core/7.5.1
[7.5.0]: https://github.com/subquery/subql/compare/node-core/7.4.3...node-core/7.5.0
[7.4.3]: https://github.com/subquery/subql/compare/node-core/7.4.2...node-core/7.4.3
[7.4.2]: https://github.com/subquery/subql/compare/node-core/7.4.1...node-core/7.4.2
[7.4.1]: https://github.com/subquery/subql/compare/node-core/7.4.0...node-core/7.4.1
[7.4.0]: https://github.com/subquery/subql/compare/node-core/7.3.1...node-core/7.4.0
[7.3.1]: https://github.com/subquery/subql/compare/node-core/7.3.0...node-core/7.3.1
[7.3.0]: https://github.com/subquery/subql/compare/node-core/7.2.1...node-core/7.3.0
[7.2.1]: https://github.com/subquery/subql/compare/node-core/7.2.0...node-core/7.2.1
[7.2.0]: https://github.com/subquery/subql/compare/node-core/7.1.0...node-core/7.2.0
[7.1.0]: https://github.com/subquery/subql/compare/node-core/7.0.8...node-core/7.1.0
[7.0.8]: https://github.com/subquery/subql/compare/node-core/7.0.7...node-core/7.0.8
[7.0.7]: https://github.com/subquery/subql/compare/node-core/7.0.6...node-core/7.0.7
[7.0.6]: https://github.com/subquery/subql/compare/node-core/7.0.5...node-core/7.0.6
[7.0.5]: https://github.com/subquery/subql/compare/node-core/7.0.4...node-core/7.0.5
[7.0.4]: https://github.com/subquery/subql/compare/node-core/7.0.3...node-core/7.0.4
[7.0.3]: https://github.com/subquery/subql/compare/node-core/7.0.2...node-core/7.0.3
[7.0.2]: https://github.com/subquery/subql/compare/node-core/7.0.1...node-core/7.0.2
[7.0.1]: https://github.com/subquery/subql/compare/node-core/7.0.0...node-core/7.0.1
[7.0.0]: https://github.com/subquery/subql/compare/node-core/6.4.2...node-core/7.0.0
[6.4.2]: https://github.com/subquery/subql/compare/node-core/6.4.1...node-core/6.4.2
[6.4.1]: https://github.com/subquery/subql/compare/node-core/6.4.0...node-core/6.4.1
[6.4.0]: https://github.com/subquery/subql/compare/node-core/6.3.0...node-core/6.4.0
[6.3.0]: https://github.com/subquery/subql/compare/node-core/6.2.0...node-core/6.3.0
[6.2.0]: https://github.com/subquery/subql/compare/node-core/6.1.1...node-core/6.2.0
[6.1.1]: https://github.com/subquery/subql/compare/node-core/6.1.0...node-core/6.1.1
[6.1.0]: https://github.com/subquery/subql/compare/node-core/6.0.4...node-core/6.1.0
[6.0.4]: https://github.com/subquery/subql/compare/node-core/6.0.3...node-core/6.0.4
[6.0.3]: https://github.com/subquery/subql/compare/node-core/6.0.2...node-core/6.0.3
[6.0.2]: https://github.com/subquery/subql/compare/node-core/6.0.1...node-core/6.0.2
[6.0.1]: https://github.com/subquery/subql/compare/node-core/6.0.0...node-core/6.0.1
[6.0.0]: https://github.com/subquery/subql/compare/node-core/5.0.3...node-core/6.0.0
[5.0.3]: https://github.com/subquery/subql/compare/node-core/5.0.2...node-core/5.0.3
[5.0.2]: https://github.com/subquery/subql/compare/node-core/5.0.1...node-core/5.0.2
[5.0.1]: https://github.com/subquery/subql/compare/node-core/4.2.3...node-core/5.0.1
[4.2.3]: https://github.com/subquery/subql/compare/node-core/4.2.2...node-core/4.2.3
[4.2.2]: https://github.com/subquery/subql/compare/node-core/4.2.1...node-core/4.2.2
[4.2.1]: https://github.com/subquery/subql/compare/node-core/4.2.0...node-core/4.2.1
[4.2.0]: https://github.com/subquery/subql/compare/node-core/4.1.0...node-core/4.2.0
[4.1.0]: https://github.com/subquery/subql/compare/node-core/4.0.1...node-core/4.1.0
[4.0.1]: https://github.com/subquery/subql/compare/node-core/4.0.0...node-core/4.0.1
[4.0.0]: https://github.com/subquery/subql/compare/node-core/3.1.2...node-core/4.0.0
[3.1.2]: https://github.com/subquery/subql/compare/node-core/3.1.1...node-core/3.1.2
[3.1.1]: https://github.com/subquery/subql/compare/node-core/3.1.0...node-core/3.1.1
[3.1.0]: https://github.com/subquery/subql/compare/node-core/3.0.0...node-core/3.1.0
[3.0.0]: https://github.com/subquery/subql/compare/node-core/2.6.0...node-core/3.0.0
[2.6.0]: https://github.com/subquery/subql/compare/node-core/2.5.1...node-core/2.6.0
[2.5.1]: https://github.com/subquery/subql/compare/node-core/2.5.0...node-core/2.5.1
[2.5.0]: https://github.com/subquery/subql/compare/node-core/2.4.5...node-core/2.5.0
[2.4.5]: https://github.com/subquery/subql/compare/node-core/2.4.4...node-core/2.4.5
[2.4.4]: https://github.com/subquery/subql/compare/node-core/2.4.3...node-core/2.4.4
[2.4.3]: https://github.com/subquery/subql/compare/node-core/2.4.2...node-corev2.4.3
[2.4.2]: https://github.com/subquery/subql/compare/node-core/2.4.1...node-core/2.4.2
[2.4.1]: https://github.com/subquery/subql/compare/node-core/2.4.0...node-core/2.4.1
[2.4.0]: https://github.com/subquery/subql/compare/node-core/2.3.1...node-core/2.4.0
[2.3.1]: https://github.com/subquery/subql/compare/node-core/2.3.0...node-core/2.3.1
[2.3.0]: https://github.com/subquery/subql/compare/node-core/2.2.2...node-core/2.3.0
[2.2.2]: https://github.com/subquery/subql/compare/node-core/2.2.1...node-core/2.2.2
[2.2.1]: https://github.com/subquery/subql/compare/node-core/2.2.0...node-core/2.2.1
[2.2.0]: https://github.com/subquery/subql/compare/node-core/2.1.2...node-core/2.2.0
[2.1.3]: https://github.com/subquery/subql/compare/node-core/2.1.2...node-core/2.1.3
[2.1.2]: https://github.com/subquery/subql/compare/node-core/2.1.1...node-core/2.1.2
[2.1.1]: https://github.com/subquery/subql/compare/node-core/2.1.0...node-core/2.1.1
[2.1.0]: https://github.com/subquery/subql/compare/node-core/2.0.2...node-core/2.1.0
[2.0.2]: https://github.com/subquery/subql/compare/node-core/2.0.1...node-core/2.0.2
[2.0.1]: https://github.com/subquery/subql/compare/node-core/2.0.0...node-core/2.0.1
[2.0.0]: https://github.com/subquery/subql/compare/node-core/1.11.3..node-core/2.0.0
[1.11.3]: https://github.com/subquery/subql/compare/node-core/1.11.2...node-core/1.11.3
[1.11.2]: https://github.com/subquery/subql/compare/node-core/1.11.1...node-core/1.11.2
[1.11.1]: https://github.com/subquery/subql/compare/node-core/1.11.0...node-core/1.11.1
[1.11.0]: https://github.com/subquery/subql/compare/node-core/1.10.0...node-core/1.11.0
[1.10.0]: https://github.com/subquery/subql/compare/node-core1.9.0/...node-core/1.10.0
[1.9.0]: https://github.com/subquery/subql/compare/node-core/1.8.0...node-core/1.9.0
[1.8.0]: https://github.com/subquery/subql/compare/node-core/1.7.1...node-core/1.8.0
[1.7.1]: https://github.com/subquery/subql/compare/node-core/1.7.0...node-core/1.7.1
[1.7.0]: https://github.com/subquery/subql/compare/node-core/1.6.0...node-core/1.7.0
[1.6.0]: https://github.com/subquery/subql/compare/node-core/1.5.1...node-core/1.6.0
[1.5.1]: https://github.com/subquery/subql/compare/node-core/1.5.0...node-core/1.5.1
[1.5.0]: https://github.com/subquery/subql/compare/node-core/1.4.1...node-core/1.5.0
[1.4.1]: https://github.com/subquery/subql/compare/node-core/1.4.0...node-core/1.4.1
[1.4.0]: https://github.com/subquery/subql/compare/node-core/1.3.3...node-core/1.4.0
[1.3.3]: https://github.com/subquery/subql/compare/node-core/1.3.2...node-core/1.3.3
[1.3.2]: https://github.com/subquery/subql/compare/node-core/1.3.1...node-core/1.3.2
[1.3.1]: https://github.com/subquery/subql/compare/node-core/1.3.0...node-core/1.3.1
[1.3.0]: https://github.com/subquery/subql/compare/node-core/1.2.0...node-core/1.3.0
[1.2.0]: https://github.com/subquery/subql/compare/node-core/1.1.0...node-core/1.2.0
[1.1.0]: https://github.com/subquery/subql/compare/node-core/1.0.1...node-core/1.1.0
[1.0.1]: https://github.com/subquery/subql/compare/node-core/1.0.0...node-core/1.0.1
[1.0.0]: https://github.com/subquery/subql/compare/node-core/0.1.3...node-core/1.0.0
[0.1.3]: https://github.com/subquery/subql/compare/node-core/0.1.2...node-core/0.1.3
[0.1.2]: https://github.com/subquery/subql/compare/node-core/0.1.1...node-core/0.1.2
[0.1.1]: https://github.com/subquery/subql/compare/node-core/0.1.0...node-core/0.1.1
[0.1.0]: https://github.com/subquery/subql/creleases/tag/0.1.0
