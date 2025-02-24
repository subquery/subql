# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- `timestamp` field missing on `Header`

### Changed
- Update header year to 2025 (#362)

## [5.4.0] - 2025-01-28
### Changed
- Update `@subql/node-core` with minor bug fixes and improvements

## [5.3.0] - 2024-12-17
### Changed
- Update `@subql/node-core` and `@subql/common` dependencies

## [5.2.1] - 2024-12-06
### Fixed
- Missing API dependency when using reindex

## [5.2.0] - 2024-11-28
### Added
- Support for historical indexing by timestamp as well as block height
- Add an `--enable-cache` flag, allowing you to choose between DB or cache for IO operations.

## [5.1.7] - 2024-10-24
### Fixed
- When there is no log data for fullBlock, it is determined as lightBlock. (#350)

## [5.1.6] - 2024-10-23
### Changed
- Bump `@subql/common` dependency

## [5.1.5] - 2024-10-22
### Changed
- Bump `@subql/node-core` dependency (#347)

## [5.1.4] - 2024-09-25
### Changed
- Bump common, Added manifest support for query-subgraph.

## [5.1.3] - 2024-08-28
### Fixed
- Dictionary grouping optimisation regression (#344)
- Dictionary query not being used if address specified but no other filters (#344)

## [5.1.2] - 2024-08-27
### Changed
- Use constant for filter `!null` value (#341)

## [5.1.1] - 2024-08-16
### Fixed
- Empty dictionary v2 response resulting in all blocks within that range being indexed (#336)

### Changed
- Update `@subql/node-core` (#337)

## [5.1.0] - 2024-08-02
### Added
- Suport for network endpoint config providing the ability to set headers and rpc batch sizes (#334)

## [5.0.1] - 2024-07-29
### Fixed
- Docker images not having TZ set to UTC (#333)
- Bump `@subql/node-core` with fixes for data consitstency issue (#333)

## [5.0.0] - 2024-07-26
### Changed
- Enable ts strict mode
- Use Subquery Project code from node core (#331)
- Breaking change: Update to latest `@subql/node-core`, require indexing environment timezone set to UTC (#330)

### Fixed
- Bump with `@subql/node-core`, fixed various issues causing poi inconsistency (#2497)

## [4.7.3] - 2024-07-16
### Fixed
- Fix dockerfile missing set timezone to UTC (#329)

## [4.7.2] - 2024-07-11
### Fixed
- Update with `node-core`, change `getFinalizedHeight` to `getFinalizedHeader`. Fix indexer could stall due to rpc finalized height could be smaller than previous result. (#328)

## [4.7.1] - 2024-07-10
### Fixed
- Bump `@subql/common-ethereum` and `@subql/types-ethereum`, update `@subql/node-core` to fix admin api `dbSize` issue (#326)

## [4.7.0] - 2024-07-03
### Changed
- bump with `@subql/common-ethereum` and `@subql/types-ethereum`

## [4.6.0] - 2024-07-03
### Changed
- Update `@subql/node-core`,bump with `@subql/types-ethereum`

## [4.5.2] - 2024-06-18
### Changed
- Update `@subql/node` with bug fixes

## [4.5.1] - 2024-06-13
### Fixed
- Errors resolving files from IPFS (#314)

## [4.5.0] - 2024-06-12
### Changed
- Deprecated flare SDK (#2428)

## [4.4.3] - 2024-06-07
### Fixed
- Endpoint search params being stripped (#301)

## [4.4.2] - 2024-06-06
### Fixed
- Fix import issue from node-core

## [4.4.1] - 2024-06-05
### Fixed
- Update dockerfile to fix monitor default directory permission issue

## [4.4.0] - 2024-06-05
### Added
- Add monitor service to record block indexing actions in order to improve POI accuracy, and provide debug info for Admin api

## [4.3.2] - 2024-05-27
### Fixed
- Wrong value being injected for unsafeApi into sandbox (#291)

## [4.3.1] - 2024-05-02
### Fixed
- Sandbox Uint8Array and missing pg dep issue

## [4.3.0] - 2024-05-02
### Changed
- Update node-core with bug fixes (#285)

## [4.2.0] - 2024-04-30
### Fixed
- Dictionary v2 transactions query not including address (#281)
- Dictionary v1 and v2 queries with modulo filters (#283)

### Changed
- Improved error message if genesis block is null (#282)

## [4.1.1] - 2024-04-16
### Fixed
- Dictionary v2 query filter with transactions (#278)

## [4.1.0] - 2024-04-05
### Changed
- update modulos to match changes with node core (#276)

### Fixed
- Now when `workers` set to 0, it will use block dispatcher instead of throw and exit (#273)
- Fixed workers failed to start due to missing apiService, also fix `fetchChainBlock` (#275)

## [4.0.0] - 2024-04-03
### Added
- Add support for eth dictionary v2 (#225)

### Fixed
- Improve log hash assertion message (#269)

## [3.11.0] - 2024-03-20
### Changed
- Update `@subql/node-core` with fixes and optimisations

## [3.10.1] - 2024-03-14
### Changed
- Update `@subql/node-core` to 4.7.2 with graphql comments escaping fix

## [3.10.0] - 2024-03-13
### Added
- Op L1 fields to transaction receipts (#258)

## [3.9.1] - 2024-03-09
### Changed
- Update `@subql/node-core` to 7.4.1 with bug fixes

## [3.9.0] - 2024-03-06
### Fixed
- Add assertion on mismatched blockHash for getLogs and getBlocks (#252)
- ### Changed
- Update `@subql/node-core` to 7.4.0

## [3.8.1] - 2024-03-01
### Fixed
- Update `@subql/node-core` to fix Poi generation issue with negative integer, also drop subscription triggers and notifiy_functions

## [3.8.0] - 2024-02-23
### Fixed
- Remove unnecessary logging relating to light blocks (#249)

### Changed
- Updates to match changes in `@subql/node-core` to 7.3.0

## [3.7.1] - 2024-02-07
### Added
- The ability to filter transactions with no input data (#243)

### Fixed
- Error handling for fetching dictionary chain aliases and switch to built in nodejs fetch (#247)
- Critical bug introduced in 3.6.0 which broke historical indexing

## [3.7.0] - 2024-01-30
### Added
- Special support for BEVM Canary (#241)

## [3.6.0] - 2024-01-25
### Changed
- Update @subql/node-core with
  - a performance fix when using modulo filters with other datasources
  - support for CSV exports
  - support for schema migrations

## [3.5.2] - 2024-01-18
### Fixed
- Fix undefined on timestamp filter (#237)

## [3.5.1] - 2024-01-10
### Fixed
- Update node-core with initialization query improvement

## [3.5.0] - 2024-01-08
### Added
- Update with common-ethereum to support for Zilliqa addresses (#231)

## [3.4.5] - 2024-01-04
### Fixed
- Timestamp filters not working (#229)

### Changed
- Update node-core with DB query fix

## [3.4.4] - 2023-12-20
### Fixed
- Metadata lastProcessedHeight undefined issue via `@subql/node-core`

## [3.4.3] - 2023-12-04
### Fixed
- Fix with after correct asset type (#223)

## [3.4.2] - 2023-11-30
### Fixed
- Sync with `node-core` 7.0.2

## [3.4.1] - 2023-11-28
### Fixed
- Fix ipfs deployment templates path failed to resolved, issue was introduced node-core 7.0.0
- Update with node-core to fix network dictionary timeout but not fallback to config dictionary issue

## [3.4.0] - 2023-11-27
### Added
- Update `@subql/node-core` with bug fixes
- Different method for detecting block forks for chains with probabalistic finalization (#217)

## [3.3.6] - 2023-11-23
### Fixed
- Ensure that the best block updates correctly when `unfinalized-blocks` is enabled. The issue was caused by using `getBestBlockHeight` with the wrong tag.(#215)

## [3.3.5] - 2023-11-17
### Fixed
- `block-confirmations` arg being removed in recent sync with main SDK (#213)

## [3.3.4] - 2023-11-16
### Fixed
- Sync with `node-core` 6.4.2, Fix incorrect enqueuedBlocks, dictionaries timing out by updating `@subql/apollo-links` (#212)

## [3.3.3] - 2023-11-13
### Changed
- Updates to match changes in
  - Dictionary service to use dictionary registry
  - Use yargs from node core

## [3.3.2] - 2023-11-08
### Fixed
- Fixed docker build pipeline, release to re-publish docker image(#207)

## [3.3.1] - 2023-11-08
### Fixed
- Getting transaction receipts when accessing via a log handler
- transaction missing from log (#202)

## [3.3.0] - 2023-11-06
### Added
- With `dictionary-query-size` now dictionary can config the query block range

### Fixed
- Sync with node-core 6.3.0 with various fixes

## [3.1.2] - 2023-11-01
### Fixed
- Unfinalized blocks not working with Cronos (#193)

### Changed
- Update `@subql/node-core` with fixes and support for endBlock feature (#195)

## [3.1.1] - 2023-10-25
### Fixed
- Fix crash when creating new dynamic datasources

## [3.1.0] - 2023-10-20
### Added
- Inject in-memory cache to sandbox

### Fixed
- Bump with `@subq/node-core` 3.1.0 , fixed poi migration init check, and improve logging

## [3.0.6] - 2023-10-18
### Fixed
- Update node-core, additional fix for store bulk methods failing with workers

## [3.0.5] - 2023-10-17
### Fixed
- Update
  - Dictionary validation error causing application exit (#2101)
  - Auto queue flush getting the queue into a bad state (#2103)
  - Fix getCache could not been cleared after reindex, and could have been re-used and lead to error, such as syncPoi

## [3.0.4] - 2023-10-12
### Changed
- debug has changed from a boolean to a string to allow scoping debug log level (#2077)

### Fixed
- Sync with node-core.
  - Fix issues with using object destructing for store interface and workers
  - Fixed Poi migration performance issue.
  - Fixed AutoQueue timeout issue.
  - Fixed Poi sync could block DB IO and drop connection issue.

## [3.0.3] - 2023-10-05
### Changed
- Version bump with `@subql/types-ethereum` 3.0.2

## [3.0.2] - 2023-10-04
### Fixed
- Fix reindex service without poi feature with `node-core`

### Changed
- Version bump with `types-ethereum` and `common-ethereum`

## [3.0.1] - 2023-10-03
### Fixed
- Empty string causing main command to not run, this happened with the default docker compose in starters

## [3.0.0] - 2023-10-03
### Fixed
- Fix dictionary metadata validation failed
- Improve get finalized block error logging
- Fix reindex also start index service (#155)
- Fix warning for filter address (#154)
- Fetching logs via block height resulting in invalid results. Block hash is now used to ensure
  correct results. (#156)
- Node runner options being overwritten by yargs defaults (#148)
- Fix yargs default override runner nodeOptions (#166)

### Added
- skipTransactions feature to avoid fetching transactions (#170)

## [2.12.5] - 2023-09-12
### Fixed
- Fix nestjs-prometheus dependency issue (#163)
- Sync with node-core 4.2.8, fix NodeConfig scaleBatchSize call itself

## [2.12.4] - 2023-09-12
### Fixed
- Fetching logs via block height resulting in invalid results. Block hash is now used to ensure correct results. (#156)
- Fix reindex also start index service (#155)
- Fix warning for filter address (#154)
- Update to node-core 4.2.7, fix set and remove in same block height causing empty in block range issue

## [2.12.3] - 2023-09-04
### Fixed
- lock to `@subql/common` 2.6.0, in order to fix unknown reader issue. (#152)

## [2.12.2] - 2023-09-04
### Fixed
- Previous failed release

## [2.12.1] - 2023-09-01
### Fixed
- Update `node-core` to 4.2.6, fix timeout issue for unavailable networks in dictionary resolver.

## [2.12.0] - 2023-09-01
### Fixed
- Fallback to singular provider if batch provider is not supported (#144)
- Fix missing ds option for event in dictionary query entries (#145)
- Update `node-core` to 4.2.5, fix dictionary failed to get token issue.

### Added
- Custom provider for Celo (#147)

### Changed
- Update node-core and add support for project upgrades feature (#148)

## [2.11.1] - 2023-08-14
### Changed
- Synced with main sdk:
  - add `--primary-network-endpoint` cli option
  - Support for update availability logs

## [2.10.0] - 2023-07-31
### Added
- Added `!null` filter for logs (#135)

### Changed
- Update license to GPL-3.0 (#137)
- Updated retry logic for eth requests (#134)
- Adjust batch size for `JsonRpcBatchProvider` dynamically (#121)
- Sync with node-core :
  - init db schema manually during test run
  - fix retry logic for workers in connection pool
  - Performance scoring fix

### Fixed
- Fixed missing mmrQueryService in indexer module

## [2.9.2] - 2023-07-12
### Fixed
- Sync with @subql/node-core@3.1.2 (#130)
  - Various improvements for POI feature
  - Handle RPC error for oversize block responses
- Missing format transaction in log (#128)

## [2.9.1] - 2023-07-07
### Fixed
- Sync with @subql/node-core@3.1.1, fixed Poi table missing mmr issue
- Finalization check with BSC and improved rate limit handling (#126)

## [2.9.0] - 2023-07-05
### Fixed
- Limit the number of calls to eth_chainId (#123)

### Added
- `store-cache-upper-limit` flag to limit the max size of the store cache. (#124)

## [2.8.0] - 2023-06-27
### Changed
- Update dependencies and sync with changes from main sdk (#118)

### Added
- Custom Error for `api.ethereum`, expose error code. (#115)
- Add flag `query-address-limit` for dictionary queries (#111)

### Fixed
- Fix dictionary queries when using `dynamic-datasources` (#116)

## [2.6.1] - 2023-06-19
### Added
- Support for transaction filter `to: null` (#108)

### Fixed
- Fixed an issue where Node was not working with workers turned on (#106)

## [2.6.0] - 2023-06-15
### Added
- Implement multiple-endpoint improvements from node-core (#102)

### Fixed
- Dictionary queries not including null filters (#104)

## [2.5.3] - 2023-06-13
### Fixed
- Fix module missing sequelize, use subql/x-sequelize (#101)

## [2.5.2] - 2023-06-07
### Fixed
- Sync with node-core 2.4.4, fixed various issue for mmr

## [2.5.1] - 2023-06-02
### Fixed
- Sync with node-core 2.4.3, fixed mmr missing node due to cache lock

### Added
- Added parsed tx logs and decode (#97)

## [2.5.0] - 2023-06-01
### Added
- add timestamp to ethTransaction (#93)

### Fixed
- Running projects from IPFS with workers. Update node-core, apply fixes from main sdk (#94)

## [2.2.2] - 2023-05-22
### Changed
- Update to latest `@subql/node-core`
- Update to Node 18 (#88)

### Fixed
- Fix multiple graphql dependencies due to multiple versions @subql/util (#90)

## [2.2.0] - 2023-05-17
### Changed
- Update to latest node-core
- New method of resolving chain alises (#82)
- dict use equalTo for address (#81)
- Add `chainId` to sandbox global types (#77)

### Fixed
- Fix `ds.options.address` not being used (#79)

## [2.1.2] - 2023-05-12
### Changed
- Sync fix with
  - Fix app could fail to start, due to flush before metadata repo been set (#73)

## [2.1.0] - 2023-05-11
### Changed
- Sync with Main SDK (#70)
  - Updated node core and changes to match
  - Expose `chainId` to sandbox
  - `bulkRemove` method on the store.
  - Ability to regenerate MMR
  - Ability to migrade MMR from file based db to postgres db and vice versa

### Fixed
- Dictionary meta error log (#69)
- Runtime chain name (#71)

## [2.0.1] - 2023-05-09
### Fixed
- Error message when failing to fetch block (#67)

## [2.0.0] - 2023-05-01
### Added
- Added Database cache feature, this significantly improve indexing performance
  - Data flush to database when number of records reaches `--store-cache-threshold` value (default is 1000), this reduces number of transactions to database in order to save time.
  - Direct get data from the cache rather than wait to retrieve it from database, with flag `--store-get-cache-size` user could decide how many records for **each** entity they want to keep in the cache (default is 500)
  - If enabled `--store-cache-async` writing data to the store is asynchronous with regard to block processing (default is enabled)
- Testing Framework, allow users to test their projects filters and handler functions without having to index the project
  - Create test files with the naming convention `*.test.ts` and place them in the `src/tests` or `src/test` folder. Each test file should contain test cases for specific mapping handlers.
  - Run the testing service using the command: `subql-node-ethereum test`.

## [1.0.2] - 2023-04-12
### Fixed
- Improve error handling with 429 errors (#53)
- Check result from json-rpc-batch request is array (#54)

### Changed
- Update node-core, update logic for cockroach db (#55)

## [1.0.1] - 2023-04-05
### Fixed
- Various minor fiexes for dynamic datasources (#51)

### Removed
- Remove `count` method from the store (#51)

## [1.0.0] - 2023-04-03
### Changed
- Initial full release

## [0.4.0] - 2023-02-03
### Changed
- Use `eth_getBlockReceipts` RPC method when available to improve performance (#23)

## [0.3.0] - 2022-11-24
### Added
- Support for dictionaries on with `evmChainId` (#17)
- Convert query params to headers for api key support (##16)

### Fixed
- Binary name

## [0.2.3] - 2022-11-22
### Fixed
- Call and Block filters not working (#d0028a5cd56b7d5505d5d59ba997a55971335d96)

## [0.2.2] - 2022-11-18
### Fixed
- Fix error from sync

## [0.2.1] - 2022-11-18
### Fixed
- Rerelease 0.2.0

## [0.2.0] - 2022-11-17
### Changed
- Sync with main sdk (#14)

## [0.1.1] - 2022-11-10
### Added
- Retry request when encouraging timeout/rate limit behaviours (#9)

## [0.1.0] - 2022-10-31
### Added
- Init release

[Unreleased]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.4.0...HEAD
[5.4.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.3.0...node-ethereum/5.4.0
[5.3.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.2.1...node-ethereum/5.3.0
[5.2.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.2.0...node-ethereum/5.2.1
[5.2.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.1.7...node-ethereum/5.2.0
[5.1.7]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.1.6...node-ethereum/5.1.7
[5.1.6]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.1.5...node-ethereum/5.1.6
[5.1.5]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.1.4...node-ethereum/5.1.5
[5.1.4]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.1.3...node-ethereum/5.1.4
[5.1.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.1.2...node-ethereum/5.1.3
[5.1.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.1.1...node-ethereum/5.1.2
[5.1.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.1.0...node-ethereum/5.1.1
[5.1.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.0.1...node-ethereum/5.1.0
[5.0.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/5.0.0...node-ethereum/5.0.1
[5.0.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.7.3...node-ethereum/5.0.0
[4.7.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.7.2...node-ethereum/4.7.3
[4.7.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.7.1...node-ethereum/4.7.2
[4.7.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.7.0...node-ethereum/4.7.1
[4.7.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.6.0...node-ethereum/4.7.0
[4.6.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.5.2...node-ethereum/4.6.0
[4.5.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.5.1...node-ethereum/4.5.2
[4.5.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.5.0...node-ethereum/4.5.1
[4.5.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.4.3...node-ethereum/4.5.0
[4.4.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.4.2...node-ethereum/4.4.3
[4.4.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.4.1...node-ethereum/4.4.2
[4.4.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.4.0...node-ethereum/4.4.1
[4.4.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.3.2...node-ethereum/4.4.0
[4.3.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.3.1...node-ethereum/4.3.2
[4.3.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.3.0...node-ethereum/4.3.1
[4.3.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.2.0...node-ethereum/4.3.0
[4.2.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.1.1...node-ethereum/4.2.0
[4.1.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.1.0...node-ethereum/4.1.1
[4.1.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/4.0.0...node-ethereum/4.1.0
[4.0.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.11.0...node-ethereum/4.0.0
[3.11.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.10.1...node-ethereum/3.11.0
[3.10.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.10.0...node-ethereum/3.10.1
[3.10.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.9.1...node-ethereum/3.10.0
[3.9.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.9.0...node-ethereum/3.9.1
[3.9.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.8.1...node-ethereum/3.9.0
[3.8.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.8.0...node-ethereum/3.8.1
[3.8.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.7.1...node-ethereum/3.8.0
[3.7.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.7.0...node-ethereum/3.7.1
[3.7.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.6.0...node-ethereum/3.7.0
[3.6.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.5.2...node-ethereum/3.6.0
[3.5.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.5.1...node-ethereum/3.5.2
[3.5.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.5.0...node-ethereum/3.5.1
[3.5.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.4.5...node-ethereum/3.5.0
[3.4.5]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.4.4...node-ethereum/3.4.5
[3.4.4]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.4.3...node-ethereum/3.4.4
[3.4.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.4.2...node-ethereum/3.4.3
[3.4.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.4.1...node-ethereum/3.4.2
[3.4.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.4.0...node-ethereum/3.4.1
[3.4.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.3.6...node-ethereum/3.4.0
[3.3.6]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.3.5...node-ethereum/3.3.6
[3.3.5]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.3.4...node-ethereum/3.3.5
[3.3.4]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.3.3...node-ethereum/3.3.4
[3.3.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.3.2...node-ethereum/3.3.3
[3.3.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.3.1...node-ethereum/3.3.2
[3.3.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.3.0...node-ethereum/3.3.1
[3.3.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.1.2...node-ethereum/3.3.0
[3.1.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.1.1...node-ethereum/3.1.2
[3.1.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.1.0...node-ethereum/3.1.1
[3.1.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.0.6...node-ethereum/3.1.0
[3.0.6]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.0.5...node-ethereum/3.0.6
[3.0.5]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.0.4...node-ethereum/3.0.5
[3.0.4]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.0.3...node-ethereum/3.0.4
[3.0.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.0.2...node-ethereum/3.0.3
[3.0.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.0.1...node-ethereum/3.0.2
[3.0.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/3.0.0...node-ethereum/3.0.1
[3.0.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.12.5...node-ethereum/3.0.0
[2.12.5]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.12.4...node-ethereum/2.12.5
[2.12.4]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.12.3...node-ethereum/2.12.4
[2.12.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.12.2...node-ethereum/2.12.3
[2.12.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.12.1...node-ethereum/2.12.2
[2.12.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.12.0...node-ethereum/2.12.1
[2.12.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.11.1...node-ethereum/2.12.0
[2.11.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.10.0...node-ethereum/2.11.1
[2.10.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.9.2...node-ethereum/2.10.0
[2.9.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.9.1...node-ethereum/2.9.2
[2.9.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.9.0...node-ethereum/2.9.1
[2.9.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.8.0...node-ethereum/2.9.0
[2.8.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.6.1...node-ethereum/2.8.0
[2.6.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum//2.6.0...node-ethereum/2.6.1
[2.6.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.5.3...node-ethereum/2.6.0
[2.5.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.5.2...node-ethereum/2.5.3
[2.5.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.5.1...node-ethereum/2.5.2
[2.5.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.5.0...node-ethereum/2.5.1
[2.5.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.2.2...node-ethereum/2.5.0
[2.2.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.2.0.../node-ethereum/2.2.2
[2.2.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.1.2.../node-ethereum/2.2.0
[2.1.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.1.0.../node-ethereum/2.1.2
[2.1.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.0.1.../node-ethereum/2.1.0
[2.0.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.0.0.../node-ethereum/2.0.1
[2.0.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/1.0.2.../node-ethereum/2.0.0
[1.0.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/1.0.1.../node-ethereum/1.0.2
[1.0.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/1.0.0.../node-ethereum/1.0.1
[1.0.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/0.4.0.../node-ethereum/1.0.0
[0.4.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/0.3.0.../node-ethereum/0.4.0
[0.3.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/0.2.3.../node-ethereum/0.3.0
[0.2.3]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/0.2.2.../node-ethereum/0.2.3
[0.2.2]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/0.2.1.../node-ethereum/0.2.2
[0.2.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/0.2.0.../node-ethereum/0.2.1
[0.2.0]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/0.1.1.../node-ethereum/0.2.0
[0.1.1]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/0.1.0.../node-ethereum/0.1.1
[0.1.0]: https://github.com/subquery/subql-ethereum/tags/node-ethereum/0.1.0
