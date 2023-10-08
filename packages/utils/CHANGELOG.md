# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Option to set debug level for child loggers

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

[Unreleased]: https://github.com/subquery/subql/compare/v2.4.3...HEAD
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
