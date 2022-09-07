# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Fix issue with chain id being compared to genesis hash. (#8)

## [1.9.0] - 2022-09-07

### Changed
- Sync with Substrate SDK to include all latest features. See the [Substrate Changelog](https://github.com/subquery/subql-cosmos/blob/main/packages/node/CHANGELOG.md#190---2022-09-02) for more details.
  - Worker threads.
  - POI improvements.
  - Use `@subql/node-core` package.
  - Store improvements like bulk operations and paging results.

### Added
- Support for api keys via url parameters and convert them to headers.

## [0.3.0] - 2022-07-28
### Fixed
- Error logging erro with arguments with bigint values.

### Added
- Support endpoints with paths like `/public`. (#1213)

## [0.2.0] - 2022-06-27
### Added
- Add Eth provider to query contracts and other changes (#1143)

## [0.1.1] - 2022-06-27
### Added
- init commit
