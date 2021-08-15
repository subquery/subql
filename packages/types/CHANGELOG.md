# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Update Polkadot/api to 5.5.1

## [0.8.0] - 2021-06-25
### Changed
- Update dependencies (#358)

## [0.7.0] - 2021-04-20
### Fixed
- inject logger module in global(#248)

### Added
- Expose events in SubstrateBlock (#256)
- Injecting logger to sandbox's global (#259)
- Store support querying by indexed field (#271)

## [0.6.1] - 2021-03-11

## [0.6.0] - 2021-01-27
### Fixed
- fix crash for events not own by extrinsic (#120)

## [0.5.0] - 2021-01-25
### Added
- patch and inject api in sandbox context (#103)
- support specVersion filter and success filter (#106)

### Changed
- bump @polkadot/api to v3.6.3 (#109)

## [0.3.0] - 2021-01-06
### Added
- support callHandler and eventHandler (#47)

## 0.2.0 - 2020-12-22
### Added
- support block handler

[Unreleased]: https://github.com/subquery/subql/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/subquery/subql/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/subquery/subql/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/OnFinality-io/subql/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.3.0...v0.5.0
[0.3.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.3.0
