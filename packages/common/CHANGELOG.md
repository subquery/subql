# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]

## [1.1.0] - 2022-05-31
### Fixed
- Fix runner error check with pre-release (#1027)
### Added
- Add constants for Mmr query api (#968)

## [1.0.0] - 2022-05-11
- Major release

## [0.23.0] - 2022-05-11
### Fixed
- Fix toDeployment with ds processor assets (#1000)
### Added
- Add method to get path for manifest and schema, in order improve cli codegen (#1001)

## [0.22.0] - 2022-05-02
### Added
- Add utils package (#928)

## [0.21.2] - 2021-04-27
### Fixed
- Fix deps (#919)

## [0.21.1] - 2021-04-26
### Fixed
- Fix Terra dictionary queries type (#893)

## [0.21.0] - 2021-04-06
### Add
- Add types for manifest 1.0.0 (#845)

## [0.20.0] - 2021-04-04
### Changed
- Update to use `vm2` v3.9.9 (#870)

## [0.19.0] - 2021-03-01
### Changed
- Moved substrate components to `@subql/common-substrate`

## [0.18.0] - 2021-02-24
### Fixed 
- Fix function call from calling itself (#808)
### Changed
- Update readers to support reader project from its manifest file (#800)

## [0.17.0] - 2021-02-09
### Added
- Add manifest v0.2.1 to support dynamic data source
### Changed 
- Move readers from validator to common and use them for loading projects in the node (#511)
### Fixed
- Add missing interfaces to common classes (#782)

## [0.16.0] - 2021-01-13
### Added 
- Add rowCountEstimate to Metadata (#736)
- Add method `findAvailablePort` (#739)

## [0.15.0] - 2021-12-16
### Added 
- Support provide `filePath` and `rotate` option with logger. (#667)
- Add support for loading chaintypes from js (#698)
### Fixed
- Fixed load js file in sandbox (#717)

## [0.14.1] - 2021-11-30
### Fixed
- Remove auto generated enum types for codegen (#680)
- Remove auto generated enum types in entities and relations (#682)

## [0.14.0] - 2021-11-19
### Added
- Add TypeClass, supported types mapping , support float type(#532)
- Refactor dictionary gql queries (#613)
- Process enum in entities (#551)
### Changed
- Moved isCustomDs and isRuntimeDs to here (#610)
- Remove descriptive field in deployment (#637)

## [0.13.0] - 2021-11-03
### Added
- Add `abi` to to project CustomDataSourceBase (#547)
- Add `address` and rule to project CustomDataSourceBase, improve Moonbeam EVM (#593);
- Move `abi` and `address` under `processor.options` (#598)
### Changed
- Bump dependencies (#584)
### Fixed
- Allow dictionary in ProjectManifest v0.2.0 (#578)

## [0.12.0] - 2021-10-26
### Changed
- Move project manifest types to @subql/types because it is now also required by subquery project. (#512)

## [0.11.0] - 2021-10-12
### Added
- Support for new project manifest spec v0.2.0. Which has many improvements including, no longer requiring the package.json file, multiple code entry points, referencing files via other protocols such as IPFS (#495)

## [0.10.1] - 2021-08-27
### Fixed
- Deprecated warnings and remove unused dependency (#448)

## [0.10.0] - 2021-08-20
### Added
- Add Bytes type (#432)

## [0.9.2] - 2021-07-29
### Fixed
- Fix types in entities, also add validation for schema input types. (#406)

## [0.9.1] - 2021-07-26
### Fixed
- Fixed bug that prevented indexes from being added automatically on foreign keys (#371)

## [0.9.0] - 2021-06-25
### Added
- Add metadata type for query and additional rule of dictionary for project validation(#342)
### Changed
- Update dependencies (#358)

## [0.8.3] - 2021-05-04
### Added
-  Indexing is automatically added into JSON field types in database to speed up query performance. Users should not add the `@index` annotation to any `@jsonField` as it will be automatically managed during the codegen process. We implement GIN indexes for JSON fields in our database (#291)

## [0.8.2] - 2021-04-21
### Added
- Enforce index on foreign key field (#285)

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

## [0.6.0] - 2021-01-27
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

## [0.2.0] - 2020-12-22
### Added
- init commit

[Unreleased]: https://github.com/subquery/subql/compare/common/0.17.0...HEAD
[0.17.0]: https://github.com/subquery/subql/compare/common/0.16.0...common/0.17.0
[0.16.0]: https://github.com/subquery/subql/compare/common/0.15.0...common/0.16.0
[0.15.0]: https://github.com/subquery/subql/compare/common/0.14.1...common/0.15.0
[0.14.1]: https://github.com/subquery/subql/compare/common/0.14.0...common/0.14.1
[0.14.0]: https://github.com/subquery/subql/compare/common/0.13.0...common/0.14.0
[0.13.0]: https://github.com/subquery/subql/compare/common/0.12.0...common/0.13.0
[0.8.2]: https://github.com/subquery/subql/compare/v0.8.0...v0.8.2
[0.8.0]: https://github.com/subquery/subql/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/subquery/subql/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/OnFinality-io/subql/compare/v0.6.0...v0.6.1
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/OnFinality-io/subql/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.3.0
