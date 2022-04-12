# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]

## [0.5.1] - 2022-04-13
### Changed
- Renamed `mantlemint` cli flag to `network-mantlemint` and fix overwriting project endpoint (#889)

## [0.5.0] - 2022-04-12
### Added
- Support for mantlemint endpoint (#885)
- Configuring a timeout for terra node requests (#885)
- Keep Terra node connections alive (#886)

## [0.4.0] - 2022-04-06
### Added
- Add support for handle manifest 1.0.0 (#845)
- Support use custom ipfs gateway (#881)

## [0.3.0] - 2022-04-04
### Changed
- Update to use `vm2`(#869)

## [0.2.0] - 2022-03-22
### Added
- Add contract handling for terra (#848)

## [0.1.2] - 2022-03-15
### Fixed
- Fix unable able fetch with small batch size issue (#847)

## [0.1.1] - 2022-03-10
### Fixed
- Fix enum sort order (#844)

## [0.1.0] - 2022-03-01
### Added
- init commit

[Unreleased]: https://github.com/subquery/subql/compare/node-terra/0.2.0...HEAD
[0.2.0]: https://github.com/subquery/subql/compare/node/0.1.1...node/0.2.0
[0.1.2]: https://github.com/subquery/subql/compare/node/0.1.1...node/0.1.2
[0.1.1]: https://github.com/subquery/subql/compare/node/0.1.0...node/0.1.1
