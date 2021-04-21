# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.12.2] - 2021-04-21
### Added
- Enforce index on foreign key field (#285)

### Fixed
- Improve logs for db sync, catch error and exit (#283)

## [0.12.0] - 2021-04-20
### Fixed
- bump dependencies for logger
- Fix query for double map storage (#269)

### Added
- Support network filter for dataSources (#247)
- Expose events in SubstrateBlock (#256)
- api.findCall and api.findError will use current block's metadata (#251)
- Inject global variable logger in sandbox and depricated console.log in subquery project, use logger instead. (#259)
- Create indexes on the fields with @index and allow querying by indexed field (#271)
- Create jsonb column for fields marked as jsonField in schema.graphql (#275)
- Bump @polkadot/api version to v4.6.2

## [0.11.0] - 2021-03-25
### Fixed
- Fix benchmark output format issues (#235)
- Only warning when user set start block to number smaller than 1. (#239)

### Added
- Support entity relations (#132)
- Refactor api.query...multi(),  api.queryMulti() to use rpc.queryStorageAt() (#244)

## [0.10.2] - 2021-03-11
### Added
- refactor logger to @subql/common (#220)
- Bump polkadot/js version to v4.0.3 which shall fix a chain data decoding issue (#222)

## [0.10.1] - 2021-03-03
### Fixed
- use parent's specVersion to decide if metadata need to be injected (#211)

## [0.10.0] - 2021-03-03
### Added
- performance improvement: reduce injectMetadata call (#206)
- performance improvement: reduce specVersion query for each batch (#207)

## [0.9.2] - 2021-03-03
### Added
- more comprehensive timeout error stack (#198)
- use logger.info() instead of log() for sandbox logging (#197)
- estimate time remaining consider block increases (#199)
- add configurable timeout (#202)
- bump @polkadot/api to 3.11.1 (#203)

## [0.9.1] - 2021-03-03
### Fixed
- revert metrics name changes (#193) 

### Added
- Update subquery starter repo path to new organization (#196)

## [0.9.0] - 2021-02-23
### Added
- Ian improve error logging (#181): support --log-level flag, error stack will be correctly organized
- Add benchmark outputs (#183): will print benchmark stats every 15s
- add meta api and store network info in subqueries table (#191)

### Fixed
- fix memory overflow and timeouts while indexing a large number of events

## [0.8.3] - 2021-02-17
### Fixed
- keep retrying failed block not skipping it (#175)

## [0.8.2] - 2021-02-16
### Fixed
- fix query.system.lastRuntimeUpgrade return null before the first runtime upgrade, use rpc.state.getRuntimeVersion instead (#169)
- after connection reconnected, indexing will now resume (#168)

## [0.8.1] - 2021-02-15
### Fixed
- fix dependencies (#164)

## [0.8.0] - 2021-02-15
### Changed
- bump dependencies
- don't freeze table name (#161)

### Added
- cache metadata if specVersion bumped (#156)
- improve logging, support --output-fmt=json (#158)
- support override network endpoint from --network-endpoint flag (#157)
- add prometheus metrics (#159)

## [0.7.0] - 2021-01-27
### Fixed
- fix crash for events not own by extrinsic (#120)

### Added
- batch fetch blocks (#124)
- wrap all handler executions of same block in a db transaction (#125)
- node add startscript (#128)

## [0.6.0] - 2021-01-25
### Changed
- bump @polkadot/api (#90)
- clean up console output unless start with --debug (#95)
- bump @polkadot/api to v3.6.3 (#109)

### Added
- patch and inject api in sandbox context (#103)
- support specVersion filter and success filter (#106)
- support other custom types option that @polkadot/api has (#107)

## [0.5.0] - 2021-01-15
### Fixed
- Fix BigInt transformation (#79)

### Changed
- escalate sandbox out of IndexerManager (#83)

## [0.4.0] - 2021-01-12
### Added
- allow user to define start block in project (#54)
- add local flag to support create all tables in the default db schema (#59)
- retry when can not establish connection with postgres (#61)
- add priority to find subquery project entry point from package json file (#60)
- support load project from tarball file (#55)

### Fixed
- read db connection strings from env (#63)

### Changed
- [BREAKING] project manifest spec updated to support custom types (#65)

## [0.3.0] - 2021-01-06
### Added
- support callHandler and eventHandler (#47)

## 0.2.0 - 2020-12-22
### Added
- support block handler
- put subquery tables in their own db schema
- use BigInt instead of BN (#27)

### Changed
- bump @polkadot/api to 3.1.1

[Unreleased]: https://github.com/subquery/subql/compare/v0.12.2...HEAD
[0.12.2]: https://github.com/subquery/subql/compare/v0.12.0...v0.12.2
[0.12.0]: https://github.com/subquery/subql/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/subquery/subql/compare/v0.10.2...v0.11.0
[0.10.2]: https://github.com/subquery/subql/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/subquery/subql/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/subquery/subql/compare/v0.9.2...v0.10.0
[0.9.2]: https://github.com/subquery/subql/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/subquery/subql/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/OnFinality-io/subql/compare/v0.8.3...v0.9.0
[0.8.3]: https://github.com/OnFinality-io/subql/compare/v0.8.2...v0.8.3
[0.8.2]: https://github.com/OnFinality-io/subql/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/OnFinality-io/subql/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/OnFinality-io/subql/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/OnFinality-io/subql/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/OnFinality-io/subql/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/OnFinality-io/subql/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.3.0
