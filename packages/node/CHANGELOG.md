# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
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
[Unreleased]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.0.2...HEAD
[3.0.2]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.0.1...node-stellar/3.0.2
[3.0.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/3.0.0...node-stellar/3.0.1
[3.0.0]: https://github.com/subquery/subql-stellar/compare/node-stellar/2.12.1...node-stellar/3.0.0
[2.12.1]: https://github.com/subquery/subql-stellar/compare/node-stellar/2.12.0...node-stellar/2.12.1
[2.12.0]: https://github.com/subquery/subql-stellar/tag/v2.12.0
