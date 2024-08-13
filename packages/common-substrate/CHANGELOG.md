# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


## [4.3.0] - 2024-08-05
### Changed
- Update dependencies (#2518)

## [4.2.0] - 2024-08-01
### Added
- Updated `@subql\common` with support for endpoint specific configs (#2511)

## [4.1.1] - 2024-07-25
### Changed
- Bump version with `@subql/common`
- input type updated in `isRuntimeDs` (#2496)

## [4.1.0] - 2024-07-11
### Removed
- Unused functions (#2484)

### Changed
- Bump with `subql/common`

## [4.0.1] - 2024-07-09
### Changed
- Changes to ts build settings (#2475)

## [4.0.0] - 2024-07-01
### Added
- Enable ts strict setting
- Breaking Change: Add alias `parseProjectManifest`, also follow type of `INetworkCommonModule` (#2462)

## [3.8.1] - 2024-06-21
### Fixed
- Fix `EventFilter` incorrectly extend `BlockFilter`, lead dictionary error (#2463)

## [3.8.0] - 2024-06-05
### Changed
- Bump with common

## [3.7.0] - 2024-05-22
### Changed
- Bump with common

## [3.6.0] - 2024-05-08
### Changed
- Bump with types, update dependencies

## [3.5.0] - 2024-04-24
### Changed
- Update dependencies

## [3.4.0] - 2024-03-28
### Changed
- version bump with `@subql/common` 3.5.0

## [3.3.2] - 2024-02-23
### Changed
- version bump with `@subql/common`

## [3.3.1] - 2024-02-07
### Changed
- Update `@subql/common`

## [3.2.1] - 2023-12-14
### Changed
- Update @subql/common

## [3.2.0] - 2023-10-31
### Changed
- Update `@subql/common` with support for endBlock feature

## [3.1.2] - 2023-10-18
### Changed
- Version bump with `common` 3.1.3

## [3.1.1] - 2023-10-03
### Changed
- Version bump with `types-core` 0.1.1

## [3.1.0] - 2023-10-02
### Changed
- Update with `types-core` 0.1.0 (#2056)

## [3.0.1] - 2023-09-28
### Changed
- move block filters to common (#1969)

### Added
- Parent option to manifest (#1797)

## [2.4.0] - 2023-08-16
### Added
- `isSigned` filter to call handler (#1940)

## [2.3.0] - 2023-08-10
### Changed
- Bump version with `common`;

## [2.2.1] - 2023-07-31
### Fixed
- Update license (#1891)

## [2.2.0] - 2023-06-26
### Changed
- Update common dependency

## [2.1.1] - 2023-05-11
### Changed
- Move validate function to common (#1683)

## [2.1.0] - 2023-05-10
### Added
- Ability to specify node runner options (#1652)

### Changed
- Remove support for manifest versions < 1.0.0 (#1659)

## [2.0.0] - 2023-04-20
### Changed
- Major release 2.0.0, align with other package versions

## [1.5.0] - 2023-03-30
### Changed
- Changed in models to support Multiple endpoints (#1551)

## [1.4.0] - 2022-12-06
### Added
- Support for `bypassBlocks` (#1435)

## [1.3.0] - 2022-10-27
### Added
- Timestamp filter to block handlers (#1310)

## [1.2.1] - 2022-10-06
### Changed
- Update IPFS endpoints. (#1337)

## [1.2.0] - 2022-07-27
### Changed
- Apply latest runner version validation rule, now `dev` and `latest` are not supported.

## [1.1.1] - 2022-07-05
### Changed
- Bump with `@subql/common`

## [1.1.0] - 2022-05-31
### Changed
- Remove `contract-processors` and types improvements (#1012)

## [1.0.0] - 2022-05-11
### Changed
- Major release

## [0.5.0] - 2022-05-11
### Added
- Add test for project with ds processor assets (#1000)
- Add method to check templates is Substrate ds (#1001)

## [0.4.0] - 2022-05-02
### Added
- Add utils package (#928)

## [0.3.1] - 2022-04-27
### Changed
- Add missing vm2 dependency (#919)

## [0.3.0] - 2022-04-06
### Added
- Add manifest 1.0.0 (#845)

### Fixed
- Fix validation for genesisHash or chainId with empty string (#883)

## [0.2.0] - 2022-04-04
### Changed
- Update to use `vm2`(#869)

## [0.1.0] - 2022-03-01
### Added
- init commit

[Unreleased]: https://github.com/subquery/subql/compare/common-substrate/4.3.0...HEAD
[4.3.0]: https://github.com/subquery/subql/compare/common-substrate/4.2.0...common-substrate/4.3.0
[4.2.0]: https://github.com/subquery/subql/compare/common-substrate/4.1.1...common-substrate/4.2.0
[4.1.1]: https://github.com/subquery/subql/compare/common-substrate/4.1.0...common-substrate/4.1.1
[4.1.0]: https://github.com/subquery/subql/compare/common-substrate/4.0.1...common-substrate/4.1.0
[4.0.1]: https://github.com/subquery/subql/compare/common-substrate/4.0.0...common-substrate/4.0.1
[4.0.0]: https://github.com/subquery/subql/compare/common-substrate/3.8.1...common-substrate/4.0.0
[3.8.1]: https://github.com/subquery/subql/compare/common-substrate/3.8.0...common-substrate/3.8.1
[3.8.0]: https://github.com/subquery/subql/compare/common-substrate/3.7.0...common-substrate/3.8.0
[3.7.0]: https://github.com/subquery/subql/compare/common-substrate/3.6.0...common-substrate/3.7.0
[3.6.0]: https://github.com/subquery/subql/compare/common-substrate/3.5.0...common-substrate/3.6.0
[3.5.0]: https://github.com/subquery/subql/compare/common-substrate/3.4.0...common-substrate/3.5.0
[3.4.0]: https://github.com/subquery/subql/compare/common-substrate/3.3.2...common-substrate/3.4.0
[3.3.2]: https://github.com/subquery/subql/compare/common-substrate/3.3.1...common-substrate/3.3.2
[3.3.1]: https://github.com/subquery/subql/compare/common-substrate/3.2.1...common-substrate/3.3.1
[3.2.1]: https://github.com/subquery/subql/compare/common-substrate/3.2.0...common-substrate/3.2.1
[3.2.0]: https://github.com/subquery/subql/compare/common-substrate/3.1.2...common-substrate/3.2.0
[3.1.2]: https://github.com/subquery/subql/compare/common-substrate/3.1.1...common-substrate/3.1.2
[3.1.1]: https://github.com/subquery/subql/compare/common-substrate/3.1.0...common-substrate/3.1.1
[3.1.0]: https://github.com/subquery/subql/compare/common-substrate/3.0.1...common-substrate/3.1.0
[3.0.1]: https://github.com/subquery/subql/compare/common-substrate/2.4.0...common-substrate/3.0.1
[2.4.0]: https://github.com/subquery/subql/compare/common-substrate/2.3.0...common-substrate/2.4.0
[2.3.0]: https://github.com/subquery/subql/compare/common-substrate/2.2.1...common-substrate/2.3.0
[2.2.1]: https://github.com/subquery/subql/compare/common-substrate/2.2.0...common-substrate/2.2.1
[2.2.0]: https://github.com/subquery/subql/compare/common-substrate/2.1.1...common-substrate/2.2.0
[2.1.1]: https://github.com/subquery/subql/compare/common-substrate/2.1.0...common-substrate/2.1.1
[2.1.0]: https://github.com/subquery/subql/compare/common-substrate/2.0.0...common-substrate/2.1.0
[2.0.0]: https://github.com/subquery/subql/compare/common-substrate/1.5.0...common-substrate/2.0.0
[1.5.0]: https://github.com/subquery/subql/compare/common-substrate/1.4.0...common-substrate/1.5.0
[1.4.0]: https://github.com/subquery/subql/compare/common-substrate/1.3.0...common-substrate/1.4.0
[1.3.0]: https://github.com/subquery/subql/compare/common-substrate/1.2.1...common-substrate/1.3.0
[1.2.1]: https://github.com/subquery/subql/compare/common-substrate/1.2.0...common-substrate/1.2.1
[1.2.0]: https://github.com/subquery/subql/compare/common-substrate/1.1.1...common-substrate/1.2.0
[1.1.1]: https://github.com/subquery/subql/compare/common-substrate/1.1.0...common-substrate/1.1.1
[1.1.0]: https://github.com/subquery/subql/compare/common-substrate/1.0.0...common-substrate/1.1.0
[1.0.0]: https://github.com/subquery/subql/compare/common-substrate/0.5.0...common-substrate/1.0.0
[0.5.0]: https://github.com/subquery/subql/compare/common-substrate/0.4.0...common-substrate/0.5.0
[0.4.0]: https://github.com/subquery/subql/compare/common-substrate/0.3.1...common-substrate/0.4.0
[0.3.1]: https://github.com/subquery/subql/compare/common-substrate/0.3.0...common-substrate/0.3.1
[0.3.0]: https://github.com/subquery/subql/compare/common-substrate/0.2.0...common-substrate/0.3.0
[0.2.0]: https://github.com/subquery/subql/compare/common-substrate/0.1.0...common-substrate/0.2.0
[0.1.0]: https://github.com/subquery/subql/tags/common-substrate/0.1.0
