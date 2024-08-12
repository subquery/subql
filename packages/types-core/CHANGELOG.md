# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2024-08-12
### Fixed
- DS Processor types not being able to distinguish input and filter types (#2522)

## [1.1.0] - 2024-08-05
### Changed
- Update dependencies (#2518)

## [1.0.0] - 2024-08-01
### Added
- New endpoint type to allow specifying endpoint config (#2511)

## [0.10.0] - 2024-07-11
### Changed
- Make assets optional on `BaseAssetsDataSource` (#2484)

## [0.9.1] - 2024-07-09
### Changed
- Changes to ts build settings (#2475)

## [0.9.0] - 2024-07-01
### Added
- Add generic network module types (#2462)

## [0.8.0] - 2024-06-21
### Changed
- Reader interface not returning undefined

## [0.7.0] - 2024-04-24
### Added
- GetOptions type with support for ordering store methods (#2325)
- Generic ds processor types from types (#2357)

## [0.6.0] - 2024-03-28
### Changed
- Dictionary type changed (#2257)

## [0.5.0] - 2024-02-07
### Added
- Update `ParentProject` to use `untilBlock` as and alias for `block` (#2235)

## [0.4.0] - 2023-11-27
### Changed
- Split out `BaseAssetsDataSource` interface from `BaseCustomDataSource` (#2182)

## [0.3.0] - 2023-10-31
### Added
- New `endBlock` option on datasources (#2064)

## [0.2.0] - 2023-10-20
### Added
- Add cache to injected globals (#2110)

### Changed
- Update `ProjectManifestV1_0_0` with generic networkConfig (#2061)

## [0.1.0] - 2023-10-02
### Changed
- Update `BaseDataSource` and `BaseCustomDataSource` with JSDoc (#2056)

## [0.0.1] - 2023-09-29
### Added
- Initial release of new package containing types common to all chains

[Unreleased]: https://github.com/subquery/subql/compare/types-core/1.1.1...HEAD
[1.1.1]: https://github.com/subquery/subql/compare/types-core/1.1.0...types-core/1.1.1
[1.1.0]: https://github.com/subquery/subql/compare/types-core/1.0.0...types-core/1.1.0
[1.0.0]: https://github.com/subquery/subql/compare/types-core/0.10.0...types-core/1.0.0
[0.10.0]: https://github.com/subquery/subql/compare/types-core/0.9.1...types-core/0.10.0
[0.9.1]: https://github.com/subquery/subql/compare/types-core/0.9.0...types-core/0.9.1
[0.9.0]: https://github.com/subquery/subql/compare/types-core/0.8.0...types-core/0.9.0
[0.8.0]: https://github.com/subquery/subql/compare/types-core/0.7.0...types-core/0.8.0
[0.7.0]: https://github.com/subquery/subql/compare/types-core/0.6.0...types-core/0.7.0
[0.6.0]: https://github.com/subquery/subql/compare/types-core/0.5.0...types-core/0.6.0
[0.5.0]: https://github.com/subquery/subql/compare/types-core/0.4.0...types-core/0.5.0
[0.4.0]: https://github.com/subquery/subql/compare/types-core/0.3.0...types-core/0.4.0
[0.3.0]: https://github.com/subquery/subql/compare/types-core/0.2.0...types-core/0.3.0
[0.2.0]: https://github.com/subquery/subql/compare/types-core/0.1.0...types-core/0.2.0
[0.1.0]: https://github.com/subquery/subql/compare/types-core/0.0.1...types-core/0.1.0
[0.0.1]: https://github.com/subquery/subql/tag/types-core/0.0.1
