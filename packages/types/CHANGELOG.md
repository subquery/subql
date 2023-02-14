# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]
## [1.7.1] - 2023-01-23
### Added
- Add `count` to `Store` interface (#1480)

## [1.7.0] - 2022-12-06
- Support for `bypassBlocks` (#1435)

## [1.6.0] - 2022-10-27
### Added
- Timestamp filter to block handlers (#1310)

## [1.5.1] - 2022-10-11
### Added
- Matcher to dictionary query condition. (#1345)

## [1.5.0] - 2022-09-13
### Changed
- Change types to support wasm processor and update polkadot API to v9. (#1280)

## [1.4.0] - 2022-08-26

### Changed
- Updated store.getByField to have limit and offset options. `getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;`. (#1259)

## [1.3.0] - 2022-08-17
### Added
- `bulkUpdate` and `bulkGet` to the injected store. This can be used to optimise handlers and speed up indexing. (#1246)

## [1.2.1] - 2022-08-04
### Fixed
- Export `EventTypeRecord`. (#1225)

## [1.2.0] - 2022-07-27
### Changed
- Update `SubstrateBlockFilter` with new `modulo` filter. (#1196)
- Make `SubstrateExtrinsic` and `SubstrateEvent` types generic. This allows specifying the data/args type rather than being provided with `Codec[]` or `AnyTuple`. (#1194)

## [0.4.2] - 2023-01-23
### Added
- Add `header` to `CosmosBlock` interface (#94)

## [0.4.1] - 2023-01-12
### Added
- `count` to Store interface. (#90)

## [0.4.0] - 2022-11-02
### Added
- `timestamp` filter to block handler. (#76)

## [0.3.0] - 2022-09-27
### Added
- `attributes` filter to event handlers. (#56)

## [0.2.0] - 2022-09-02

### Changed
Sync changes from main SDK:
- Updated `store.getByField` to have limit and offset options: `getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;`.
- Added `bulkUpdate` and `bulkGet` to the injected store. This can be used to optimise handlers and speed up indexing.


## [0.1.1] - 2022-07-01
- Inject the types registry into the sandbox (#34)

### Added

## [0.1.0] - 2022-06-27

### Changed
- Messages and events have changed `message.msg.msg` to `message.msg.decodeMsg.msg`. This is due to lazy loading and will mean you don't need to provide chain types for messages you don't care about (#17)

## [0.0.6] - 2022-06-21
### Fixed
- Fix chainTypes not being in deployments

## [0.0.5] - 2022-06-15
First release

[Unreleased]: https://github.com/subquery/subql-cosmos/compare/types/0.2.0...HEAD
[0.2.0]: https://github.com/subquery/subql-cosmos/compare/types/0.1.1...types/0.2.0
[0.1.1]: https://github.com/subquery/subql-cosmos/compare/types/0.1.0...types/0.1.1
[0.1.0]: https://github.com/subquery/subql-cosmos/compare/types/0.0.6...types/0.1.0
[0.0.6]: https://github.com/subquery/subql-cosmos/compare/types/0.0.5...types/0.0.6
