# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Incorrect generic parameter type (#321)

## [3.9.0] - 2024-07-03
### Added
- Add missing method `getAbiInterface` in type `EthereumNetworkModule` (#323)

## [3.8.0] - 2024-07-03
### Added
- Add type `EthereumNetworkModule` to support eth module (#318)

## [3.7.0] - 2024-06-12
### Changed
- Deprecated flare SDK (#2428)

## [3.6.1] - 2024-05-27
### Changed
- Type for unsafeApi to from Provider to JsonRpcProvider (#291)

## [3.6.0] - 2024-04-30
### Changed
- Update `@subql/types-core` and use types from there

## [3.5.0] - 2024-04-03
### Changed
- version updated with @subql/types-core, also update api interface (#225)

## [3.4.0] - 2024-03-13
### Changed
- Make receipt method on transaction type generic for OP L1 fields support (#258)

## [3.3.1] - 2024-02-07
### Changed
- Update `@subql/types-core`

## [3.3.0] - 2024-02-02
### Fixed
- Fix Eth datasource miss extend base datasource type, missing `endBlock` in Datasource

### Added
- Transaction filter function field can now be null (#243)

## [3.2.1] - 2023-11-30
### Changed
- Sync with `@subql/types-core` 0.4.0

## [3.2.0] - 2023-11-01
### Changed
- Import `@subql/types-core` global into global so its no longer needed to update tsconfig in projects (#195)

## [3.1.0] - 2023-10-20
### Changed
- Version bump with `types-core` 0.2.0

## [3.0.2] - 2023-10-05
### Fixed
- Fixed RuntimeDatasourceTemplate's generic typing (#177)

## [3.0.1] - 2023-10-04
### Changed
- Version bump with `types-core` 0.1.1

## [3.0.0] - 2023-10-03
### Added
- Light types for block and logs (#170)

### Changed
- Version bump with `types-core`

## [2.2.5] - 2023-09-04
### Fixed
- Previous failed release

## [2.2.4] - 2023-08-14
### Fixed
- fix missing `unsafeApi` in the global (#141)

## [2.2.3] - 2023-07-31
### Fixed
- Update license (#137)

## [2.2.2] - 2023-06-01
### Added
- add timestamp to ethTransaction (#93)

## [2.2.1] - 2023-05-22
### Fixed
- Previous release failed

## [2.2.0] - 2023-05-22
### Fixed
- Add chainId to global (#77)

## [2.1.0] - 2023-05-11
### Added
- `bulkRemove` to the store
- `chainId` to the sandbox

## [2.0.0] - 2023-05-01
### Changed
- Sync with main SDK for 2.0 release

## [1.0.1] - 2023-04-05
### Removed
- Remove `count` method from the store (#51)

## [1.0.0] - 2023-04-03
### Changed
- Release

## [0.2.2] - 2023-01-23
### Added
- Add `count` to `Store` interface (#1480)

## [0.2.1] - 2022-11-18
### Fixed
- Re-release 0.2.1

## [0.2.0] - 2022-11-17
### Changed
- Sync with main sdk (#14)

## [0.1.0] - 2022-10-31
[Unreleased]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.9.0...HEAD
[3.9.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.8.0...types-ethereum/3.9.0
[3.8.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.7.0...types-ethereum/3.8.0
[3.7.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.6.1...types-ethereum/3.7.0
[3.6.1]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.6.0...types-ethereum/3.6.1
[3.6.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.5.0...types-ethereum/3.6.0
[3.5.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.4.0...types-ethereum/3.5.0
[3.4.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.3.1...types-ethereum/3.4.0
[3.3.1]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.3.0...types-ethereum/3.3.1
[3.3.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.2.1...types-ethereum/3.3.0
[3.2.1]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.2.0...types-ethereum/3.2.1
[3.2.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.1.0...types-ethereum/3.2.0
[3.1.0]: https://github.com/subquery/subql-ethereum/compare/types-ethereum/3.0.2...types-ethereum/3.1.0
[3.0.2]: https://github.com/subquery/subql-ethereum/compare/types/3.0.1...types/3.0.2
[3.0.1]: https://github.com/subquery/subql-ethereum/compare/types/3.0.0...types/3.0.1
[3.0.0]: https://github.com/subquery/subql-ethereum/compare/types/2.2.5...types/3.0.0
[2.2.5]: https://github.com/subquery/subql-ethereum/compare/types/2.2.4...types/2.2.5
[2.2.4]: https://github.com/subquery/subql-ethereum/compare/types/2.2.3...types/2.2.4
[2.2.3]: https://github.com/subquery/subql-ethereum/compare/types/2.2.2...types/2.2.3
[2.2.2]: https://github.com/subquery/subql-ethereum/compare/types/2.2.1...types/2.2.2
[2.2.1]: https://github.com/subquery/subql-ethereum/compare/types/v2.2.0...types/v2.2.1
[2.2.0]: https://github.com/subquery/subql-ethereum/compare/types/v2.1.0...types/v2.2.0
[2.1.0]: https://github.com/subquery/subql-ethereum/compare/types/2.0.0v.../types/v2.1.0
[2.0.0]: https://github.com/subquery/subql-ethereum/compare/types/1.0.1v.../types/v2.0.0
[1.0.1]: https://github.com/subquery/subql-ethereum/compare/types/1.0.0v.../types/v1.0.1
[1.0.0]: https://github.com/subquery/subql-ethereum/compare/types/0.2.2v.../types/v1.0.0
[0.2.2]: https://github.com/subquery/subql-ethereum/compare/types/0.2.1v.../types/v0.2.2
[0.2.1]: https://github.com/subquery/subql-ethereum/compare/types/0.2.0v.../types/v0.2.1
[0.2.0]: https://github.com/subquery/subql-ethereum/compare/types/0.2.0v.../types/v0.2.0
[0.1.0]: https://github.com/subquery/subql-ethereum/tag/v0.1.0
