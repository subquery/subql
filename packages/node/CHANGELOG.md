# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.4.7] - 2024-01-24
### Fixed
- `/websocket` being appended to all websocket urls causing the indexer to hang (#222)

## [3.4.6] - 2023-12-25
### Fixed
- Update @subql/node-core to fix bypass block maximum call stack size exceeded issue.

## [3.4.5] - 2023-12-14
### Changed
- Update @subql/common-cosmos and other deps

## [3.4.4] - 2023-11-30
### Fixed
- Sync with `node-core` 7.0.2

## [3.4.3] - 2023-11-28
### Fixed
- Fix ipfs deployment templates path failed to resolved, issue was introduced node-core 7.0.0
- Update with node-core to fix network dictionary timeout but not fallback to config dictionary issue

## [3.4.2] - 2023-11-27
### Changed
- Update `@subql/node-core` with minor fixes

## [3.4.1] - 2023-11-16
### Fixed
- Sync with `node-core` 6.4.2, Fix incorrect enqueuedBlocks, dictionaries timing out by updating `@subql/apollo-links` (#211)

## [3.4.0] - 2023-11-13
### Changed
- Updates to match changes in
  - Dictionary service to use dictionary registry
  - Use yargs from node core

## [3.3.1] - 2023-11-08
### Fixed
- Reading `null` on first block (#204)

## [3.3.0] - 2023-11-06
### Added
- With `dictionary-query-size` now dictionary can config the query block range

### Fixed
- Sync with node-core 6.3.0 with various fixes

## [3.2.0] - 2023-11-01
### Changed
- Update `@subql/node-core` with fixes and support for endBlock feature (#195)

### Fixed
- Missing dependencies for testing command (#194)
- Events getting processed multiple times (#194)

## [3.1.1] - 2023-10-26
### Fixed
- Fix crash when creating new dynamic datasources

## [3.1.0] - 2023-10-20
### Added
- Inject in-memory cache to sandbox

### Fixed
- Bump with `@subq/node-core` 3.1.0 , fixed poi migration init check, and improve logging

## [3.0.3] - 2023-10-17
### Changed
- Update type names to be consistent with main SDK (#189)

### Fixed
- Fix contractCall filtering issue on non-object calls (#188)

## [3.0.2] - 2023-10-12
### Changed
- debug has changed from a boolean to a string to allow scoping debug log level (#2077)

### Fixed
- Sync with node-core.
  - Fixed Poi migration performance issue.
  - Fixed AutoQueue timeout issue.
  - Fixed Poi sync could block DB IO and drop connection issue.

## [3.0.1] - 2023-10-05
### Changed
- Bump `subql/types-cosmos`

## [3.0.0] - 2023-10-04
### Changed
- Updated NetworkConfig to use `chaintypes` instead of `chainTypes` (#180)

## [2.10.3] - 2023-09-20
### Changed
- Downgrade `subql/common` due to breaking changes (#176)

### Fixed
- Adjusted filter function to stringify decoded message data of Long types for correct comparison with filters. (#173)

## [2.10.2] - 2023-08-24
### Changed
- Moved `CosmosChainType` and `CosmosProjectNetConfig` to `@subql/common-cosmos` (#160)

## [2.10.1] - 2023-08-03
### Fixed
- Logs with a missing message throwing an error (#156)
- Test command not working because of dependency issue (#155)

## [2.10.0] - 2023-07-31
### Fixed
- Sync with @node/core, various improvements for POI feature
- Update license to GPL-3.0 (#152)

### Changed
- Sync with node-core :
  - Update node-core and add `store-cache-upper-limit` flag (#144)
  - init db schema manually during test run
  - fix retry logic for workers in connection pool
  - Performance scoring fix

## [2.8.0] - 2023-06-27
### Added
- Multiple endpoints improvement (#134)

### Changed
- Update dependencies and use new features from node-core (#141)
- Default POI store to postgres (#141)

### Fixed
- Don't filter messages for begin/end block events. (#136)

## [2.5.3] - 2023-06-13
### Fixed
- Fix module missing sequelize, use subql/x-sequelize (#101)

## [2.5.2] - 2023-06-08
### Fixed
- Sync with node-core 2.4.4, fixed various issue for mmr

## [2.5.1] - 2023-06-02
### Fixed
- Sync with node-core 2.4.3, fixed mmr missing node due to cache lock

## [2.5.0] - 2023-06-01
### Changed
- Update node-core and fix issues with projects from ipfs (#128)
- upgrade to tendermint37 client (#126)

## [2.3.0] - 2023-05-24
### Changed
- Update to Node 18
- Update node-core

## [2.1.0] - 2023-05-05
### Added
- Support for unfinalized blocks with workers

### Changed
- Index all the fields of block responses from tendermint API
- Index block begin events and block end events
- Sync with main SDK

## [2.0.1] - 2023-05-05
### Fixed
- Registry not being provided to the sandbox (#114)

## [2.0.0] - 2023-05-03
### Added
- Added Database cache feature, this significantly improve indexing performance
  - Data flush to database when number of records reaches `--store-cache-threshold` value (default is 1000), this reduces number of transactions to database in order to save time.
  - Direct get data from the cache rather than wait to retrieve it from database, with flag `--store-get-cache-size` user could decide how many records for **each** entity they want to keep in the cache (default is 500)
  - If enabled `--store-cache-async` writing data to the store is asynchronous with regard to block processing (default is enabled)
- Testing Framework, allow users to test their projects filters and handler functions without having to index the project
  - Create test files with the naming convention `*.test.ts` and place them in the `src/tests` or `src/test` folder. Each test file should contain test cases for specific mapping handlers.
  - Run the testing service using the command: `subql-node-cosmos test`.
- Expose `validator()` from tendermint client to safe api in sandbox. This will allow projects to fetch validators of current block. (#106)

## [1.19.1] - 2023-04-14
### Changed
- `@subql/utils` to support JSON types without indexes

## [1.19.0] - 2023-03-13
### Changed
- Sync with main sdk (#100)

## [1.18.0] - 2023-02-14
### Changed
- Sync with main sdk (#97)
- Update cosmjs (#96)
- Fix decoding blocks (#96)

## [1.13.2] - 2023-01-23
### Added
- Add full block header to Block (#94)

## [1.13.1] - 2023-01-12
### Changed
- Sync with latest changes on Substrate SDK (#90)
- Bump versions
  - `@subql/node-core`
  - `@subql/utils`
  - `@polkadot/api`
  - `@polkadot/utils`

## [1.13.0] - 2022-12-20
### Changed
- Sync with latest changes on Substrate SDK (#86)

### Fixed
- Exit when `workers` fail to prevent missing blocks (#87)
- `reindex` subcommand, missing dependency (#89)

### Added
- Dictionary support for custom datasources (#85)

## [1.12.0] - 2022-11-17
### Changed
- Sync with latest changes on Substrate SDK ()
  - Hot schema reload
  - Update `@subql/node-core` dependencies

## [1.11.2] - 2022-11-10
### Added
- Retry request when encountering timeout/rate limit behaviours. (#78)

## [1.11.1] - 2022-11-08
### Changed
- Sync with latest changes with @subql/node-core, remove sequelize alter table

## [1.11.0] - 2022-11-02
### Changed
- Sync with latest changes on Substrate SDK (#76):
  - Fix issue with `--output-fmt` arg.
  - Add `timestamp` filter to block handlers.
  - Fixed issues creating dynamic datasources in the same block.

## [1.10.5] - 2022-10-13
### Fixed
- Registry not being injected into datasource processor VM. (#73)

## [1.10.4] - 2022-10-11
### Changed
- Sync with latest changes on Substrate SDK:
  - Remove deprecated subqueries table

## [1.10.3] - 2022-10-06
### Changed
- `@subql/common` and `@subql/node-core` dependencies updated.

### Changed
- Sync with latest changes on Substrate SDK:
  - New `reindex` and `force-clean` subcommands.
  - Enable historical feature by default.

## [1.10.2] - 2022-09-30
### Fixed
- Fix unable use rpc with api key issue due to incorrect url passed to axios (#64)

## [1.10.1] - 2022-09-30
### Fixed
- Fix unable initialize due to missing sequelize in `node-core` package (#59)

## [1.10.0] - 2022-09-27
### Added
- `attributes` filter to event handlers. (#56)

## [1.9.1] - 2022-09-15
### Fixed
- OnFinality endpoints with api key in query params working. (#54)

### Added
- Filter for `includeFailedTx` on Transaction and Message handlers. This will now exclude failed transactions by default. (#53)

## [1.9.0] - 2022-09-02
### Changed
- Update to same version numbering as Substrate SDK.
- Sync with latest changes on Substrate SDK:
  - Use `@subql/node-core` package.
  - Updated `store.getByField` to have limit and offset options: `getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>`;.
  - Improved performance logging.
  - Added `bulkUpdate` and `bulkGet` to the injected store. This can be used to optimise handlers and speed up indexing.
  - Fixed indexing stop processing blocks.

## [0.3.0] - 2022-07-28
### Changed
- Sync with the latest development from origin. See
  - Support for worker threads
  - Added `dictionary-timeout` flag

### Fixed
- Custom datasource processors. (#42)
- Fixed `chainId` instead of `chain` being in metadata reponse. (#48)

## [0.2.0] - 2022-07-08
### Changed
- Decode buffer to json for `cosmwasm.wasm.v1.MsgMigrateContract` and `cosmwasm.wasm.v1.MsgInstantiateContract` messages (#38)

## [0.1.3] - 2022-07-01
### Fixed
- Dependency injection issue with EventEmitter

## [0.1.2] - 2022-07-01
### Fixed
- Docker image health checks failing because of missing `curl` command

### Added
- Inject the types registry into the sandbox (#34)

## [0.1.1] - 2022-06-29
### Changed
- Sync with latest development from origin (#31)

### Added
- HTTP keep alive (#30)

## [0.1.0] - 2022-06-27
### Changed
- Messages and events have changed `message.msg.msg` to `message.msg.decodeMsg.msg`. This is due to lazy loading and will mean you don't need to provide chain types for messages you don't care about
- Dictionary structure has changed

### Fixed
- Loading chainTypes that referred to other files (#28)
- Dictionary queries, this also required a new dictionary (#26)

### Changed
- Sync with latest development from origin (#27)

### Added
- Support for nested filters (#21)
- Support for enum contract call (#23)
- Lazy decoding of messages (#17)

## [0.0.7] - 2022-06-21
### Fixed
- Handle JSON variable types in dictionary (#24)
- Dictionary message filter being undefined

## [0.0.6] - 2022-06-17
### Fixed
- Use modified tendermint-rpc to avoid Juno block 3103475

## [0.0.5] - 2022-06-15
### Added
- Init release

[Unreleased]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.4.7...HEAD
[3.4.7]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.4.6...node-cosmos/3.4.7
[3.4.6]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.4.5...node-cosmos/3.4.6
[3.4.5]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.4.4...node-cosmos/3.4.5
[3.4.4]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.4.3...node-cosmos/3.4.4
[3.4.3]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.4.2...node-cosmos/3.4.3
[3.4.2]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.4.1...node-cosmos/3.4.2
[3.4.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.4.0...node-cosmos/3.4.1
[3.4.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.3.1...node-cosmos/3.4.0
[3.3.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.3.0...node-cosmos/3.3.1
[3.3.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.2.0...node-cosmos/3.3.0
[3.2.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.1.1...node-cosmos/3.2.0
[3.1.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.1.0...node-cosmos/3.1.1
[3.1.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.0.3...node-cosmos/3.1.0
[3.0.3]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.0.2...node-cosmos/3.0.3
[3.0.2]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.0.1...node-cosmos/3.0.2
[3.0.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/3.0.0...node-cosmos/3.0.1
[3.0.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.10.3...node-cosmos/3.0.0
[2.10.3]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.10.2...node-cosmos/2.10.3
[2.10.2]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.10.1...node-cosmos/2.10.2
[2.10.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.10.0...node-cosmos/2.10.1
[2.10.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.8.0...node-cosmos/2.10.0
[2.8.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.5.3...node-cosmos/2.8.0
[2.5.3]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.5.2...node-cosmos/2.5.3
[2.5.2]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.5.1...node-cosmos/2.5.2
[2.5.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.5.0...node-cosmos/2.5.1
[2.5.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.3.0...node-cosmos/2.5.0
[2.3.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.1.0...node-cosmos/2.3.0
[2.1.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.0.1...node-cosmos/2.1.0
[2.0.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/2.0.0...node-cosmos/2.0.1
[2.0.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/.1.19.1..node-cosmos/2.0.0
[1.19.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.19.0...node-cosmos/1.19.1
[1.19.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.18.0...node-cosmos/1.19.0
[1.18.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.13.2...node-cosmos/1.18.0
[1.13.2]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.13.1...node-cosmos/1.13.2
[1.13.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.13.0...node-cosmos/1.13.1
[1.13.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.12.0...node-cosmos/1.13.0
[1.12.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.11.2...node-cosmos/1.12.0
[1.11.2]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.11.1...node-cosmos/1.11.2
[1.11.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.11.0...node-cosmos/1.11.1
[1.11.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.10.5...node-cosmos/1.11.0
[1.10.5]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.10.4...node-cosmos/1.10.5
[1.10.4]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.10.3...node-cosmos/1.10.4
[1.10.3]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.10.2...node-cosmos/1.10.3
[1.10.2]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.10.1...node-cosmos/1.10.2
[1.10.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.10.0...node-cosmos/1.10.1
[1.10.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.9.1...node-cosmos/1.10.0
[1.9.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/1.9.0...node-cosmos/1.9.1
[1.9.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.3.0...node-cosmos/1.9.0
[0.3.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.2.0...node-cosmos/0.3.0
[0.2.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.1.3...node-cosmos/0.2.0
[0.1.3]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.1.2...node-cosmos/0.1.3
[0.1.2]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.1.1...node-cosmos/0.1.2
[0.1.1]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.1.0...node-cosmos/0.1.1
[0.1.0]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.0.7...node-cosmos/0.1.0
[0.0.7]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.0.6...node-cosmos/0.0.7
[0.0.6]: https://github.com/subquery/subql-cosmos/compare/node-cosmos/0.0.5...node-cosmos/0.0.6
[0.0.5]: https://github.com/subquery/subql-cosmos/tags/node-cosmos/0.0.5
