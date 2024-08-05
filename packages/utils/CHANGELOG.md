# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.14.0] - 2024-08-05
### Added
- `findAvailablePort` function from common package (#2518)

### Changed
- Update dependencies (#2518)

## [2.13.1] - 2024-07-25
### Fixed
- Fix hashcode for Json and Json array, sorted keys before hashing

## [2.13.0] - 2024-07-22
### Changed
- Update error log format to specify the name of the error instance where possible (#2492)

## [2.12.1] - 2024-07-09
### Changed
- Changes to ts build settings (#2475)

## [2.12.0] - 2024-06-21
### Added
- Better error messages for invalid graphql schemas (#2458)

### Added
- enable ts strict mode
- TS check reports errors when debugging Query

## [2.11.0] - 2024-06-12
### Changed
- Support logging errors with provided cause and improve colors (#2435)

## [2.10.0] - 2024-05-08
### Changed
- Update polkadot dependencies to v11

## [2.9.2] - 2024-05-02
### Fixed
- Debug flag not working with worker loggers (#2374)

## [2.9.1] - 2024-04-12
### Changed
- Update tar dependency

## [2.9.0] - 2024-03-28
### Added
- Export 'numberToHex' (#2307)
- Add method `hexStripZeros` to handle hex string in order to align with ethers (#2319)

## [2.8.0] - 2024-03-05
### Added
- New fullText graphql directive (#2280)

## [2.7.1] - 2024-02-29
### Fixed
- Fixed Int hashCode method failed due to original method not support negative value (#2278)

## [2.7.0] - 2024-01-25
### Added
- export sequelize support types (#2179)

## [2.6.2] - 2024-01-10
### Fixed
- Update x-sequelize improve `getForeignKeyReferencesQuery` performance in large size DB (#2212)

## [2.6.1] - 2024-01-04
### Fixed
- Update x-sequelize, fix `more than one row returned by a subquery used as an expression` error. (#2209)

## [2.6.0] - 2023-11-10
### Changed
- Update Polkadot/util to 10.5.1 (#2150)

### Removed
- Removed unused `axios` from dependency (#2155)

## [2.5.0] - 2023-10-31
### Added
- Logger now supports negative filters. To use this prefix the logger name with a `-`. E.g `--debug="*,-SQL"` (#2133)

## [2.4.4] - 2023-10-11
### Added
- Option to set debug level for child loggers

### Fixed
- fix undefined ts type for unsupported field type (#2003)

## [2.4.3] - 2023-07-31
### Fixed
- Update license (#1891)

## [2.4.2] - 2023-06-26
### Fixed
- Incorrect type for rowCountEstimate on metadata, remove terra metadata type (#1839)

## [2.4.1] - 2023-06-09
### Changed
- Use @subql/x-sequelize in order support cockroach (#1791)

## [2.4.0] - 2023-05-30
### Added
- Composite indexes for entities (#1759)
- Expose base64 functions (#1761)

## [2.3.0] - 2023-05-24
### Added
- Base58 util functions (#1750)

## [2.2.0] - 2023-05-19
### Changed
- Update polkadot api to 10.7.1 (#1736)

## [2.1.0] - 2023-05-10
### Changed
- Expose all `@polkadot/utils` and `@polkadot/utils-crypto` through utils (#1653)

## [2.0.0] - 2023-04-20
### Changed
- Major release 2.0.0, align with other package versions

## [1.5.0] - 2023-04-14
### Added
- Added option to @jsonField to disable GIN index (#1613)

## [1.4.2] - 2023-03-29
### Changed
- update polkadot api to 10.1.4 (#1580)

## [1.4.1] - 2023-02-21
### Changed
- Update sequlize to 6.28.0 (#1521)

## [1.4.0] - 2023-01-23
### Changed
- Update metadata type with `startHeight` (#1473)
- Update Polkadot api to 9.11.1 (#1483)

## [1.3.1] - 2022-11-30
### Fixed
- Support postgres identifier restrictions (#1438)

## [1.3.0] - 2022-11-23
### Changed
- Support for multi-chain indexing (#1375)

## [1.2.0] - 2022-08-11
### Changed
- Update `sequelize` to 6.23.0. (#1311)

## [1.1.0] - 2022-08-11
### Changed
- Update `@polkadot/util` to v10 (#1230)

## [1.0.1] - 2022-07-05
### Fixed
- Tidy up dependency, move `ipfs-http-client` to common packages (#1160)

## [1.0.0] - 2022-05-11
### Changed
- Major release

## [0.1.0] - 2022-05-06
### Changed
- Update polkadot/api to 9

[Unreleased]: https://github.com/subquery/subql/compare/utils/2.14.0...HEAD
[2.14.0]: https://github.com/subquery/subql/compare/utils/2.13.1...utils/2.14.0
[2.13.1]: https://github.com/subquery/subql/compare/utils/2.13.0...utils/2.13.1
[2.13.0]: https://github.com/subquery/subql/compare/utils/2.12.1...utils/2.13.0
[2.12.1]: https://github.com/subquery/subql/compare/utils/2.12.0...utils/2.12.1
[2.12.0]: https://github.com/subquery/subql/compare/utils/2.11.0...utils/2.12.0
[2.11.0]: https://github.com/subquery/subql/compare/utils/2.10.0...utils/2.11.0
[2.10.0]: https://github.com/subquery/subql/compare/utils/2.9.2...utils/2.10.0
[2.9.2]: https://github.com/subquery/subql/compare/utils/2.9.1...utils/2.9.2
[2.9.1]: https://github.com/subquery/subql/compare/utils/2.9.0...utils/2.9.1
[2.9.0]: https://github.com/subquery/subql/compare/utils/2.8.0...utils/2.9.0
[2.8.0]: https://github.com/subquery/subql/compare/utils/2.7.1...utils/2.8.0
[2.7.1]: https://github.com/subquery/subql/compare/utils/2.7.0...utils/2.7.1
[2.7.0]: https://github.com/subquery/subql/compare/utils/2.6.2...utils/2.7.0
[2.6.2]: https://github.com/subquery/subql/compare/utils/2.6.1...utils/2.6.2
[2.6.1]: https://github.com/subquery/subql/compare/utils/2.6.0...utils/2.6.1
[2.6.0]: https://github.com/subquery/subql/compare/utils/2.5.0...utils/2.6.0
[2.5.0]: https://github.com/subquery/subql/compare/utils/2.4.4...utils/2.5.0
[2.4.4]: https://github.com/subquery/subql/compare/v2.4.3...v2.4.4
[2.4.3]: https://github.com/subquery/subql/compare/v2.4.2...v2.4.3
[2.4.2]: https://github.com/subquery/subql/compare/utils/2.4.1...utils/2.4.2
[2.4.1]: https://github.com/subquery/subql/compare/utils/2.4.0...utils/2.4.1
[2.4.0]: https://github.com/subquery/subql/compare/utils/2.3.0...utils/2.4.0
[2.3.0]: https://github.com/subquery/subql/compare/utils/2.2.0...utils/2.3.0
[2.2.0]: https://github.com/subquery/subql/compare/utils/2.1.0...utils/2.2.0
[2.1.0]: https://github.com/subquery/subql/compare/utils/2.0.0...utils/2.1.0
[2.0.0]: https://github.com/subquery/subql/compare/utils/1.5.0...utils/2.0.0
[1.5.0]: https://github.com/subquery/subql/compare/utils/1.4.2...utils/1.5.0
[1.4.2]: https://github.com/subquery/subql/compare/utils/1.4.1...utils/1.4.2
[1.4.1]: https://github.com/subquery/subql/compare/utils/1.4.0...utils/1.4.1
[1.4.0]: https://github.com/subquery/subql/compare/utils/1.3.1...utils/1.4.0
[1.3.1]: https://github.com/subquery/subql/compare/utils/1.3.0...utils/1.3.1
[1.3.0]: https://github.com/subquery/subql/compare/utils/1.2.0...utils/1.3.0
[1.2.0]: https://github.com/subquery/subql/compare/utils/1.1.0...utils/1.2.0
[1.1.0]: https://github.com/subquery/subql/compare/utils/1.0.1...utils/1.1.0
[1.0.1]: https://github.com/subquery/subql/compare/utils/1.0.0...utils/1.0.1
[1.0.0]: https://github.com/subquery/subql/compare/utils/0.1.0...utils/1.0.0
[0.1.0]: https://github.com/subquery/subql/tags/0.1.0
