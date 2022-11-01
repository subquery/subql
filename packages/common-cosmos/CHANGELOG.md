# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]

## [0.2.0] - 2022-11-02
### Added
- `timestamp` filter to block handler. (#76)

## [0.1.1] - 2022-10-06
### Updated
- `@subql/common` dependency updated.

## [0.1.0] - 2022-09-27

### Added
- `attributes` filter to event handlers. (#56)
- Filter for `includeFailedTx` on Transaction and Message handlers. (#53)

## [0.0.7] - 2022-07-28
### Added
- Add block modulo filter on cosmos blockHandler. E.g. if modulo: 50, the block handler will run on every 50 blocks. (#43)

## [0.0.6] - 2022-06-21
### Fixed
- Fix chainTypes not being in deployments

## [0.0.5] - 2022-06-15
First release

[Unreleased]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.0.7...HEAD
[0.0.7]: https://github.com/subquery/subql-cosmos/compare/types/0.0.6...common-cosmos/0.0.7
[0.0.6]: https://github.com/subquery/subql-cosmos/compare/types/0.0.5...common-cosmos/0.0.6

