# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.1.1] - 2024-08-14
### Added
- Update polkadot/api library

## [5.1.0] - 2024-08-05
### Removed
- `findAvailablePort` function, it now lives in `@subql/utils` (#2518)

### Changed
- Update dependencies (#2518)

## [5.0.0] - 2024-08-01
### Added
- New type for endpoint to allow specifying endpoint options (#2511)

## [4.1.1] - 2024-07-25
### Changed
- Bump version with `@subql/utils`

## [4.1.0] - 2024-07-11
### Added
- Add `IPFSHTTPClientLite` to replace original `IPFSHTTPClient` in order to reduce dependencies (#2480)

## [4.0.1] - 2024-07-09
### Changed
- Changes to ts build settings (#2475)

## [4.0.0] - 2024-07-01
### Changed
- Breaking Change: Bump version with `@subql/types-core`, apply parseFunction type missing asImpl and its deployment (#2466)

## [3.9.0] - 2024-06-21
### Added
- Enable ts strict model (#2448)
- Reader interface method not returning undefined (#2448)

## [3.8.0] - 2024-06-18
### Changed
- Deprecated flare SDK (#2428)

## [3.7.0] - 2024-06-05
### Changed
- Add default value in model class to follow ES2022 rule

## [3.6.0] - 2024-05-22
### Changed
- Improve error message when project manfiest is invalid (#2408)

## [3.5.1] - 2024-04-24
### Added
- Default .env file names (#2345)

## [3.5.0] - 2024-03-28
### Changed
- Dictionary model changed (#2257)

## [3.4.1] - 2024-02-23
### Changed
- Bump axios from 0.27.0 to 0.28.0 (#2262)

## [3.4.0] - 2024-02-07
### Added
- Update `ParentProject` to use `untilBlock` as and alias for `block` (#2235)

## [3.3.1] - 2023-12-14
### Fixed
- Rollback version of axios to support commonsjs

## [3.3.0] - 2023-10-31
### Added
- New `endBlock` option on datasources (#2064)
- Add Concordium to network family (#2078)

## [3.2.0] - 2023-10-25
### Added
- Multichain support for TypeScript manifests (#2097)

## [3.1.3] - 2023-10-18
### Fixed
- IPFS Reader error handling (#2106)

## [3.1.2] - 2023-10-05
### Changed
- Remove `forbidNonWhitelisted` option from common manifest validation (#2070)

## [3.1.1] - 2023-10-03
### Changed
- Version bump with `types-core` 0.1.1

## [3.1.0] - 2023-10-02
### Changed
- Version bump with `types-core` 0.1.0

## [3.0.1] - 2023-09-28
### Changed
- Re-release of 2.7.0 which was a breaking change

## [2.7.0] - 2023-09-01
### Added
- Added fileReference validator (#1984)
- Add spec for project upgrades (#1797)
- `skipTransactions` node runner option (#1968)

### Changed
- move block filters to common (#1969)

## [2.6.0] - 2023-08-25
### Changed
- Update ipfs-http-api (#1967)

## [2.5.0] - 2023-08-10
### Added
- Add stellar to network family (#1919)
- Support for update availability logs (#1930)

## [2.4.0] - 2023-07-31
### Fixed
- Update license (#1891)
- Fix ipfs repeat cat same cid (#1899

### Added
- Added `forbidNonWhitelisted` to common (#1901)

## [2.3.0] - 2023-06-26
### Removed
- Support for Terra and Avalanche SDKs (#1841)

## [2.2.2] - 2023-06-19
### Fixed
- Fixed test (#1806)

### Added
- Simply multi-chain running (#1746)

## [2.2.1] - 2023-06-09
### Changed
- Use @subql/x-sequelize in order to support cockroach (#1791)

## [2.2.0] - 2023-05-31
### Changed
- Improve incorrect runner message (#1775)

## [2.1.2] - 2023-05-26
### Added
- Add `DEFAULT_PORT` constant (#1752)

## [2.1.1] - 2023-05-11
### Changed
- Move validate function to common (#1683)

## [2.1.0] - 2023-05-10
### Added
- `BaseCustomDataSource` type (#1658)
- Moved `FileType` from `@subql/common-substrate` (#1659)

## [2.0.0] - 2023-04-20
### Changed
- Major release for 2.0.0, align with other package versions

## [1.8.1] - 2023-03-30
### Added
- Add types to support Multiple endpoints (#1551)

### Fixed
- Fix previous release 1.8.0 failed

## [1.8.0] - 2023-03-29
### Changed
- update polkadot api to 10.1.4 (#1580

## [1.7.0] - 2023-02-21
### Added
- Support for database SSL connection (#1513)
- Support for cockroach database (#1521)

## [1.6.0] - 2023-01-31
### Added
- Support for Near (#1498)

## [1.5.0] - 2022-12-06
### Fixed
- Fixed `subql codegen` flags. (#1446)

### Added
- Support for `bypassBlocks`. (#1435)

## [1.4.4] - 2022-11-23
### Added
- Add `flare` to network family constants. (#1416)

## [1.4.3] - 2022-10-07
### Added
- Add `ethereum` to network family constants. (#1378)

## [1.4.2] - 2022-10-06
### Changed
- Update IPFS endpoints. (#1337)

## [1.4.1] - 2022-09-30
### Fixed
- Improve `getSchemaPath` error log. (#1324)

## [1.4.0] - 2022-08-17
### Changed
- Support new templates mono-repo structure. (#1236)

## [1.3.0] - 2022-08-11
### Added
- Add Algorand to constants (#1228)

## [1.2.2] - 2022-07-27
### Fixed
- `latest`, `dev` and `~` are no longer supported runner versions.

## [1.2.1] - 2022-07-05
### Fixed
- Tidy up dependency, move `ipfs-http-client` to common packages (#1160)

## [1.2.0] - 2022-06-22
### Added
- Add method to distinguish network family from project with spec above 1.0.0 (#1115)

## [1.1.0] - 2022-05-31
### Fixed
- Fix runner error check with pre-release (#1027)

### Added
- Add constants for Mmr query api (#968)

## [1.0.0] - 2022-05-11
### Changed
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
### Added
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
- Indexing is automatically added into JSON field types in database to speed up query performance. Users should not add the `@index` annotation to any `@jsonField` as it will be automatically managed during the codegen process. We implement GIN indexes for JSON fields in our database (#291)

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
- \[BREAKING] project manifest spec updated to support custom types (#65)

## [0.3.0] - 2021-01-06
### Added
- support callHandler and eventHandler (#47)

## [0.2.0] - 2020-12-22
### Added
- init commit

[Unreleased]: https://github.com/subquery/subql/compare/common/5.1.1...HEAD
[5.1.1]: https://github.com/subquery/subql/compare/common/5.1.0...common/5.1.1
[5.1.0]: https://github.com/subquery/subql/compare/common/5.0.0...common/5.1.0
[5.0.0]: https://github.com/subquery/subql/compare/common/4.1.1...common/5.0.0
[4.1.1]: https://github.com/subquery/subql/compare/common/4.1.0...common/4.1.1
[4.1.0]: https://github.com/subquery/subql/compare/common/4.0.1...common/4.1.0
[4.0.1]: https://github.com/subquery/subql/compare/common/4.0.0...common/4.0.1
[4.0.0]: https://github.com/subquery/subql/compare/common/3.9.0...common/4.0.0
[3.9.0]: https://github.com/subquery/subql/compare/common/3.8.0...common/3.9.0
[3.8.0]: https://github.com/subquery/subql/compare/common/3.7.0...common/3.8.0
[3.7.0]: https://github.com/subquery/subql/compare/common/3.6.0...common/3.7.0
[3.6.0]: https://github.com/subquery/subql/compare/common/3.5.1...common/3.6.0
[3.5.1]: https://github.com/subquery/subql/compare/common/3.5.0...common/3.5.1
[3.5.0]: https://github.com/subquery/subql/compare/common/3.4.1...common/3.5.0
[3.4.1]: https://github.com/subquery/subql/compare/common/3.4.0...common/3.4.1
[3.4.0]: https://github.com/subquery/subql/compare/common/3.3.1...common/3.4.0
[3.3.1]: https://github.com/subquery/subql/compare/common/3.3.0...common/3.3.1
[3.3.0]: https://github.com/subquery/subql/compare/common/3.2.0...common/3.3.0
[3.2.0]: https://github.com/subquery/subql/compare/common/3.1.3...common/3.2.0
[3.1.3]: https://github.com/subquery/subql/compare/common/3.1.2...common/3.1.3
[3.1.2]: https://github.com/subquery/subql/compare/common/3.1.1...common/3.1.2
[3.1.1]: https://github.com/subquery/subql/compare/common/3.1.0...common/3.1.1
[3.1.0]: https://github.com/subquery/subql/compare/common/3.0.1...common/3.1.0
[3.0.1]: https://github.com/subquery/subql/compare/common/2.7.0...common/3.0.1
[2.7.0]: https://github.com/subquery/subql/compare/common/2.6.0...common/2.7.0
[2.6.0]: https://github.com/subquery/subql/compare/common/2.5.0...common/2.6.0
[2.5.0]: https://github.com/subquery/subql/compare/common/2.4.0...common/2.5.0
[2.4.0]: https://github.com/subquery/subql/compare/common/2.3.0...common/2.4.0
[2.3.0]: https://github.com/subquery/subql/compare/common/2.2.2...common/2.3.0
[2.2.2]: https://github.com/subquery/subql/compare/common/v2.2.1...common/v2.2.2
[2.2.1]: https://github.com/subquery/subql/compare/common/v2.2.0...common/v2.2.1
[2.2.0]: https://github.com/subquery/subql/compare/common2.1.2...common/2.2.0
[2.1.2]: https://github.com/subquery/subql/compare/common/2.1.1...common/2.1.2
[2.1.1]: https://github.com/subquery/subql/compare/common/2.1.0...common/2.1.1
[2.1.0]: https://github.com/subquery/subql/compare/common/2.0.0...common/2.1.0
[2.0.0]: https://github.com/subquery/subql/compare/common/1.8.1...common/2.0.0
[1.8.1]: https://github.com/subquery/subql/compare/common/1.8.0...common/1.8.1
[1.8.0]: https://github.com/subquery/subql/compare/common/1.7.0...common/1.8.0
[1.7.0]: https://github.com/subquery/subql/compare/common/1.6.0...common/1.7.0
[1.6.0]: https://github.com/subquery/subql/compare/common/1.5.0...common/1.6.0
[1.5.0]: https://github.com/subquery/subql/compare/common/1.4.4...common/1.5.0
[1.4.4]: https://github.com/subquery/subql/compare/common/1.4.4...common/1.4.4
[1.4.3]: https://github.com/subquery/subql/compare/common/1.4.2...common/1.4.3
[1.4.2]: https://github.com/subquery/subql/compare/common/1.4.1...common/1.4.2
[1.4.1]: https://github.com/subquery/subql/compare/common/1.4.0...common/1.4.1
[1.4.0]: https://github.com/subquery/subql/compare/common/1.3.0...common/1.4.0
[1.3.0]: https://github.com/subquery/subql/compare/common/1.2.2...common/1.3.0
[1.2.2]: https://github.com/subquery/subql/compare/common/1.2.1...common/1.2.2
[1.2.1]: https://github.com/subquery/subql/compare/common/1.2.0...common/1.2.1
[1.2.0]: https://github.com/subquery/subql/compare/common/1.1.0...common/1.2.0
[1.1.0]: https://github.com/subquery/subql/compare/common/1.0.0...common/1.1.0
[1.0.0]: https://github.com/subquery/subql/compare/common/0.23.0...common/1.0.0
[0.23.0]: https://github.com/subquery/subql/compare/common/0.22.0...common/0.23.0
[0.22.0]: https://github.com/subquery/subql/compare/common/0.21.2...common/0.22.0
[0.21.2]: https://github.com/subquery/subql/compare/common/0.21.1...common/0.21.2
[0.21.1]: https://github.com/subquery/subql/compare/common/0.21.0...common/0.21.1
[0.21.0]: https://github.com/subquery/subql/compare/common/0.20.0...common/0.21.0
[0.20.0]: https://github.com/subquery/subql/compare/common/0.19.0...common/0.20.0
[0.19.0]: https://github.com/subquery/subql/compare/common/0.18.0...common/0.19.0
[0.18.0]: https://github.com/subquery/subql/compare/common/0.17.0...common/0.18.0
[0.17.0]: https://github.com/subquery/subql/compare/common/0.16.0...common/0.17.0
[0.16.0]: https://github.com/subquery/subql/compare/common/0.15.0...common/0.16.0
[0.15.0]: https://github.com/subquery/subql/compare/common/0.14.1...common/0.15.0
[0.14.1]: https://github.com/subquery/subql/compare/common/0.14.0...common/0.14.1
[0.14.0]: https://github.com/subquery/subql/compare/common/0.13.0...common/0.14.0
[0.13.0]: https://github.com/subquery/subql/compare/common/0.12.0...common/0.13.0
[0.12.0]: https://github.com/subquery/subql/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/subquery/subql/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/subquery/subql/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/subquery/subql/compare/v0.9.2...v0.10.0
[0.9.2]: https://github.com/subquery/subql/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/subquery/subql/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/subquery/subql/compare/v0.8.3...v0.9.0
[0.8.3]: https://github.com/subquery/subql/compare/v0.8.2...v0.8.3
[0.8.2]: https://github.com/subquery/subql/compare/v0.8.0...v0.8.2
[0.8.0]: https://github.com/subquery/subql/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/subquery/subql/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/OnFinality-io/subql/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/OnFinality-io/subql/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/OnFinality-io/subql/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/OnFinality-io/subql/tags/v0.2.0
