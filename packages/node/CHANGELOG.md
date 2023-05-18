# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [2.2.0] - 2023-05-17
### Changed
- Update to latest node-core
- New method of resolving chain alises (#82)
- dict use equalTo for address (#81)
- Add `chainId` to sandbox global types (#77)
### Fixed
- Fix `ds.options.address` not being used (#79)

## [2.1.2] - 2023-05-12
- Sync fix with `node-core@2.1.3`
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
- Major release for 2.0.0, align with other SDK versions
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
- Release

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
- Fix error from sync

## [0.2.1] - 2022-11-18
- Rerelease 0.2.0

## [0.2.0] - 2022-11-17

- Sync with main sdk (#14)

## [0.1.1] - 2022-11-10

### Added
- Retry request when encouraging timeout/rate limit behaviours (#9)


## [0.1.0] - 2022-10-31

Initial release
