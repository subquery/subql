# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]

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

[Unreleased]: https://github.com/subquery/subql/compare/v0.4.3...HEAD
[0.4.3]: https://github.com/subquery/subql/compare/query/0.4.2...query/0.4.3
[0.4.2]: https://github.com/subquery/subql/compare/query/0.4.1...query/0.4.2
[0.4.1]: https://github.com/subquery/subql/compare/query/0.4.0...query/0.4.1
[0.4.0]: https://github.com/subquery/subql/compare/query/0.3.0...query/0.4.0
