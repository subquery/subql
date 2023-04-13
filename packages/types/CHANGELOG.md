# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]


## [1.7.2] - 2023-03-29
### Changed
- Update polkadot api to 10.1.4 (#1580)

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

## [1.1.0] - 2022-05-31
### Changed
- Update name for substrate types (#1012)

## [1.0.0] - 2022-05-11
- Major release

## [0.15.0] - 2022-05-02
### Changed
- Update polkadot 8.2.1 (#910)

## [0.14.0] - 2022-02-09
### Added 
- inject `createDynamicDatasource` in global (#773)

## [0.13.0] - 2022-01-13
### Changed
- Update Polkadot/api to 7.3.1 (#745)

## [0.12.0] - 2021-12-16
### Added 
- Add `bulkCreate` in `Store` interface (#699)

## [0.11.0] - 2021-11-27
### Changed
- Update patch api type (#638)

## [0.10.1] - 2021-11-19
### Changed
- Update patch api type (#638)

## [0.10.0] - 2021-11-03
### Changed
- Update interface under project for Moonbeam custom datasource processor (#579)
### Added
- Add interface `FunctionPropertyNames` improve types of entity creation (#573)

## [0.9.0] - 2021-10-26
### Changed
- Update Polkadot/api to v6 (#548)
- Move project manifest types to @subql/types because it is now also required by subquery project. (#512)

## [0.8.5] - 2021-10-12
### Changed
- Update Polkadot/api to 6.3.1 (#505)

## [0.8.4] - 2021-09-16
### Changed
- Update Polkadot/api to 5.9.1 (#476)

## [0.8.3] - 2021-09-01
### Changed
- Update Polkadot/api to 5.7.1 (#460)

## [0.8.2] - 2021-08-20
### Changed
- Update Polkadot/api to 5.5.2 (#439)

## [0.8.1] - 2021-08-16
### Changed
- Update Polkadot/api to 5.5.1 (#433)

## [0.8.0] - 2021-06-25
### Changed
- Update dependencies (#358)

## [0.7.0] - 2021-04-20
### Fixed
- inject logger module in global(#248)

### Added
- Expose events in SubstrateBlock (#256)
- Injecting logger to sandbox's global (#259)
- Store support querying by indexed field (#271)

## [0.6.1] - 2021-03-11

## [0.6.0] - 2021-01-27
### Fixed
- fix crash for events not own by extrinsic (#120)

## [0.5.0] - 2021-01-25
### Added
- patch and inject api in sandbox context (#103)
- support specVersion filter and success filter (#106)

### Changed
- bump @polkadot/api to v3.6.3 (#109)

## [0.3.0] - 2021-01-06
### Added
- support callHandler and eventHandler (#47)

## [0.2.0] - 2020-12-22
### Added
- support block handler

[Unreleased]: https://github.com/subquery/subql/compare/types/0.14.0...HEAD
[0.14.0]: https://github.com/subquery/subql/compare/types/0.13.0...types/0.14.0
[0.13.0]: https://github.com/subquery/subql/compare/types/0.12.0...types/0.13.0
[0.12.0]: https://github.com/subquery/subql/compare/types/0.11.0...types/0.12.0
[0.11.0]: https://github.com/subquery/subql/compare/types/0.10.0...types/0.11.0
[0.10.1]: https://github.com/subquery/subql/compare/types/0.10.0...types/0.10.1
[0.10.0]: https://github.com/subquery/subql/compare/types/0.9.0...types/0.10.0
[0.7.0]: https://github.com/subquery/subql/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/subquery/subql/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/OnFinality-io/subql/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.3.0...v0.5.0
[0.3.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.3.0
