# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.3.0] - 2024-07-11
### Changed
- Bump with `@subql/common` (#2487)

## [4.2.0] - 2024-07-10
### Changed
- Enable ts strict mode (#321)
- Update `@subql/common` dependency (#326)

## [4.1.0] - 2024-07-03
### Changed
- Moved cli method `getAbiInterface` to match with `EthereumNetworkModule` (#323)

## [4.0.0] - 2024-07-03
### Added
- Add alias `parseProjectManifest`, also follow type of `INetworkCommonModule` (#318)

## [3.10.0] - 2024-06-18
### Changed
- Update `@subql/common` dependency

## [3.9.0] - 2024-06-12
### Changed
- Deprecated flare SDK (#2428)

## [3.8.3] - 2024-06-11
### Fixed
- Fix `generateAbis` when datasource without assets

## [3.8.2] - 2024-06-10
### Fixed
- Abi validatation when DS doesn't specify abi option (#307)

## [3.8.1] - 2024-06-07
### Added
- Improve ABI validation

## [3.7.0] - 2024-06-05
### Changed
- Add default value in model class to follow ES2022 rule

## [3.6.1] - 2024-05-27
### Changed
- Update ejs dependency (#287)

## [3.6.0] - 2024-04-30
### Changed
- Update dependencies and apply changes to match

## [3.5.0] - 2024-04-03
### Changed
- version bump with `@subql/common` 3.5.0

## [3.4.1] - 2024-02-23
### Changed
- version bump with `@subql/common`

## [3.4.0] - 2024-02-07
### Changed
- Update `@subql/common`

## [3.3.0] - 2024-02-02
### Added
- Transaction filter function field can now be null (#243)

### Fixed
- Codegen not matching typechain types with complex arguments (#244)

## [3.2.0] - 2024-01-08
### Added
- Support for Zilliqa addresses (#231)

## [3.1.2] - 2023-12-22
### Fixed
- Codegen when assets are either an object or map (#227)

## [3.1.1] - 2023-12-20
### Fixed
- Correct asset type to map, also made update in codegen controller (#223)

### Changed
- Update @subql/common

## [3.1.0] - 2023-11-01
### Added
- Update `@subql/common` and relevant changes to support endBlock feature (#195)

## [3.0.6] - 2023-10-25
### Changed
- Update @subql/common

## [3.0.5] - 2023-10-20
### Changed
- Version bump with `type-ethereum` 3.1.0

## [3.0.4] - 2023-10-18
### Changed
- Version bump with `common` 3.1.3

## [3.0.3] - 2023-10-12
### Changed
- Version bump with `@subql/common` 3.1.2

## [3.0.2] - 2023-10-05
### Changed
- Version bump with `@subql/types-ethereum` 3.0.2

## [3.0.1] - 2023-10-04
### Changed
- Version bump with `@subql/common` 3.1.1

## [3.0.0] - 2023-10-03
### Fixed
- Missing imports for multi abi `codegen` (#169)

### Added
- Parent field to manifest for project upgrades (#148)
- Light Log types to codegen (#170)

### Changed
- Update model with `types-core`

## [2.3.0] - 2023-09-12
### Changed
- Migrated abi-codegen from `@subql/cli` to `common-ethereum` (#158)

## [2.2.5] - 2023-09-04
### Fixed
- lock to `@subql/common` 2.6.0, in order to fix unknown reader issue. (#152)

## [2.2.4] - 2023-09-04
### Fixed
- Previous failed release

## [2.2.3] - 2023-09-01
### Fixed
- Sync with common `@subql/common` (#141)

## [2.2.2] - 2023-08-14
### Fixed
- Sync with common `@subql/common` (#141)

## [2.2.1] - 2023-07-31
### Fixed
- Update license (#137)
- Sync with common `@subql/common`  fix iPFS repeat cat same cid

## [2.2.0] - 2023-06-27
### Changed
- Update `@subql/common` dependency (#118)

## [2.1.3] - 2023-06-15
### Fixed
- Fix failing tests

## [2.1.2] - 2023-06-13
### Changed
- Update common package dependencies (#101)

## [2.1.1] - 2023-06-01
### Changed
- Update common package (#94)

## [2.1.0] - 2023-05-01
### Removed
- Support for manifest versions < 1.0.0
- Use more code from common package
- Update common package

## [2.0.0] - 2023-05-01
### Changed
- Sync with main SDK for 2.0 release

## [1.0.0] - 2023-04-03
### Changed
- Release

## [0.2.1] - 2022-11-18
### Changed
- Re-release 0.2.0

## [0.2.0] - 2022-11-17
### Changed
- Sync with main sdk (#14)

## [0.1.0] - 2022-10-31
[Unreleased]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/4.3.0...HEAD
[4.3.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/4.2.0...common-ethereum/4.3.0
[4.2.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/4.1.0...common-ethereum/4.2.0
[4.1.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/4.0.0...common-ethereum/4.1.0
[4.0.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.10.0...common-ethereum/4.0.0
[3.10.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.9.0...common-ethereum/3.10.0
[3.9.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.8.3...common-ethereum/3.9.0
[3.8.3]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.8.2...common-ethereum/3.8.3
[3.8.2]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.8.1...common-ethereum/3.8.2
[3.8.1]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.7.0...common-ethereum/3.8.1
[3.7.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.6.1...common-ethereum/3.7.0
[3.6.1]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.6.0...common-ethereum/3.6.1
[3.6.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.5.0...common-ethereum/3.6.0
[3.5.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.4.1...common-ethereum/3.5.0
[3.4.1]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.4.0...common-ethereum/3.4.1
[3.4.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.3.0...common-ethereum/3.4.0
[3.3.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.2.0...common-ethereum/3.3.0
[3.2.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.1.2...common-ethereum/3.2.0
[3.1.2]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.1.1...common-ethereum/3.1.2
[3.1.1]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.1.0...common-ethereum/3.1.1
[3.1.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.0.6...common-ethereum/3.1.0
[3.0.6]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.0.5...common-ethereum/3.0.6
[3.0.5]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.0.4...common-ethereum/3.0.5
[3.0.4]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.0.3...common-ethereum/3.0.4
[3.0.3]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.0.2...common-ethereum/3.0.3
[3.0.2]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.0.1...common-ethereum/3.0.2
[3.0.1]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/3.0.0...common-ethereum/3.0.1
[3.0.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.3.0...common-ethereum/3.0.0
[2.3.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.2.5...common-ethereum/2.3.0
[2.2.5]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.2.4...common-ethereum/2.2.5
[2.2.4]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.2.3...common-ethereum/2.2.4
[2.2.3]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.2.2...common-ethereum/2.2.3
[2.2.2]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.2.1...common-ethereum/2.2.2
[2.2.1]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.2.0...common-ethereum/2.2.1
[2.2.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.1.3...common-ethereum/2.2.0
[2.1.3]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.1.2...common-ethereum/2.1.3
[2.1.2]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.1.1...common-ethereum/2.1.2
[2.1.1]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.1.0...common-ethereum/2.1.1
[2.1.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/2.0.0...common-ethereum/2.1.0
[2.0.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/1.0.0...common-ethereum/2.0.0
[1.0.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/0.2.1...common-ethereum/1.0.0
[0.2.1]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/0.2.0...common-ethereum/0.2.1
[0.2.0]: https://github.com/subquery/subql-ethereum/compare/common-ethereum/0.1.0...common-ethereum/0.2.0
[0.1.0]: https://github.com/subquery/subql-ethereum/tags/common-ethereum/0.1.0
