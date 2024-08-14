# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.2.3] - 2024-08-14
### Fixed
- Supports subgraph migration `kind: ethereum`.

## [5.2.2] - 2024-08-14
### Added
- fix case sensitive import for schema entities in codegen (#2211)

### Fixed
- Glob sync issue (#2534)

## [5.2.1] - 2024-08-12
### Changed
- Default deployment type to SubQuery when deploying to the managed service (#2523).

## [5.2.0] - 2024-08-05
### Changed
- Update inquirer dependencies (#2501)
- Improve endpoint type to be based on core type (#2511)
- Update dependencies (#2518)

### Fixed
- Not being able to select a custom repo when initializing a project (#2501)

### Added
- Subgraph graphql schema migration to the migrate command (#2499)

## [5.1.1] - 2024-07-25
### Changed
- Bump versions with `@subql/common` and `@subql/utils` (#2498)

## [5.1.0] - 2024-07-11
### Changed
- Use `IPFSHTTPClientLite` replace `IPFSHTTPClient` (#2480)

## [5.0.1] - 2024-07-09
### Changed
- Changes to ts build settings (#2475)

## [5.0.0] - 2024-07-04
### Added
- Enable ts strict mode

### Fixed
- The IPFS CID for multi-chain requires the directory CID.

### Changed
- Breaking Change: Removed common network packages from dependencies, only import required module from local/global when using. (#2456)

## [4.15.0] - 2024-06-21
### Changed
- Update `@subql/utils`, `@subql/common` and other dependencies

## [4.14.0] - 2024-06-18
### Removed
- Deprecated flare SDK (#2428)

## [4.13.1] - 2024-06-12
### Changed
- Update `@subql/utils`

## [4.13.0] - 2024-06-12
### Changed
- Improve logging and error handling for multichain deploy (#2434)

### Fixed
- Add missing networks for migration
- Fixed init command path issue
- Update common-ethereum to fix issue with ABI validation (#2435)

## [4.12.0] - 2024-06-05
### Changed
- Bump with common dependencies

## [4.11.0] - 2024-05-30
### Added
- `--queryLimit` flag to deploy command for query service (#2419)

## [4.10.1] - 2024-05-27
### Fixed
- Enums being exported twice with codegen

## [4.10.0] - 2024-05-22
### Changed
- Remove unused imports (#2408)

## [4.9.0] - 2024-05-20
### Changed
- Bump common dependencies to latest version

## [4.8.0] - 2024-05-08
### Changed
- Bump with @subql/util, update polkadot dependencies to v11

## [4.7.0] - 2024-05-02
### Added
- Migrate a subgraph project to subquery project
  - enble migrate its `subgraph.yaml` to `project.ts`

## [4.6.0] - 2024-04-24
### Added
- support env & env commands (#2345)

## [4.5.2] - 2024-04-12
### Fixed
- Deployments failing with `this.jsonEnabled is not a function` (#2351)

## [4.5.1] - 2024-04-11
### Fixed
- Upgrade common dependencies in cli in order to fix build missing `GetOptions` issue

## [4.5.0] - 2024-03-28
### Added
- Support multi-chain deployments (#2290)

### Fixed
- Auth token being undefined when loading from file (#2309)

### Changed
- Update codegen to use options type and add comment to generated code (#2325)

## [4.4.1] - 2024-03-08
### Fixed
- Access token paths on Windows for commands other than publish (#2291)

## [4.4.0] - 2024-03-05
### Changed
- Update deployment command to align with ManagedService API changes (#2282)

## [4.3.0] - 2024-02-29
### Fixed
- Publish command output flag not working (#2270)

### Changed
- Update deployemnt flags to match managed service (#2274)

## [4.2.7] - 2024-02-23
### Changed
- Bump axios from 0.27.0 to 0.28.0 (#2262)

## [4.2.6] - 2024-02-02
### Fixed
- Bump `common-cosmos` Codegen failing on Windows by using forked version of `telescope` (#2239)
- Bump `common-ethereum` with Codegen typechain fix (#2239)

## [4.2.5] - 2023-12-22
### Fixed
- codegen for some ethereum projects with assets

## [4.2.4] - 2023-12-14
### Changed
- Breaking: Update cosmos codegen to fix generating invalid typescript, this could require minor changes to your imports and usage of message types
- Update all sdk common dependencies

## [4.2.3] - 2023-11-30
### Removed
- removed deprecated endpoint query on endpoint suggestion (#2190)

## [4.2.2] - 2023-11-24
### Changed
- Update deployment command with v3 api (#2177)

## [4.2.1] - 2023-11-13
### Changed
- Update `@subql/utils`

## [4.2.0] - 2023-10-31
### Added
- Support building and publishing Concordium projects (#2078)
- ts-manifest compatibility with `codegen:generate` command (#2111)

## [4.1.0] - 2023-10-25
### Changed
- Removed `validate` command from cli, also removed from `@subql/validator` from dependencies (#2121)

### Added
- Multichain support for TypeScript manifest (#2097)
- Support for multi endpoints CLI deployment (#2117)

### Fixed
- Building TS manifest on Windows (#2118)

## [4.0.5] - 2023-10-18
### Changed
- Update error handling on deployment commands (#2108)

## [4.0.4] - 2023-10-17
### Fixed
- handle error on generate command (#2095)

## [4.0.3] - 2023-10-11
### Fixed
- Fixed yaml readers/writers on `init` command (#2082)

## [4.0.2] - 2023-10-11
### Fixed
- Codegen expecting a ts manifest but not a yaml manifest (#2084)

## [4.0.1] - 2023-10-10
### Fixed
- Fix `codegen` logic for Cosmos Manifests (#2073)
- Error when generating manifest from ts (#2075)

## [4.0.0] - 2023-10-04
### Fixed
- Fix incorrect codegen on unstructured storage proxy contract abis (#1976)
- Publish multichain projects file to a directory in ipfs (#1981)

### Added
- Support for cosmwasm contract abi codegen (#1989)
- Update `subql init` to use proxy templates (#1991)
- Support build and publish project from typescript manifest. (#2011)

### Changed
- Update common packages version from `latest`, to ensure they will be bumped (#1992)
- Update model codegen to include `getByFields` and produce prettier code (#1993)
- migrate from `oclif` v1 to v2
- Move abi-codegen from `cli` to `common-ethereum` (#2010)
- Update common dependencies from each SDK with latest changes

### Removed
- replaced `oclif-dev` dependency with `oclif` due to v2 migration (#1998)
- globby from dev dependencies (#1998)

## [3.6.1] - 2023-08-29
### Fixed
- Publish command creating invalid deployment (#1977)

## [3.6.0] - 2023-08-25
### Added
- `codegen` support for Cosmos (Protobufs to ts) (#1958)

### Fixed
- Publish command uploading files to IPFS multiple times (#1967)

## [3.5.1] - 2023-08-16
### Fixed
- Ensure absolute pathing for all path related flags (#1947)

## [3.5.0] - 2023-08-11
### Added
- abi `codegen` support for `cosmos/Ethermint` (#1936)

### Fixed
- Ensure non evm custom datasource do not generate abis (#1936)

## [3.4.0] - 2023-08-10
### Added
- Add new command `codegen:generate`, allowing users to generate a scaffold based on selected ABIs (#1896)
- `subql init` supports scaffold creation via `codegen:generate` (#1896)
- Support for update availability logs (#1930)

### Changed
- change soroban packages to stellar (#1929)

## [3.3.3] - 2023-08-04
### Fixed
- `subql codegen` with different pathing ABIs (#1916)
- Fix codegen entity constructor missing array on field (#1922)

### Added
- Support building and publishing soroban projects (#1919)

## [3.3.2] - 2023-07-31
### Fixed
- Update license in all packages (#1891)

## [3.3.1] - 2023-07-11
### Fixed
- `codegen` not working with artifact format files (#1867)

## [3.3.0] - 2023-06-26
### Removed
- Support for Terra and Avalanche SDKs. Note: Avalanche is still supported through the Ethereum SDK. (#1841)

## [3.2.0] - 2023-06-19
### Added
- Simply multichain running, allow codegen for multichain projects, support adding new chain manifest (#1746)

## [3.1.1] - 2023-06-07
### Fixed
- Ensure codegen supports generatedAbis dynamic and custom datasources. (#1780)
- Codegen will remove unused generatedAbis from generated files (#1789)

## [3.1.0] - 2023-05-31
### Changed
- Handle composite indexes with codegen (#1759)

## [3.0.0] - 2023-05-19
### Changed
- Codegen will now generate code that is compatible with TS strict settings. This changes entity constructors to take all required parameters. The create method is still the preferred way of defining entities. (#1713)

## [2.1.0] - 2023-05-10
### Removed
- Support for older manifest versions (except for migrations) (#1659)

## [2.0.0] - 2023-04-20
### Changed
- Major release 2.0.0, align with other package versions

### Added
- Build `*.test.ts` file to support testing Framework (#1584)

## [1.13.1] - 2023-03-30
### Added
- Change in migrate controller, add support for Multiple endpoints (#1551)

### Fixed
- Fix previous release 1.13.0 failed

## [1.13.0] - 2023-03-29
### Added
- `Build` generate sourcemap for projects (#1569)

### Fixed
- Fix codegen exit when ABI is not valid (#1570)
- Add validation for `codegen`, graphql conflicts (#1564)

## [1.12.3] - 2023-03-09
### Fixed
- Fix ABI codegen skipped due to runtime validation (#1552)

## [1.12.2] - 2023-03-07
### Fixed
- Fix `subql publish` with Avalanche manifest (#1546)

## [1.12.1] - 2023-03-07
### Changed
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
### Changed
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
- annotation is now supported in
- Can be added on any field of any entity except primary or foreign keys
- `@subql/node` will recognise it and create table with additional indexes to speed querying
- Allow query by indexed field via `global.store` (#271)
- annotation is now supported in
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

[Unreleased]: https://github.com/subquery/subql/compare/cli/5.2.3...HEAD
[5.2.3]: https://github.com/subquery/subql/compare/cli/5.2.2...cli/5.2.3
[5.2.2]: https://github.com/subquery/subql/compare/cli/5.2.1...cli/5.2.2
[5.2.1]: https://github.com/subquery/subql/compare/cli/5.2.0...cli/5.2.1
[5.2.0]: https://github.com/subquery/subql/compare/cli/5.1.1...cli/5.2.0
[5.1.1]: https://github.com/subquery/subql/compare/cli/5.1.0...cli/5.1.1
[5.1.0]: https://github.com/subquery/subql/compare/cli/5.0.1...cli/5.1.0
[5.0.1]: https://github.com/subquery/subql/compare/cli/5.0.0...cli/5.0.1
[5.0.0]: https://github.com/subquery/subql/compare/cli/4.15.0...cli/5.0.0
[4.15.0]: https://github.com/subquery/subql/compare/cli/4.14.0...cli/4.15.0
[4.14.0]: https://github.com/subquery/subql/compare/cli/4.13.1...cli/4.14.0
[4.13.1]: https://github.com/subquery/subql/compare/cli/4.13.0...cli/4.13.1
[4.13.0]: https://github.com/subquery/subql/compare/cli/4.12.0...cli/4.13.0
[4.12.0]: https://github.com/subquery/subql/compare/cli/4.11.0...cli/4.12.0
[4.11.0]: https://github.com/subquery/subql/compare/cli/4.10.1...cli/4.11.0
[4.10.1]: https://github.com/subquery/subql/compare/cli/4.10.0...cli/4.10.1
[4.10.0]: https://github.com/subquery/subql/compare/cli/4.9.0...cli/4.10.0
[4.9.0]: https://github.com/subquery/subql/compare/cli/4.8.0...cli/4.9.0
[4.8.0]: https://github.com/subquery/subql/compare/cli/4.7.0...cli/4.8.0
[4.7.0]: https://github.com/subquery/subql/compare/cli/4.6.0...cli/4.7.0
[4.6.0]: https://github.com/subquery/subql/compare/cli/4.5.2...cli/4.6.0
[4.5.2]: https://github.com/subquery/subql/compare/cli/4.5.1...cli/4.5.2
[4.5.1]: https://github.com/subquery/subql/compare/cli/4.5.0...cli/4.5.1
[4.5.0]: https://github.com/subquery/subql/compare/cli/4.4.1...cli/4.5.0
[4.4.1]: https://github.com/subquery/subql/compare/cli/4.4.0...cli/4.4.1
[4.4.0]: https://github.com/subquery/subql/compare/cli/4.3.0...cli/4.4.0
[4.3.0]: https://github.com/subquery/subql/compare/cli/4.2.7...cli/4.3.0
[4.2.7]: https://github.com/subquery/subql/compare/cli/4.2.6...cli/4.2.7
[4.2.6]: https://github.com/subquery/subql/compare/cli/4.2.5...cli/4.2.6
[4.2.5]: https://github.com/subquery/subql/compare/cli/4.2.4...cli/4.2.5
[4.2.4]: https://github.com/subquery/subql/compare/cli/4.2.3...cli/4.2.4
[4.2.3]: https://github.com/subquery/subql/compare/cli/4.2.2...cli/4.2.3
[4.2.2]: https://github.com/subquery/subql/compare/cli/4.2.1...cli/4.2.2
[4.2.1]: https://github.com/subquery/subql/compare/cli/4.2.0...cli/4.2.1
[4.2.0]: https://github.com/subquery/subql/compare/cli/4.1.0...cli/4.2.0
[4.1.0]: https://github.com/subquery/subql/compare/cli/4.0.5...cli/4.1.0
[4.0.5]: https://github.com/subquery/subql/compare/cli/4.0.4...cli/4.0.5
[4.0.4]: https://github.com/subquery/subql/compare/cli/4.0.3...cli/4.0.4
[4.0.3]: https://github.com/subquery/subql/compare/cli/4.0.2...cli/4.0.3
[4.0.2]: https://github.com/subquery/subql/compare/cli/4.0.1...cli/4.0.2
[4.0.1]: https://github.com/subquery/subql/compare/cli/4.0.0...cli/4.0.1
[4.0.0]: https://github.com/subquery/subql/compare/cli/3.6.1...cli/4.0.0
[3.6.1]: https://github.com/subquery/subql/compare/cli/3.6.0...cli/3.6.1
[3.6.0]: https://github.com/subquery/subql/compare/cli/3.5.1...cli/3.6.0
[3.5.1]: https://github.com/subquery/subql/compare/cli/3.5.0...cli/3.5.1
[3.5.0]: https://github.com/subquery/subql/compare/cli/3.4.0...cli/3.5.0
[3.4.0]: https://github.com/subquery/subql/compare/cli/3.3.3...cli/3.4.0
[3.3.3]: https://github.com/subquery/subql/compare/cli/3.3.2...cli/3.3.3
[3.3.2]: https://github.com/subquery/subql/compare/cli/3.3.1...cli/3.3.2
[3.3.1]: https://github.com/subquery/subql/compare/cli/3.3.0...cli/3.3.1
[3.3.0]: https://github.com/subquery/subql/compare/cli/3.2.0...cli/3.3.0
[3.2.0]: https://github.com/subquery/subql/compare/cli/v3.1.1...cli/v3.2.0
[3.1.1]: https://github.com/subquery/subql/compare/cli/3.1.0...cli/3.1.1
[3.1.0]: https://github.com/subquery/subql/compare/cli/3.0.0...cli/3.1.0
[3.0.0]: https://github.com/subquery/subql/compare/cli/2.1.0...cli/3.0.0
[2.1.0]: https://github.com/subquery/subql/compare/cli/2.0.0.../cli/2.1.0
[2.0.0]: https://github.com/subquery/subql/compare/cli/.1.13.1../cli/2.0.0
[1.13.1]: https://github.com/subquery/subql/compare/cli/1.13.0.../cli/1.13.1
[1.13.0]: https://github.com/subquery/subql/compare/cli/1.12.3.../cli/1.13.0
[1.12.3]: https://github.com/subquery/subql/compare/cli/1.12.2.../cli/1.12.3
[1.12.2]: https://github.com/subquery/subql/compare/cli/1.12.1.../cli/1.12.2
[1.12.1]: https://github.com/subquery/subql/compare/cli/1.12.0.../cli/1.12.1
[1.12.0]: https://github.com/subquery/subql/compare/cli/1.11.0.../cli/1.12.0
[1.11.0]: https://github.com/subquery/subql/compare/cli/1.10.1.../cli/1.11.0
[1.10.1]: https://github.com/subquery/subql/compare/cli/1.10.0.../cli/1.10.1
[1.10.0]: https://github.com/subquery/subql/compare/cli1.9.1/.../cli/1.10.0
[1.9.1]: https://github.com/subquery/subql/compare/cli/1.9.0.../cli/1.9.1
[1.9.0]: https://github.com/subquery/subql/compare/cli/1.8.0.../cli/1.9.0
[1.8.0]: https://github.com/subquery/subql/compare/cli/1.7.0.../cli/1.8.0
[1.7.0]: https://github.com/subquery/subql/compare/cli/1.6.4.../cli/1.7.0
[1.6.4]: https://github.com/subquery/subql/compare/cli/1.6.3.../cli/1.6.4
[1.6.3]: https://github.com/subquery/subql/compare/cli/1.6.2.../cli/1.6.3
[1.6.2]: https://github.com/subquery/subql/compare/cli/1.6.1.../cli/1.6.2
[1.6.1]: https://github.com/subquery/subql/compare/cli/1.6.0.../cli/1.6.1
[1.6.0]: https://github.com/subquery/subql/compare/cli/1.5.1.../cli/1.6.0
[1.5.1]: https://github.com/subquery/subql/compare/cli/1.5.0.../cli/1.5.1
[1.5.0]: https://github.com/subquery/subql/compare/cli/1.4.0.../cli/1.5.0
[1.4.0]: https://github.com/subquery/subql/compare/cli/1.3.1.../cli/1.4.0
[1.3.1]: https://github.com/subquery/subql/compare/cli/1.3.0.../cli/1.3.1
[1.3.0]: https://github.com/subquery/subql/compare/cli/1.2.1.../cli/1.3.0
[1.2.1]: https://github.com/subquery/subql/compare/cli/1.2.0.../cli/1.2.1
[1.2.0]: https://github.com/subquery/subql/compare/cli/1.1.1.../cli/1.2.0
[1.1.1]: https://github.com/subquery/subql/compare/cli/1.1.0.../cli/1.1.1
[1.1.0]: https://github.com/subquery/subql/compare/cli/1.0.1.../cli/1.1.0
[1.0.1]: https://github.com/subquery/subql/compare/cli/1.0.0.../cli/1.0.1
[1.0.0]: https://github.com/subquery/subql/compare/cli/.0.29.0../cli/1.0.0
[0.29.0]: https://github.com/subquery/subql/compare/cli/0.28.0.../cli/0.29.0
[0.28.0]: https://github.com/subquery/subql/compare/cli/0.27.0.../cli/0.28.0
[0.27.0]: https://github.com/subquery/subql/compare/cli/0.26.1.../cli/0.27.0
[0.26.1]: https://github.com/subquery/subql/compare/cli/0.26.0.../cli/0.26.1
[0.26.0]: https://github.com/subquery/subql/compare/cli/0.25.0.../cli/0.26.0
[0.25.0]: https://github.com/subquery/subql/compare/cli/0.24.0.../cli/0.25.0
[0.24.0]: https://github.com/subquery/subql/compare/cli/0.23.0.../cli/0.24.0
[0.23.0]: https://github.com/subquery/subql/compare/cli/0.22.0.../cli/0.23.0
[0.22.0]: https://github.com/subquery/subql/compare/cli/0.21.0.../cli/0.22.0
[0.21.0]: https://github.com/subquery/subql/compare/cli/0.20.1.../cli/0.21.0
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
[0.13.0]: https://github.com/subquery/subql/compare/cli/0.12.0...cli/0.13.0
[0.12.0]: https://github.com/subquery/subql/compare/cli/0.11.2...cli/0.12.0
[0.11.2]: https://github.com/subquery/subql/compare/cli/0.11.1...cli/0.11.2
[0.11.1]: https://github.com/subquery/subql/compare/cli/0.11.0...cli/0.11.1
[0.11.0]: https://github.com/subquery/subql/compare/cli/0.10.0...cli/0.11.0
[0.10.0]: https://github.com/subquery/subql/compare/cli/0.9.3...cli/0.10.0
[0.9.3]: https://github.com/subquery/subql/compare/cli/0.9.2...cli/0.9.3
[0.9.2]: https://github.com/subquery/subql/compare/v0.9.0...v0.9.2
[0.9.0]: https://github.com/subquery/subql/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/subquery/subql/compare/v0.7.3...v0.8.0
[0.7.3]: https://github.com/OnFinality-io/subql/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/OnFinality-io/subql/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/OnFinality-io/subql/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/OnFinality-io/subql/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/OnFinality-io/subql/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/OnFinality-io/subql/compare/v0.2.0...v0.5.0
[0.2.0]: https://github.com/OnFinality-io/subql/tags/0.2.0
