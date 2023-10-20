# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.0] - 2023-10-20
### Changed
- Version bump with `types-core` 0.2.0

## [3.0.3] - 2023-10-17
### Changed
- Update type names to be consistent with main SDK (#189)

## [3.0.2] - 2023-10-12
### Changed
- Bump with `@subql/types-core` 0.1.1 (#186)

## [3.0.1] - 2023-10-05
### Fixed
- Fixed RuntimeDatasourceTemplate's generic typing (#182)

## [3.0.0] - 2023-10-04
### Added
- Added `cosmwasm` messages types (#168)

### Changed
- Updated NetworkConfig to use `chaintypes` instead of `chainTypes` (#180)

## [2.2.1] - 2023-07-31
### Changed
- Update license to GPL-3.0 (#152)

## [2.2.0] - 2023-06-01
### Changed
- upgrade to tendermint37 client (#126)

## [2.1.0] - 2023-05-17
### Changed
- Use Block interface from `@cosmjs/tendermint-rpc`
- Sync with main SDK

## [2.0.0] - 2023-05-03
### Changed
- Sync with main SDK for 2.0 release

## [0.4.3] - 2023-02-14
### Changed
- Sync with main sdk (#97)
- Update cosmjs (#96)

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
- Updated `store.getByField` to have limit and offset options: `getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;`.
- Added `bulkUpdate` and `bulkGet` to the injected store. This can be used to optimise handlers and speed up indexing.

## [0.1.1] - 2022-07-01
### Added
- Inject the types registry into the sandbox (#34)

## [0.1.0] - 2022-06-27
### Changed
- Messages and events have changed `message.msg.msg` to `message.msg.decodeMsg.msg`. This is due to lazy loading and will mean you don't need to provide chain types for messages you don't care about (#17)

## [0.0.6] - 2022-06-21
### Fixed
- Fix chainTypes not being in deployments

## [0.0.5] - 2022-06-15
[Unreleased]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/3.1.0...HEAD
[3.1.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/3.0.3...types-cosmos/3.1.0
[3.0.3]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/3.0.2...types-cosmos/3.0.3
[3.0.2]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/3.0.1...types-cosmos/3.0.2
[3.0.1]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/3.0.0...types-cosmos/3.0.1
[3.0.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/2.2.0...types-cosmos/3.0.0
[2.2.1]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/2.2.0...types-cosmos/2.2.1
[2.2.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/2.1.0...types-cosmos/2.2.0
[2.1.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/2.0.0...types-cosmos/2.1.0
[2.0.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.4.3...types-cosmos/2.0.0
[0.4.3]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.4.2...types-cosmos/0.4.3
[0.4.2]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.4.1...types-cosmos/0.4.2
[0.4.1]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.4.0...types-cosmos/0.4.1
[0.4.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.3.0...types-cosmos/0.4.0
[0.3.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.2.0...types-cosmos/0.3.0
[0.2.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.1.1...types-cosmos/0.2.0
[0.1.1]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.1.0...types-cosmos/0.1.1
[0.1.0]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.0.6...types-cosmos/0.1.0
[0.0.6]: https://github.com/subquery/subql-cosmos/compare/types-cosmos/0.0.5...types-cosmos/0.0.6
[0.0.5]: https://github.com/subquery/subql-cosmos/tag/types-cosmos/0.0.5
