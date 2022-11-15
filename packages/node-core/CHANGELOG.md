# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd


## [Unreleased]

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
