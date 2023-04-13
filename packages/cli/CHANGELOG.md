# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), 
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

All logs must start with the format: [x.y.z] - yyyy-mm-dd

## [Unreleased]

## [1.13.1] - 2023-03-30
### Added
- Change in migrate controller, add support for Multiple endpoints (#1551)
### Fix
- Fix previous release 1.13.0 failed

## [1.13.0] - 2023-03-29
### Added
- `Build` generate sourcemap for projects (#1569)
### Fix
- Fix codegen exit when ABI is not valid (#1570)
- Add validation for `codegen`, graphql conflicts (#1564)

## [1.12.3] - 2023-03-09
### Fix
- Fix ABI codegen skipped due to runtime validation (#1552)

## [1.12.2] - 2023-03-07
### Fix
- Fix `subql publish` with Avalanche manifest (#1546)

## [1.12.1] - 2023-03-07
### Update
- `@subql/common-avalanche` dependency update

## [1.12.0] - 2023-03-06
### Added
- Support ETH abi codegen (#1532)

## [1.11.0] - 2023-01-31
### Fixed
- Fix `subql publish` failing on windows (#1502)

### Added
- Support for Near (#1498)

## [1.10.1] - 2022-12-22
### Fixed
- Fix command `codegen` to allow templates with other SDKs(#1470)

## [1.10.0] - 2022-12-19
### Changed
- Update deploy cli to fix `disableHistorical` option (#1460)

## [1.9.1] - 2022-12-05
### Fixed
- Fix for `subql` codegen `--file` flag. (#1446)

## [1.9.0] - 2022-11-23
### Added
- Add support to cli/validator for flare (#1416)

## [1.8.0] - 2022-10-27
### Fixed
- Fix CLI init project manifest missing comments issue (#1380)

## [1.7.0] - 2022-10-27

### Added
- `--dedicatedDB` option to project deployement. (#1355)
- Flags for advanced settings. (#1352)

### Fixed
- Specifying query and node versions with or without a `v`. (#1354)

## [1.6.4] - 2022-10-06
- Update IPFS endpoints. (#1337)

## [1.6.3] - 2022-09-29
### Fixed
- Fix Output URL for `project:create-project` command. (#1324)
- Improve `codegen` command error logs. (#1324)

## [1.6.2] - 2022-09-24
### Fixed
- Fixed cli publish failed due to upload file logic unable to validate section is `null`. (#1316)

## [1.6.1] - 2022-09-13
### Fixed
- Fixed `subql-init` for Algorand, Avalanche and Cosmos.

## [1.6.0] - 2022-08-17
### Changed
- Support new templates mono-repo structure. (#1236)

## [1.5.1] - 2022-08-11
### Fixed
- Bump version for missing update `subql-common` in previous release.

## [1.5.0] - 2022-08-04
### Added
- Support for Algorand projects (#1228)

### Fixed
- Removing `.github` directory from starter templates (#1223)

## [1.4.0] - 2022-07-27
### Added
- Added redeploy deployment feature (#1205)
- Rename `--project_name` flag to `--projectName` (#1205)
### Fixed
- Use latest runner validation from common package. (#1195)

## [1.3.1] - 2022-07-13
### Fixed
- Added resolution to downgrade `node-fetch` as we have not support ES module (1184)
- Added encodedURI for project deployment key (#1183)

## [1.3.0] - 2022-07-12
### Fixed
- CLI deployment when no dictionary or matching endpoint is provided (#1180)
### Added
- Storing ipfs-cid locally (#1169)
- New Flag `-d` added to `deployment:deploy` command allowing runner versions and endpoints to use default values from manifest (#1176)
### Changed
- Rename `deploy` command back to `deployment` (#1176)

## [1.2.1] - 2022-07-06
### Added
- Add cosmos family to cli init (#1165)

## [1.2.0] - 2022-07-05
### Fixed
- update common-avalanche,fix missing filter, asset and options (#1158)
### Changed
- Rename `deployment` command to `deploy`(#1149)

## [1.1.1] - 2022-06-29
### Fixed
- Fixed typo in publish log (#1135)
### Changed
- Update init and publish tests with manifest 1.0.0 (#1114)

## [1.1.0] - 2022-06-22
### Changed
- Increase publish project body size up to 50mb (#1100)
- Validate support multi networks, also support validate IPFS deployment. To validate project manifest spec version below 1.0.0, will require to provide `network-family` (#1115)
### Added
- Added avalanche and cosmos to publish (#1105)
- Now cli able to manage deployment on host service, promote, deploy and delete (#1102)

## [1.0.1] - 2022-05-31
### Fixed
- Fix cli init duplicate chainId and genesisHash (#1058)

## [1.0.0] - 2022-05-11
- Major release
### Fixed
- fix undefined file under chainTypes (#1010)

## [0.29.0] - 2022-05-11
### Changed
- remove use manifest in codegen (#1001)

## [0.28.0] - 2022-05-06
### Fixed
- Fix migrate missing chain types (#975)
### Changed
- Refactor init command and add network family (#979)

## [0.27.0] - 2022-05-02
### Added
- Add utils package (#928)

## [0.26.1] - 2022-04-27
### Added
- Support for Terra dynamic datasources (#899)
### Changed
- Output build errors (#901)

## [0.26.0] - 2022-04-26
### Added
- Add manifest specVersion 1.0.0 template to `subql init` command  (#888)
### Changed
- Drop support for manifest 0.0.1 templates (#900)

## [0.25.0] - 2022-04-12
### Changed
- Update @subql/common-terra to allow specifying a mantlemint endpoint (#885)

## [0.24.0] - 2022-04-06
### Added
- Add support for manifest 1.0.0, migrate will now upgrade project to 1.0.0 (#845)

## [0.23.0] - 2022-03-22
### Added
- Use `TerraProjectManifestVersioned` to support terra contract handling (#848)

## [0.22.0] - 2022-03-01
### Added
- Support terra in command line, add terra template (#781)

## [0.21.0] - 2022-02-24
### Added
- Support cli publish from a manifest file (#800)

## [0.20.1] - 2022-02-15
### Fixed
- Patch release with @subql/validator version bump, in order to fix validation issue. 

## [0.20.0] - 2022-02-09
### Added
- Add support for dynamic data sources (#773)
- Add authentication for publish command, access token will read from `SUBQL_ACCESS_TOKEN` in environment or under `$HOME/.subql/SUBQL_ACCESS_TOKEN` (#778)
### Fixed
- Fix codegen importing jsonType interface multiple times (#784)
- Fix cli build command issues (#789)

## [0.19.0] - 2022-01-21
### Added
- Allow use `subql build` self contained js as instructed by `exports` fields under`package.json` (#753)
### Changed
- Remove .github directory from new projects (#763)

## [0.18.0] - 2022-01-18
### Added
- Filter project templates by selected specVersion (#751)

## [0.17.0] - 2022-01-13
### Added
- Warning and advice for use manifest specVersion v0.0.1 (#730)
- Message for install git suggestion (#733)
- Allow user to select templates when run `subql init` (#712)

## [0.16.2] - 2021-12-16
### Changed
- Update subql/validator dependencies (#720)

## [0.16.1] - 2021-11-30
### Fixed
- Remove auto generated enum types and interfaces (#680)

## [0.16.0] - 2021-11-19
### Fixed
- Fix migrate datasource entry path (#641)
- Touch up command line description (#628)
### Changed
- Codegen controller using new type mappings (#532)
- Update publish command to handle custom datasource (#641)
- init command now create spec v0.2.0 project by default (#643)
### Added
- Support enums in codegen (#551)

## [0.15.0] - 2021-11-03
### Changed
- Improve ts typing for `static create()` function in model.ts template (#573)
- Use jsonrpc client to fetch genesis hash , drop dependencies of polkadot-api (#595)
- Update `subql validate` to validate custom ds (#596)
- Bump dependencies (#584)
### Added
- New command `Subql migrate` allow convert project manifest v0.0.1 to v0.2.0 (#587)

## [0.14.0] - 2021-10-26
### Added
- Added publish CLI command which uploads a project to IPFS if it is using project manifest v0.2.0 (#486)
### Changed
- Update Polkadot/api to 6.5.2 (#564)

## [0.13.0] - 2021-10-12
### Added
- Cli now support for manifest spec version `0.2.0` (#495)
- Expand on cli `init` capabilities, default to not installing dependencies (#485)

## [0.12.0] - 2021-09-16
### Added
- Adds command `subql build` which webpacks the project code into a single file (#475)

## [0.11.2] - 2021-09-01
### Fixed
- Fix codegen template for jsonField optional field (#459)

## [0.11.1] - 2021-08-27
### Fixed
- Deprecated warnings (#448)

## [0.11.0] - 2021-08-20
### Added
- Support Bytea type in Cli (#432)

## [0.10.0] - 2021-06-25
### Changed
- Update dependencies (#358)

## [0.9.3] - 2021-05-04
### Added
- Codegen will support indexed jsonb fields. No get methods will be created for such fields in the entity class. (#291)

## [0.9.2] - 2021-04-21
### Added
- Codegen allow query by foreign key field (#285)

## [0.9.0] - 2021-04-19
### Added
- `@index` annotation is now supported in `graphql.schema` (#255):
  - Can be added on any field of any entity except primary or foreign keys
  - `@subql/node` will recognise it and create table with additional indexes to speed querying
  -  Allow query by indexed field via `global.store` (#271)
- `@jsonField` annotation is now supported in `graphql.schema` which allows you to store structured data JSON data in a single database field
  - We'll automatically generate coresponding JSON interfaces when querying this data (#275)
  - Read more about how you can use this in our [updated docs](https://doc.subquery.network/create/graphql.html#json-type)

## [0.8.0] - 2021-03-11
### Added
- Update subquery repo path (#196)
- codegen will create foreign key for relations: 1-1, and 1-N  (#212)
- codegen support type Boolean (#216)
- add subcommand validate (#219)

## [0.7.3] - 2021-02-15
### Changed
- bump dependencies (#148)

## [0.7.2] - 2021-02-03
### Fixed
- fix yaml formatting problem in the starter scaffold generated by subql init (#140)

## [0.7.1] - 2021-01-27
### Fixed
- add missing cli-ux dependency (#133)

## [0.7.0] - 2021-01-27
### Added
- add user interaction for subql init (#118)

## [0.6.0] - 2021-01-21
### Fixed
- read graphql schema from the location defined in project.yml (#105)

## [0.5.0] - 2021-01-15
### Changed
- subql init doesn' need --starter by default (#86)
- model template use bigint instead of BigInt (#82)

## [0.2.0] - 2020-12-22
### Changed
- support subcommand codegen
- support subcommand init

[Unreleased]: https://github.com/subquery/subql/compare/cli/0.20.1...HEAD
[0.20.1]: https://github.com/subquery/subql/compare/cli/0.20.0...cli/0.20.1
[0.20.0]: https://github.com/subquery/subql/compare/cli/0.19.0...cli/0.20.0
[0.19.0]: https://github.com/subquery/subql/compare/cli/0.18.0...cli/0.19.0
[0.18.0]: https://github.com/subquery/subql/compare/cli/0.17.0...cli/0.18.0
[0.17.0]: https://github.com/subquery/subql/compare/cli/0.16.2...cli/0.17.0
[0.16.2]: https://github.com/subquery/subql/compare/cli/0.16.1...cli/0.16.2
[0.16.1]: https://github.com/subquery/subql/compare/cli/0.16.0...cli/0.16.1
[0.16.0]: https://github.com/subquery/subql/compare/cli/0.15.0...cli/0.16.0
[0.15.0]: https://github.com/subquery/subql/compare/cli/0.14.0...cli/0.15.0
[0.14.0]: https://github.com/subquery/subql/compare/cli/0.13.0...cli/0.14.0
[0.9.2]: https://github.com/subquery/subql/compare/v0.9.0...v0.9.2
[0.9.0]: https://github.com/subquery/subql/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/subquery/subql/compare/v0.7.3...v0.8.0
[0.7.3]: https://github.com/OnFinality-io/subql/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/OnFinality-io/subql/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/OnFinality-io/subql/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/OnFinality-io/subql/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/OnFinality-io/subql/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.5.0
