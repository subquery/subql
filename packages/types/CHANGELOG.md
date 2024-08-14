# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.11.2] - 2024-08-14
### Added
- Update polkadot/api library

## [3.11.1] - 2024-08-12
### Fixed
- DS Processor types not being able to distinguish input and filter types (#2522)

## [3.11.0] - 2024-08-05
### Changed
- Update dependencies (#2518)

## [3.10.0] - 2024-08-01
### Fixed
- Fix timestamp can be undefined (#2514)

### Changed
- Bump version with `@subql/types-core`

## [3.9.0] - 2024-07-09
### Changed
- Enable TS strict setting.

### Removed
- Deprecated types relating to datasource processors (#2475)

## [3.8.0] - 2024-07-01
### Changed
- Bump version with `@subql/types-core`

## [3.7.0] - 2024-06-21
### Changed
- Bump version with `@subql/types-core`

## [3.6.1] - 2024-06-12
### Changed
- Update polkadot dependencies to 11.2.1 (#2440)

## [3.6.0] - 2024-05-08
### Changed
- Update polkadot dependencies to v11

## [3.5.0] - 2024-04-24
### Changed
- Use ds processor types from `@subql/types-core` (#2357)

## [3.4.0] - 2024-03-28
### Added
- Add IBlock interface for block content of all networks, also support dictionary to be array type (#2257)

## [3.3.1] - 2024-02-07
### Changed
- Update `@subql/types-core`

## [3.3.0] - 2023-10-31
### Changed
- Import types-core global so there is no need to update tsconfig
- Update `@subql/types-core` to add support for endBlock

## [3.2.0] - 2023-10-20
### Changed
- Version bump with `types-core` 0.2.0

## [3.1.2] - 2023-10-04
### Fixed
- `@subql/types-core` being a devDep instead of a dep

## [3.1.1] - 2023-10-03
### Changed
- Version bump with `types-core` 0.1.1

## [3.1.0] - 2023-10-02
### Changed
- Update project types with `types-core` 0.1.0 (#2056)

## [3.0.1] - 2023-09-28
### Changed
- Move non-specific types to types-core package, add `SubstrateProject` type to define project manifest in typescript. (#2011)

### Added
- New LightBlock type (#1968)
- `getByFields` function to store interface (#1993)

## [2.2.0] - 2023-08-16
### Added
- `isSigned` filter to call handler (#1940)

### Changed
- Allow boolean types in DictionaryQueryCondition (#1940)

## [2.1.4] - 2023-08-11
### Fixed
- Fix missing `unsafeApi` in global (#1935)

## [2.1.3] - 2023-07-31
### Fixed
- Update license (#1891)

## [2.1.2] - 2023-05-11
### Added
- Inject the chain id into sandboxes (#1684)

## [2.1.1] - 2023-05-11
### Changed
- `DictionaryQueryCondition` type (#1679)

## [2.1.0] - 2023-05-10
### Added
- `bulkRemove` method on the store. (#1666)

## [2.0.0] - 2023-04-20
### Changed
- Major release 2.0.0, align with other package versions
- Update interfaces to support testing framework (#1584)
- Removed `count` method from `Store`

## [1.7.2] - 2023-03-29
### Changed
- Update polkadot api to 10.1.4 (#1580)

## [1.7.1] - 2023-01-23
### Added
- Add `count` to `Store` interface (#1480)

## [1.7.0] - 2022-12-06
### Added
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
- Minor release

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
### Changed
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
### Fixed
- patch release with other packages (#228)

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

[Unreleased]: https://github.com/subquery/subql/compare/types/3.11.2...HEAD
[3.11.2]: https://github.com/subquery/subql/compare/types/3.11.1...types/3.11.2
[3.11.1]: https://github.com/subquery/subql/compare/types/3.11.0...types/3.11.1
[3.11.0]: https://github.com/subquery/subql/compare/types/3.10.0...types/3.11.0
[3.10.0]: https://github.com/subquery/subql/compare/types/3.9.0...types/3.10.0
[3.9.0]: https://github.com/subquery/subql/compare/types/3.8.0...types/3.9.0
[3.8.0]: https://github.com/subquery/subql/compare/types/3.7.0...types/3.8.0
[3.7.0]: https://github.com/subquery/subql/compare/types/3.6.1...types/3.7.0
[3.6.1]: https://github.com/subquery/subql/compare/types/3.6.0...types/3.6.1
[3.6.0]: https://github.com/subquery/subql/compare/types/3.5.0...types/3.6.0
[3.5.0]: https://github.com/subquery/subql/compare/types/3.4.0...types/3.5.0
[3.4.0]: https://github.com/subquery/subql/compare/types/3.3.1...types/3.4.0
[3.3.1]: https://github.com/subquery/subql/compare/types/3.3.0...types/3.3.1
[3.3.0]: https://github.com/subquery/subql/compare/types/3.2.0...types/3.3.0
[3.2.0]: https://github.com/subquery/subql/compare/types/3.1.2...types/3.2.0
[3.1.2]: https://github.com/subquery/subql/compare/types/3.1.1...types/3.1.2
[3.1.1]: https://github.com/subquery/subql/compare/types/3.1.0...types/3.1.1
[3.1.0]: https://github.com/subquery/subql/compare/types/3.0.1...types/3.1.0
[3.0.1]: https://github.com/subquery/subql/compare/types/2.2.0...types/3.0.1
[2.2.0]: https://github.com/subquery/subql/compare/types/2.1.4...types/2.2.0
[2.1.4]: https://github.com/subquery/subql/compare/types/2.1.3...types/2.1.4
[2.1.3]: https://github.com/subquery/subql/compare/types/2.1.2...types/2.1.3
[2.1.2]: https://github.com/subquery/subql/compare/types/2.1.1...types/2.1.2
[2.1.1]: https://github.com/subquery/subql/compare/types/2.1.1...types/2.1.1
[2.1.0]: https://github.com/subquery/subql/compare/types/2.0.0...types/2.1.0
[2.0.0]: https://github.com/subquery/subql/compare/types/1.7.2...types/2.0.0
[1.7.2]: https://github.com/subquery/subql/compare/types/1.7.1...types/1.7.2
[1.7.1]: https://github.com/subquery/subql/compare/types/1.7.0...types/1.7.1
[1.7.0]: https://github.com/subquery/subql/compare/types/1.6.0...types/1.7.0
[1.6.0]: https://github.com/subquery/subql/compare/types/1.5.1...types/1.6.0
[1.5.1]: https://github.com/subquery/subql/compare/types/1.5.0...types/1.5.1
[1.5.0]: https://github.com/subquery/subql/compare/types/1.4.0...types/1.5.0
[1.4.0]: https://github.com/subquery/subql/compare/types/1.3.0...types/1.4.0
[1.3.0]: https://github.com/subquery/subql/compare/types/1.2.1...types/1.3.0
[1.2.1]: https://github.com/subquery/subql/compare/types/1.2.0...types/1.2.1
[1.2.0]: https://github.com/subquery/subql/compare/types/1.1.0...types/1.2.0
[1.1.0]: https://github.com/subquery/subql/compare/types/1.0.0...types/1.1.0
[1.0.0]: https://github.com/subquery/subql/compare/types/0.15.0...types/1.0.0
[0.15.0]: https://github.com/subquery/subql/compare/types/0.14.0...types/0.15.0
[0.14.0]: https://github.com/subquery/subql/compare/types/0.13.0...types/0.14.0
[0.13.0]: https://github.com/subquery/subql/compare/types/0.12.0...types/0.13.0
[0.12.0]: https://github.com/subquery/subql/compare/types/0.11.0...types/0.12.0
[0.11.0]: https://github.com/subquery/subql/compare/types/0.10.0...types/0.11.0
[0.10.1]: https://github.com/subquery/subql/compare/types/0.10.0...types/0.10.1
[0.10.0]: https://github.com/subquery/subql/compare/types/0.9.0...types/0.10.0
[0.9.0]: https://github.com/subquery/subql/compare/types/0.8.5...types/0.9.0
[0.8.5]: https://github.com/subquery/subql/compare/types/0.8.4...types/0.8.5
[0.8.4]: https://github.com/subquery/subql/compare/types/0.8.3...types/0.8.4
[0.8.3]: https://github.com/subquery/subql/compare/types/0.8.2...types/0.8.3
[0.8.2]: https://github.com/subquery/subql/compare/types/0.8.1...types/0.8.2
[0.8.1]: https://github.com/subquery/subql/compare/types/0.8.0...types/0.8.1
[0.8.0]: https://github.com/subquery/subql/compare/types/0.7.0...types/0.8.0
[0.7.0]: https://github.com/subquery/subql/compare/types/0.6.1...types/0.7.0
[0.6.1]: https://github.com/subquery/subql/compare/types/0.6.0...types/0.6.1
[0.6.0]: https://github.com/subquery/subql/compare/types/0.5.0...types/0.6.0
[0.5.0]: https://github.com/subquery/subql/compare/types/0.3.0...types/0.5.0
[0.3.0]: https://github.com/subquery/subql/compare/types/0.2.0...types/0.3.0
[0.2.0]: https://github.com/subquery/subql/tag/v0.2.0
