# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]

## [0.12.0] - 2021-12-16
### Added 
- Add `bulkCreate` in `Store` interface (#699)

## [0.11.0] - 2021-11-27
### Changed
- Update patch api type (#638)

## [0.10.1] - 2021-11-19
### Changed
- Update patch api type (#638)

## [0.10.0] - 2021-11-03
### Changed
- Update interface under project for Moonbeam custom datasource processor (#579)
### Added
- Add interface `FunctionPropertyNames` improve types of entity creation (#573)

## [0.9.0] - 2021-10-26
### Changed
- Update Polkadot/api to v6 (#548)
- Move project manifest types to @subql/types because it is now also required by subquery project. (#512)

## [0.8.5] - 2021-10-12
### Changed
- Update Polkadot/api to 6.3.1 (#505)

## [0.8.4] - 2021-09-16
### Changed
- Update Polkadot/api to 5.9.1 (#476)

## [0.8.3] - 2021-09-01
### Changed
- Update Polkadot/api to 5.7.1 (#460)

## [0.8.2] - 2021-08-20
### Changed
- Update Polkadot/api to 5.5.2 (#439)

## [0.8.1] - 2021-08-16
### Changed
- Update Polkadot/api to 5.5.1 (#433)

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

## [0.2.0] - 2020-12-22
### Added
- support block handler

[Unreleased]: https://github.com/subquery/subql/compare/types/0.10.1...HEAD
[0.11.0]: https://github.com/subquery/subql/compare/types/0.10.0...types/0.11.0
[0.10.1]: https://github.com/subquery/subql/compare/types/0.10.0...types/0.10.1
[0.10.0]: https://github.com/subquery/subql/compare/types/0.9.0...types/0.10.0
[0.7.0]: https://github.com/subquery/subql/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/subquery/subql/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/OnFinality-io/subql/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.3.0...v0.5.0
[0.3.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.3.0
