# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
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

[Unreleased]: https://github.com/subquery/subql-ethereum/compare/node-ethereum/2.12.5...HEAD
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
