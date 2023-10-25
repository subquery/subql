# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Update @subql/common

## [3.1.0] - 2023-10-20
### Changed
- Version bump with `common` 3.1.3

## [3.0.3] - 2023-10-17
### Changed
- Update type names to be consistent with main SDK (#189)

## [3.0.2] - 2023-10-12
### Changed
- Version bump with `@subql/common` 3.1.2

## [3.0.1] - 2023-10-05
### Changed
- Bump `subql/types-cosmos`

## [3.0.0] - 2023-10-04
### Fixed
- Fixed Missing chainTypes on deployment (#175)

### Changed
- Updated NetworkConfig to use `chaintypes` instead of `chainTypes` (#180)

## [2.5.1] - 2023-09-20
### Changed
- Downgrade `subql/common` due to breaking changes (#176)

## [2.5.0] - 2023-09-04
### Added
- Support for cosmwasm contract abi to ts `codegen` (#168)

## [2.4.1] - 2023-08-24
### Changed
- Updated `telescope` config for codegen optimisation(#166)

## [2.4.0] - 2023-08-24
### Added
- Support protobuf to ts cosmos `codegen` (#160)

## [2.3.1] - 2023-07-31
### Changed
- Update license to GPL-3.0

## [2.3.0] - 2023-06-27
### Changed
- Update @subql/common (#141)

## [2.2.1] - 2023-06-13
### Changed
- Update common package dependencies (#133)

## [2.2.0] - 2023-06-01
### Changed
- Update common package (#128)

## [2.1.0] - 2023-05-17
### Changed
- Sync with main SDK

## [2.0.0] - 2023-05-01
### Changed
- Sync with main SDK for 2.0 release

## [0.2.2] - 2023-02-14
### Changed
- Sync with main sdk (#97)

## [0.2.1] - 2022-12-20
### Added
- Support `bypassBlocks` feature

## [0.2.0] - 2022-11-02
### Added
- `timestamp` filter to block handler. (#76)

## [0.1.1] - 2022-10-06
### Changed
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
[Unreleased]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/3.1.0...HEAD
[3.1.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/3.0.3...common-cosmos/3.1.0
[3.0.3]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/3.0.2...common-cosmos/3.0.3
[3.0.2]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/3.0.1...common-cosmos/3.0.2
[3.0.1]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/3.0.0...common-cosmos/3.0.1
[3.0.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.5.1...common-cosmos/3.0.0
[2.5.1]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.5.0...common-cosmos/2.5.1
[2.5.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.4.1...common-cosmos/2.5.0
[2.4.1]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.4.0...common-cosmos/2.4.1
[2.4.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.3.1...common-cosmos/2.4.0
[2.3.1]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.3.0...common-cosmos/2.3.1
[2.3.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.2.1...common-cosmos/2.3.0
[2.2.1]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.2.0...common-cosmos/2.2.1
[2.2.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.1.0...common-cosmos/2.2.0
[2.1.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/2.0.0...common-cosmos/2.1.0
[2.0.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.2.2...common-cosmos/2.0.0
[0.2.2]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.2.1...common-cosmos/0.2.2
[0.2.1]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.2.0...common-cosmos/0.2.1
[0.2.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.1.1...common-cosmos/0.2.0
[0.1.1]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.1.0...common-cosmos/0.1.1
[0.1.0]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.0.7...common-cosmos/0.1.0
[0.0.7]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.0.6...common-cosmos/0.0.7
[0.0.6]: https://github.com/subquery/subql-cosmos/compare/common-cosmos/0.0.5...common-cosmos/0.0.6
[0.0.5]: https://github.com/subquery/subql-cosmos/tags/common-cosmos/0.0.5
