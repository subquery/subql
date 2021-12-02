# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.25.3] - 2021-12-02
Priority: High. Any project use enum should re-index with latest node ASAP.
### Fixed:
- Skip insert poi when db transaction is null (#687)
- Replace enum index with unique hash value, in order resolve schema type name conflict issue.(#688)


## [0.25.2] - 2021-11-30
Priority: high for projects indexed with 0.25.x or above
### Fixed:
- Upgrade dependency common, in order to remove auto generated enum types from entities relations (#682)

## [0.25.1] - 2021-11-27
Priority: high for projects use dictionary
### Fixed:
- Fix variable replacement in dictionary's gql, remove the quote wrapping (#673)
### Changed:
- set default false for `--timestamp-field` (#661)

## [0.25.0] - 2021-11-19
### Fixed: 
- Fix publish failing with custom ds and assets (#610)
- Support for enum, add into store and store operations (#551)
### Added:
- Allow running node from a different port through flag `—port`(#618)
- Add flag `force-clean`, force clean the database, dropping project schemas and tables (#619)
- Add `unsafe` flag for subql/node (#629)
### Changed:
- Merge metadata from query and node (#555)
- Refactor dictionary gql queries (#613)
- Use types mapping in storeOperation (#532)
- Replace patch api with `api.at()` (#638)
- Update polkadot api to 6.9.2 (#648)

## [0.24.0] - 2021-11-03
### Added
- [custom ds] Read and feed assets to custom ds's `validate()` (#547)
- Improve error msg when fetch block fails (#602)
### Changed
- Bump dependencies (#584)
- Moonbeam EVM,  filter before transforming with custom datasource (#593)
- Update Polkadot/api to 6.6.1 (#599)
### Fixed
- Moonbeam networks shows negative bps and fail Healthy checks (#589)

## [0.23.1] - 2021-10-27
### Fixed
- Disable the profiler on health check and remove logs (#569) 

## [0.23.0] - 2021-10-26
### Added
- Add MMR service allow to acquire Proof of index information and generate Merkle mountain range root, create and store root value in a file-based database, simultaneously it updates in the corresponding MMR value in the `_poi` table.
  This feature will be running along with the Proof of index service, also allow the user to specify a local path for .mmr by using flag `--mmr-path`. (#488)
- Introduce custom datasource (beta), enable subql to support a vary kind of smart contract solutions that embedded in parachains (#512)

### Changed
- Update Polkadot/api to 6.5.2 (#564)

### Fixed
- Performance improvement (#565)

## [0.22.0] - 2021-10-12
### Changed
- Update Polkadot/api to 6.3.1 to support metadata v14 (#505)
- Fetch service improve logs to include block height，it threw error at the time (#492)

### Fixed
- Throw errors when connection dropped by http, and exit (#519)
- Addition fix for Poi service with if condition (#508)

### Added
- Support project manifest 0.2.0 (#495)

## [0.21.1] - 2021-09-18
### Fixed
- Fixed apollo/client dependency issue (#482)

## [0.21.0] - 2021-09-16
### Changed
- Update Polkadot/api to 5.9.1 (#476)

### Added
- Api service support http(s) endpoint (#474)
- Add Proof-of-index service allow generate and record the hash of indexed work. User can enable this feature through the `--proof-of-work` command. Please note that this feature is currently in an experimental stage. (#443)

## [0.20.3] - 2021-09-01
### Changed
- Update Polkadot/api to 5.7.1 (#460)

## [0.20.2] - 2021-08-28
### Fixed
- Solve the missing block height of the event/extrinsic in the batch returned by the dictionary service  (#452)

## [0.20.1] - 2021-08-27
### Fixed
- Deprecated warnings (#448)

## [0.20.0] - 2021-08-20
### Changed
- Update Polkadot/api to 5.5.2 (#439)

### Added
- support interpret Bytea type (#432)

## [0.19.2] - 2021-08-16
### Fixed
- Improve data sources filtering handling and error messages (#417)

### Changed
- Adjust health check time to be the same as indexer timeout, or a minimum of 900 seconds. Also, log error when it is not healthy (#420)
- Update Polkadot/api to 5.5.1 (#433)

## [0.19.1] - 2021-07-29
### Fixed
- When the schema object type is an array convert to Jsonb type (#406)

## [0.19.0] - 2021-07-27
### Changed
- Bump `polkadot/api` to 5.2.1 (#402)

### Fixed
- Disable `api.at()` in patched API (#402)
- Fix to improve snake case handling for foreign keys and unique index constraint (#382)
- Fix `subql-node --help` so that it displays full options (#396)

### Added
- Expose best block height in meta (#392)

## [0.18.0] - 2021-07-06
### Fixed
- Fix metric listener handle skip dictionary (#380)

## [0.17.4] - 2021-07-06
### Fixed
- Fix problem when filling the block number buffer missing the last number which has caused some block records are missing. (#378)

## [0.17.3] - 2021-07-06
### Fixed
- Fixed bug that prevented indexes from being added automatically on foreign keys (#371)

### Added
- add profiler to monitoring indexer performance (#369)
- add metrics to listen status of using dictionary and number of times it been skipped. (#369)

## [0.17.2] - 2021-07-01
### Fixed
- fix get runtimeVersion failed when fetch service initialization (#367)
- set useDictionary to false when one of the event/extrinsic filters are not provided (#367)

## [0.17.1] - 2021-06-29
### Fixed
- Fix an edge case for dictionary query, add blocknumber max range to speed up dictionary (#365)

## [0.17.0] - 2021-06-25
### Added
- Add an external dictionary feature to massively improve indexing speed.
  - Enable by `--network-dictionary=<dictionary_HTTP_url>` or in `project.yaml` - [read more](https://doc.subquery.network/run/run.html#using-a-dictionary) (#342)
  - Add dictionary service to fetch dictionary from external GraphQL API (#342)
  - Add additional block number buffer in fetch service to handle incoming dictionary data (#342)

### Changed
- replace vm2 with @subql/x-vm2 (#358)
- Update other dependencies (#358)

## [0.16.2] - 2021-06-28
### Changed
- Bump polkadot/api to 4.16.2 (#363)

## [0.16.1] - 2021-06-22
### Added
- Add arg for enable/disable timestamp created_at and updated_at though `--timestamp-field` (#352)

## [0.16.0] - 2021-06-22
### Changed
- metadata expose last processed block (#327)
- Remove created_at and updated_at from table (#343)
- Bump polkadot/api to 4.15.1 (#350)

## [0.15.1] - 2021-05-27
### Changed
- Bump polkadot/api to 4.11.2

## [0.15.0] - 2021-05-24
### Changed
- Bump polkadot/api to 4.11.1

### Fixed
- Skip fetch finalized block until API is ready.
- Fix indexes detection

## [0.14.0] - 2021-05-19
### Fixed
- Use pull instead of subscribe to get new block height. This solves issues where the subscription stalls and SubQuery reports an incorrect block height.

### Changed
- Not all `api.rpc` are banned now, historical RPC methods can be called. See the docs [link](https://doc.subquery.network/create/mapping.html#rpc-calls) (#304)
- Bump polkadot/api dependency (#310)
- Replace vm2 with fork to support lib like `@polkadot/*` that uses esm as default (#311)

## [0.13.0] - 2021-05-06
### Added
- Bump release version due to recent major updates, also need publish new release to npm.

## [0.12.3] - 2021-05-04
### Added
- Automatically verifies that a model's indexed fields are supported by extracting indexed fields from the database (#289)
- [Experimental Feature] We're removed the restrictions on using third party CommonJS libraries in your SubQuery project sandbox - please read more about this in our [updated documentation](https://doc.subquery.network/create/mapping.html##modules-and-libraries) (#292)
- Support for more NodeJS modules (`buffer`, `crypto`, `util`, `events`, and `path`) (#294)

## [0.12.2] - 2021-04-21
### Added
- Enforce index on foreign key field (#285)

### Fixed
- Improve logs for db sync, catch error and exit (#283)

## [0.12.0] - 2021-04-20
### Fixed
- Bump dependencies for logger
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

## [0.2.0] - 2020-12-22
### Added
- support block handler
- put subquery tables in their own db schema
- use BigInt instead of BN (#27)

### Changed
- bump @polkadot/api to 3.1.1

[Unreleased]: https://github.com/subquery/subql/compare/node/0.25.3...HEAD
[0.25.3]: https://github.com/subquery/subql/compare/node/0.25.2...node/0.25.3
[0.25.2]: https://github.com/subquery/subql/compare/node/0.25.1...node/0.25.2
[0.25.1]: https://github.com/subquery/subql/compare/node/0.25.0...node/0.25.1
[0.25.0]: https://github.com/subquery/subql/compare/node/0.24.0...node/0.25.0
[0.24.0]: https://github.com/subquery/subql/compare/node/0.23.1...node/0.24.0
[0.23.1]: https://github.com/subquery/subql/compare/node/0.23.0...node/0.23.1
[0.23.0]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.22.0]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.21.1]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.21.0]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.20.3]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.20.2]: https://github.com/subquery/subql/compare/v0.20.1...v0.20.2
[0.20.1]: https://github.com/subquery/subql/compare/v0.20.0...v0.20.1
[0.20.0]: https://github.com/subquery/subql/compare/v0.19.2...v0.20.0
[0.19.2]: https://github.com/subquery/subql/compare/v0.19.1...v0.19.2
[0.19.1]: https://github.com/subquery/subql/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/subquery/subql/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/subquery/subql/compare/v0.17.4...v0.18.0
[0.17.4]: https://github.com/subquery/subql/compare/v0.17.3...v0.17.4
[0.17.3]: https://github.com/subquery/subql/compare/v0.17.2...v0.17.3
[0.17.2]: https://github.com/subquery/subql/compare/v0.17.1...v0.17.2
[0.17.1]: https://github.com/subquery/subql/compare/v0.17.0...v0.17.1
[0.17.0]: https://github.com/subquery/subql/compare/v0.17.0...v0.17.0
[0.16.2]: https://github.com/subquery/subql/compare/v0.16.1...v0.16.2
[0.16.1]: https://github.com/subquery/subql/compare/v0.16.0...v0.16.1
[0.16.0]: https://github.com/subquery/subql/compare/v0.15.1...v0.16.0
[0.15.1]: https://github.com/subquery/subql/compare/v0.15.0...v0.15.1
[0.15.0]: https://github.com/subquery/subql/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/subquery/subql/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/subquery/subql/compare/v0.12.3...v0.13.0
[0.12.3]: https://github.com/subquery/subql/compare/v0.12.2...v0.12.3
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
