# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2021-04-20
### Fixed
- We now support injecting a custom logger into your project that can accept different logging levels (#248)
    - Read more about it in our [updated documentation](https://doc.subquery.network/create/introduction.html#logging)

### Added
- Support network filter for dataSources (#247)
- Support @index in schema.graphql (#271)
- Support json type in schema.graphql (#275)

## [0.7.0] - 2021-03-11
### Added
- support type Boolean in graphql schema (#216)
- refactor to build relationship of entities from grahql schema (#212)
- refactor logger to @subql/common (#220)

## [0.6.1] - 2021-02-15
### Changed
- bump dependencies (#148)

## 0.6.0 - 2021-01-27
### Fixed
- pin class-transfermer to 0.3.1 (#116)

## [0.5.0] - 2021-01-25
### Added
- support specVersion filter and success filter (#106)
- support other custom types option that @polkadot/api has (#107)

## [0.4.0] - 2021-01-12
### Changed
- [BREAKING] project manifest spec updated to support custom types (#65)

## [0.3.0] - 2021-01-06
### Added
- support callHandler and eventHandler (#47)

## 0.2.0 - 2020-12-22
### Added
- init commit

[Unreleased]: https://github.com/subquery/subql/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/subquery/subql/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/subquery/subql/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/OnFinality-io/subql/compare/v0.6.0...v0.6.1
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/OnFinality-io/subql/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.3.0
