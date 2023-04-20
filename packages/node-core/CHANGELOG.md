# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd


## [Unreleased]


## [1.11.3] - 2023-04-17
### Fixed
- Improve log, update progress string (#1612)

## [1.11.2] - 2023-04-05
### Fixed
- Compute block size one property at a time to prevent RangeError
- Upgrade @subql/apollo-link version

## [1.11.1] - 2023-03-30
### Changed
- Change to support multiple endpoints (#1551)
### Fix
- Fix previous release 1.11.0 failed

## [1.11.0] - 2023-03-29
### Added
- Add SmartBatchService and BlockSizeBuffer (#1506)
- Handle bigint in json.stringify (#1562)
- Generate sourcemap for projects (#1569)
- Update polkadot api to 10.1.4 (#1580)
### Fixed
- Fix enum under schema not being escaped (#1555)
- Remove blocking in process queueing (#1572)
### Changed
- Use `performance.now` instead of date for profiler. (#1549)
- Rename `--sponsored-dictionary` to `--dictionary-resolver` (#1559)

## [1.10.0] - 2023-03-06
### Fixed
- fix issue store getByField limit could potentially excess config limit (#1529)
### Changed
- Move enum under schema (#1527)
- Deprecate exclude constraint (#1543)

## [1.9.0] - 2023-02-21
### Added
- add blockTime to NodeConfig (#1501)
### Changed
- Support array type in dictionary queries (#1510)

## [1.8.0] - 2023-01-23
### Added
- Add validation of dictionary with start height (#1473)
- `Store` add count for entity (#1480)
### Fixed
- Fix custom metadata keys not being applied (#1496)

## [1.7.1] - 2022-12-22
### Fixed
- Fix trigger function name too long (#1469)

## [1.7.0] - 2022-12-19
### Fixed
- Workers: Fix SequelizeDatabaseError - tuple concurrently updated (#1458)
- Handle `bulkUpdate` when fields are undefined with historical indexing (#1463)
### Added
- Add start height to project metadata (#1456)

## [1.6.0] - 2022-12-06
### Added
- Support for `bypassBlocks` (#1435)

## [1.5.1] - 2022-11-30
### Fixed
- Fixed enum name (#1441)

## [1.5.0] - 2022-11-23
### Added
- Dictionary auth link integration (#1411)
- Support multi-chain indexing (#1375)
### Changed
- Move enum name generation method to node-core (#1427)

## [1.4.1] - 2022-11-15
### Fixed
- Hot fix for hot schema reload (#1404)

## [1.4.0] - 2022-11-15
### Added
- Support for hot schema reload. (#1401)
- Support for distinct query plugin. (#1274)

## [1.3.3] - 2022-11-09
### Added
- Added retry method for handle fetch errors (#1386)

## [1.3.2] - 2022-11-08
### Fixed
- Fix missing sequelize sync (#1389)

## [1.3.1] - 2022-11-08
### Fixed
- Remove sequelize alter table (#1387)

## [1.3.0] - 2022-11-07
### Fixed
- Improve dictionary query by filter with data sources start block. (#1371)

## [1.2.0] - 2022-10-28

### Added
- Support for unfinalized blocks. (#1308)

## [1.1.0] - 2022-10-27

### Changed
- Update to `@polkadot/api@9.4.2`/ (#1356)
- Backport dictionary service features from Algorand. (#1346)

## [1.0.1] - 2022-10-11
### Added
- Common code from sandbox and dictionary. (#1345)

## [1.0.0] - 2022-10-10
### Removed
- `Subqueries` database table. (#1340)

## [0.1.3] - 2022-10-06
### Changed
- Update IPFS endpoints. (#1337)
### Fixed
- Benchmark info not being logged. (#1138)

## [0.1.2] - 2022-09-27
### Changes
- Moved `yargs` file from `node-core` to `node`. (#1281)
- Update `sequelize`. (#1311)

## [0.1.1] - 2022-08-26
### Fixed
- Imports not being relative (#1268)

## [0.1.0] - 2022-08-26

- Move blockchain agnostic code from `node` to `node-core` package. (#1222)
