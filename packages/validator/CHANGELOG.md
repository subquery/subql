# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Support validating stellar manifest (#1919)

## [2.1.1] - 2023-07-31
### Fixed
- Update license (#1891)

## [2.1.0] - 2023-06-26
### Removed
- Support for Terra and Avalanche SDKs. Note: Avalanche is still supported through the Ethereum SDK. (#1841)

## [2.0.0] - 2023-04-20
### Changed
- Major release 2.0.0, align with other package versions

## [1.8.1] - 2023-03-07
### Changed
- Updated `suql/common-avalanche` (#1546)

## [1.8.0] - 2023-01-31
### Added
- Support for Near (#1498)

## [1.7.0] - 2022-11-23
### Added
- Add support to validator for flare (#1416)

### Fixed
- Validator missing ipfs chainTypes (#1419)

## [1.6.0] - 2022-10-07
### Added
- Added ethereum to Validator. (#1338)

## [1.5.1] - 2022-10-06
### Changed
- Update IPFS endpoints. (#1337)

## [1.5.0] - 2022.08-26
### Changed
- Use `@subql/node-core` package. (#1222)

## [1.4.1] - 2022-08-11
### Fixed
- Bump version for missing update `subql-common` in previous release.

## [1.4.0] - 2022-08-04
### Added
- Support for Algorand projects (#1228)

## [1.3.0] - 2022-07-27
### Changed
- Update dependencies with `@subql/common`

## [1.2.2] - 2022-07-12
### Fixed
- Fix test (#1174)

## [1.2.1] - 2022-07-05
### Fixed
- Tidy up dependency, move `ipfs-http-client` to common packages (#1160)

## [1.2.0] - 2022-06-22
### Changed
- move out terra pacakges (#1112)

### Added
- validate deployment, validate multi network (#1115)

## [1.1.0] - 2022-05-31
### Changed
- Update import types name (#1012)

## [1.0.0] - 2022-05-11
### Changed
- Major release

## [0.6.0] - 2022-04-06
### Added
- Add validation to support manifest 1.0.0, add rules for runner (#845)

## [0.5.0] - 2022-04-04
### Added
- Add terra project validation (#781)

## [0.4.5] - 2022-02-24
### Changed
- Bump with subql/common release, as `reader` has been updated.

## [0.4.4] - 2022-02-15
### Fixed
- Fix chainTypes validation when load from yaml or json (#804)

## [0.4.3] - 2022-02-09
### Changed
- Move readers from validator to common (#551)
- Include dynamic datasource in manifest v0.2.1 to custom-ds-validation (#773)

## [0.4.2] - 2022-01-13
### Changed
- Version bump with subql/common

## [0.4.1] - 2021-12-16
### Fixed
- Fix chain types checking when load from js (#720)

## [0.4.0] - 2021-11-19
### Added
- Added ipfs-reader and update reader (#486)
- Add validator that runs custom ds processor validation (#596)

### Changed
- Bump deps (#584)
- Move `isCustomDs` to Common (#610)

### Fixed
- Fix validating custom DS if location param is provided (#639)

## [0.3.0] - 2021-10-12
### Added
- Add validation for manifest v0.2.0 (#495)
- Add manifest valitation (#477)

## [0.2.0] - 2021-06-25
### Changed
- Update dependencies (#358)

## [0.1.0] - 2021-03-11
### Added
- init release: support validation of subquery project

[Unreleased]: https://github.com/subquery/subql/compare/v2.1.1...HEAD
[2.1.1]: https://github.com/subquery/subql/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/subquery/subql/compare/validator/2.0.0...validator/2.1.0
[2.0.0]: https://github.com/subquery/subql/compare/validator/1.8.1...validator/2.0.0
[1.8.1]: https://github.com/subquery/subql/compare/validator/1.8.0...validator/1.8.1
[1.8.0]: https://github.com/subquery/subql/compare/validator/1.7.0...validator/1.8.0
[1.7.0]: https://github.com/subquery/subql/compare/validator/1.6.0...validator/1.7.0
[1.6.0]: https://github.com/subquery/subql/compare/validator/1.5.1...validator/1.6.0
[1.5.1]: https://github.com/subquery/subql/compare/validator/1.5.0...validator/1.5.1
[1.5.0]: https://github.com/subquery/subql/compare/validator/1.4.1...validator/1.5.0
[1.4.1]: https://github.com/subquery/subql/compare/validator/1.4.0...validator/1.4.1
[1.4.0]: https://github.com/subquery/subql/compare/validator/1.3.0...validator/1.4.0
[1.3.0]: https://github.com/subquery/subql/compare/validator/1.2.2...validator/1.3.0
[1.2.2]: https://github.com/subquery/subql/compare/validator/1.2.1...validator/1.2.2
[1.2.1]: https://github.com/subquery/subql/compare/validator/1.2.0...validator/1.2.1
[1.2.0]: https://github.com/subquery/subql/compare/validator/1.1.0...validator/1.2.0
[1.1.0]: https://github.com/subquery/subql/compare/validator/1.0.0...validator/1.1.0
[1.0.0]: https://github.com/subquery/subql/compare/validator/0.6.0...validator/1.0.0
[0.6.0]: https://github.com/subquery/subql/compare/validator/0.5.0...validator/0.6.0
[0.5.0]: https://github.com/subquery/subql/compare/validator/0.4.5...validator/0.5.0
[0.4.5]: https://github.com/subquery/subql/compare/validator/0.4.4...validator/0.4.5
[0.4.4]: https://github.com/subquery/subql/compare/validator/0.4.3...validator/0.4.4
[0.4.3]: https://github.com/subquery/subql/compare/validator/0.4.2...validator/0.4.3
[0.4.2]: https://github.com/subquery/subql/compare/validator/0.4.1...validator/0.4.2
[0.4.1]: https://github.com/subquery/subql/compare/validator/0.4.0...validator/0.4.1
[0.4.0]: https://github.com/subquery/subql/compare/validator/0.3.0...validator/0.4.0
[0.3.0]: https://github.com/subquery/subql/compare/validator/0.3.0...validator/0.4.0
[0.2.0]: https://github.com/subquery/subql/compare/validator/0.1.0...validator/0.2.0
[0.1.0]: https://github.com/subquery/subql/tag/validator/0.1.0
