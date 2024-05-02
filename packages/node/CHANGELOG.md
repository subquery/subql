# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.11.0] - 2024-05-02
### Changed
- Update dependencies and apply changes to match (#62)

### Removed
- Unused deps and deprecated type (#63)

### Fixed
- Block timestamp filter not working (#64)

## [3.10.1] - 2024-04-11
### Fixed
- Fixed failed previous release

## [3.10.0] - 2024-04-10
### Changed
- Updated with node-core. Now dictionary supports multiple endpoints, indexer will fetch and switch dictionaries based on available blocks

### Fixed
- Updated with node-core ,also fixed:
  - Fix modulo block didn't apply correctly with multiple dataSources
  - Now when `workers` set to 0, it will use block dispatcher instead of throw and exit

## [3.9.1] - 2024-03-14
### Changed
- Update `@subql/node-core` to 4.7.2 with graphql comments escaping fix

## [3.9.0] - 2024-03-06
### Changed
- Update `@subql/node-core` to 7.4.0

## [3.8.1] - 2024-03-01
### Fixed
- Update `@subql/node-core` to fix Poi generation issue with negative integer, also drop subscription triggers and notifiy_functions

## [3.8.0] - 2024-02-23
### Changed
- Update `@subql/node-core` to 7.3.0

### Fixed
- Remove soroban client and use stellar sdk, fix decode issue with `scVal` (#46)

## [3.6.1] - 2024-02-07
### Fixed
- Critical bug introduced in 3.6.0 which broke historical indexing

## [3.6.0] - 2024-01-25
### Changed
- Update @subql/node-core with
  - a performance fix when using modulo filters with other datasources
  - support for CSV exports
  - support for schema migrations

## [3.5.0] - 2024-01-22
### Changed
- update soraban client dependencies.(#41)

### Fixed
- Fixed soraban block could be behind network.(#41)
- Fix event contract id could be undefined

## [3.4.2] - 2023-11-30
### Fixed
- Sync with `node-core` 7.0.2

## [3.4.1] - 2023-11-28
### Fixed
- Fix ipfs deployment templates path failed to resolved, issue was introduced node-core 7.0.0
- Update with node-core to fix network dictionary timeout but not fallback to config dictionary issue

## [3.4.0] - 2023-11-27
### Changed
- Update `@subql/node-core` with minor fixes

## [3.3.2] - 2023-11-16
### Fixed
- Sync with `node-core` 6.4.2, Fix incorrect enqueuedBlocks, dictionaries timing out by updating `@subql/apollo-links` (#36)

## [3.3.1] - 2023-11-13
### Changed
- Updates to match changes in '@subql/node-core' (#34)
  - Dictionary service to use dictionary registry
  - Use yargs from node core

## [3.3.0] - 2023-11-06
### Added
- With `dictionary-query-size` now dictionary can config the query block range

### Fixed
- Sync with node-core 6.3.0 with various fixes

## [3.1.0] - 2023-11-01
### Changed
- Update `@subql/node-core` with fixes and support for endBlock feature (#27)

## [3.0.2] - 2023-10-13
### Changed
- debug has changed from a boolean to a string to allow scoping debug log level (#2077)

### Fixed
- Sync with node-core.
  - Fixed Poi migration performance issue.
  - Fixed AutoQueue timeout issue.
  - Fixed Poi sync could block DB IO and drop connection issue.
  - Issues with using object destructing for store interface and workers.

## [3.0.1] - 2023-10-11
### Fixed
- reduce the number of deepcopies in wrapping a block (#20)

## [3.0.0] - 2023-10-05
### Changed
- Update @subql/node-core and sync with main SDK. (#18)

## [2.12.1] - 2023-09-13
### Changed
- rename `soroban` to `sorobanEndpoint` in network config (#16)

## [2.12.0] - 2023-09-12
[Unreleased]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.11.0...HEAD
[3.11.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.10.1...node-stellar/3.11.0
[3.10.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.10.0...node-stellar/3.10.1
[3.10.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.9.1...node-stellar/3.10.0
[3.9.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.9.0...node-stellar/3.9.1
[3.9.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.8.1...node-stellar/3.9.0
[3.8.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.8.0...node-stellar/3.8.1
[3.8.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.6.1...node-stellar/3.8.0
[3.6.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.6.0...node-stellar/3.6.1
[3.6.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.5.0...node-stellar/3.6.0
[3.5.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.4.2...node-stellar/3.5.0
[3.4.2]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.4.1...node-stellar/3.4.2
[3.4.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.4.0...node-stellar/3.4.1
[3.4.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.3.2...node-stellar/3.4.0
[3.3.2]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.3.1...node-stellar/3.3.2
[3.3.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.3.0...node-stellar/3.3.1
[3.3.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.1.0...node-stellar/3.3.0
[3.1.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.0.2...node-stellar/3.1.0
[3.0.2]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.0.1...node-stellar/3.0.2
[3.0.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.0.0...node-stellar/3.0.1
[3.0.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/2.12.1...node-stellar/3.0.0
[2.12.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/2.12.0...node-stellar/2.12.1
[2.12.0]: https://github.com/subquery/subql-stellar/tag/v2.12.0
