# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]

## [1.13.1] - 2023-01-12
### Update
- Sync with latest changes on Substrate SDK (#90)
- Bump versions
  - `@subql/node-core`
  - `@subql/utils`
  - `@polkadot/api`
  - `@polkadot/utils` 

## [1.13.0] - 2022-12-20
### Updated
- Sync with latest changes on Substrate SDK (#86)
### Fixed
- Exit when `workers` fail to prevent missing blocks (#87)
- `reindex` subcommand, missing dependency (#89)
### Added
-  Dictionary support for custom datasources (#85)


## [1.12.0] - 2022-11-17
### Updated
- Sync with latest changes on Substrate SDK ()
  - Hot schema reload
  - Update `@subql/node-core` dependencies 

## [1.11.2] - 2022-11-10
### Added
- Retry request when encountering timeout/rate limit behaviours. (#78)

## [1.11.1] - 2022-11-08
### Updated
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
### Updated
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
- Sync with latest development from origin. See [@subql/node changelog](https://github.com/subquery/subql/blob/main/packages/node/CHANGELOG.md) from v1.2.1 to v1.6.0 (#44) (#45)
  Some highlights:
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

### Updated
- Sync with latest development from origin (#31)

### Added
- HTTP keep alive (#30)

## [0.1.0] - 2022-06-27

### Breaking changes
- Messages and events have changed `message.msg.msg` to `message.msg.decodeMsg.msg`. This is due to lazy loading and will mean you don't need to provide chain types for messages you don't care about
- Dictionary structure has changed

### Fixed
- Loading chainTypes that referred to other files (#28)
- Dictionary queries, this also required a new dictionary (#26)

### Updated
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
First release

[Unreleased]: https://github.com/subquery/subql-cosmos/compare/node/1.9.0...HEAD
[1.9.0]: https://github.com/subquery/subql-cosmos/compare/node/0.3.0...node/1.9.0
[0.3.0]: https://github.com/subquery/subql-cosmos/compare/node/0.2.0...node/0.3.0
[0.2.0]: https://github.com/subquery/subql-cosmos/compare/node/0.1.3...node/0.2.0
[0.1.3]: https://github.com/subquery/subql-cosmos/compare/node/0.1.2...node/0.1.3
[0.1.2]: https://github.com/subquery/subql-cosmos/compare/node/0.1.1...node/0.1.2
[0.1.1]: https://github.com/subquery/subql-cosmos/compare/node/0.1.0...node/0.1.1
[0.1.0]: https://github.com/subquery/subql-cosmos/compare/node/0.0.7...node/0.1.0
[0.0.7]: https://github.com/subquery/subql-cosmos/compare/node/0.0.6...node/0.0.7
[0.0.6]: https://github.com/subquery/subql-cosmos/compare/node/0.0.5...node/0.0.6
