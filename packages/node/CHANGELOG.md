# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<<<<<<< HEAD
All logs must start with the format: [x.y.z] - yyyy-mm-dd
=======
## [Unreleased]

## [1.5.1] - 2022-07-15
### Fixed
- Unable to create ds processor from template when project hosted on IPFS (#1190)

## [1.5.0] - 2022-07-12
### Added
- add option `dictionary-timeout`, allow indexer decide timeout for query dictionary result (#1177)
### Changed
- Improve error log (#1174)
- Update Polkadot to 8.12.2 (#1179)

## [1.4.1] - 2022-07-07
### Fixed
- Fix oversize subscription notification trigger name (#1171)

## [1.4.0] - 2022-07-05
### Fixed
- Fix DI issue with EventEmitter not being resolved (#1154)
- Validate dictionary before use its specVersion (#1152)
### Changed
- use Http keepAlive and maxSockets, use http2 (#1150)

## [1.3.0] - 2022-06-29
### Changed
- Update tests with Manifest v1.0.0 (#1114)
- Update redecorate api, allow apiAt object to query data earlier than current indexing block (#1111)
- Using chain block time as interval to fetch latest finalized and best block height (#1134)
### Fixed
- Fix set block offset twice issue (#1133)
- Fix warning for fetch specVersion when dictionary undefined, and tidy up logs (#1127)
- Fix pending data being used when it should be reset with new DS (#1140)

## [1.2.1] - 2022-06-22
### Fixed
- Handle when templates are undefined

## [1.2.0] - 2022-06-22
### Added
- Use dictionary SpecVersion map (#1046)
- Support dictionary for dynamic ds (#1110)
### Changed
- Split setup code from indexer manager to another service (#1092)
### Fixed
- Handle when specVersion query response is undefined (#1097)
- Fix templates not being processed for manifest v1.0.0 (#1116)

## [1.1.2] - 2022-06-02
### Fixed
- Fixed btree_gist extension, also provide docker postgres with extension (#1090)
- Fixed handle multi datasources with different start block height (#1091)

## [1.1.1] - 2022-06-01
### Fixed
- Fix disabling historical (#1085)
- Fix benchmark logging (#1083)

## [1.1.0] - 2022-05-31
### Fixed
- Move POI logic under option check (#1064)
### Added
- Add api to query file based mmr (#968)
- Experimental feature: Support query by block number (#992)
### Changed
Remove `contract-processors` to [subquery/datasource-processors](https://github.com/subquery/datasource-processors), types improvements and support for datasource processors v1.0.0 (#1012)

## [1.0.0] - 2022-05-11
- Major release

## [0.35.2] - 2022-05-10
Priority: High. Fixes events being handled multiple times, issue was introduced in 0.34.0

### Fixed
- Events being handled multiple times (#994)

## [0.35.1] - 2022-05-06
### Changed
- Bump with `@subql/utils`

## [0.35.0] - 2022-05-02
### Added
- Add utils package (#928)
### Fixed
- Handle undefined filters (#929)
### Changed
- Update polkadot 8.2.1 (#910)

## [0.34.0] - 2022-04-26
### Changed
- Remove notify trigger if subscription disabled (#882)
- Drop support for manifest v0.0.1 (#900)
- Process block content in time secquence rather than ds/handler order (#853)
### Fixed
- Fixed the mmr inconsistent value issue, remove redundant code,  and set `blockOffset` value to the first store operation blockHeight -1 (#894)

## [0.33.0] - 2022-04-06
### Added
- Add support for handle manifest 1.0.0 (#845)

## [0.32.0] - 2022-04-04
### Changed
- Update to use `vm2`(#869)
- Update Polkadot/api to 7.14.3 (#866)
- move subscription to dedicate flag (#867)

## [0.31.1] - 2022-03-23
### Fixed
- Fix subscription notification trigger name invalid issue(#862)

## [0.31.0] - 2022-03-22
### Changed
- Update Polkadot/api to 7.12.1 (#849)
### Added
- Add Notification Trigger in order to support GraphQL subscription (#846)

## [0.30.2] - 2022-03-15
### Fixed
- Fix unable able fetch with small batch size issue (#847)

## [0.30.1] - 2022-03-10
### Fixed
- Fix enum sort order (#844)

## [0.30.0] - 2022-03-01
### Changed
- Update imports, as substrate related components now will be imported from `subql/common-substrate`. (#781)

## [0.29.1] - 2022-02-23
### Fixed
- Fix get default subquery name (#820)

## [0.29.0] - 2022-02-23
### Changed
- Update Polkadot/api to 7.9.1 (#815)
- Support node indexing from a manifest file (#800)

## [0.28.2] - 2022-02-16
### Changed
- Update Polkadot/api to 7.8.1 ,in order to resolve previous release issue (#806)

## [0.28.1] - 2022-02-15
### Fixed
- Fixed issue that node stop fetch block when set batch size to 1. (#802)

## [0.28.0] - 2022-02-09
### Added
- Support running the indexer from locations other than the filesystem, and refactor `SubqueryProject` class (#511) 
- Add support for index dynamic datasources (#773)
- Add support for historical RPC methods that use BlockNumber (#788)
### Changed
- Update Polkadot/api to 7.7.1 (#787)
### Fixed
- Fixed mmr initialization start height issue (#600)


## [0.27.2] - 2022-01-23
### Changed
- Update Polkadot/api to 7.4.1 (#757)
### Fixed
- Fix genesis hash validation for manifest v0.0.1 (#762)

## [0.27.1] - 2022-01-18
### Changed
- Ready endpoint return code (#750)

## [0.27.0] - 2022-01-13
### Changed
- Deprecate local mode (#725)
- Update Polkadot/api to 7.3.1 (#745)
### Added 
- Add ready status of indexer to endpoint (#728)
- Add `--port` option, auto find available port when the default one is occupied. (#739)ss
### Fixed
- Fix handle chainTypes error (#732)
- Try catch on init api with chainTypes (#738)
- Verify project store genesis hash with network genesis hash, instead of check specName only (#735)
- Remove update metadata last processed block by interval (#740)
- Use Promise.all for set metadata (#743)


## [0.26.0] - 2021-12-16
### Added
- Support dictionary for custom datasource (#686)
- Automatic adjust fetched block batch size based on memory usage, enable by passing `--scale-batch-size` (#668)
- Depreciate subqueries table (#683)
- Add `bulkCreate()` to `store`  (#699)
- Add support for loading chaintypes from js (#698)
### Fixed
- Fix name escaping with db queries (#702)
- Fix `lastProcessedHeight` value representation (#711)

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
>>>>>>> origin/main

## [Unreleased]

### Changed
- Sync with latest development from origin (#44)

## [0.2.0] - 2022-07-08

### Changed

- Decode buffer to json for `cosmwasm.wasm.v1.MsgMigrateContract` and `cosmwasm.wasm.v1.MsgInstantiateContract` messages (#38)

## [0.1.3] - 2022-07-01

### Fixed
- Dependency injection issue with EventEmitter

## [0.1.2] - 2022-07-01
### Fixed
- Docker image health checks failing because of missing `curl` command

### Added
- Inject the types registry into the sandbox (#34)

## [0.1.1] - 2022-06-29

### Updated
- Sync with latest development from origin (#31)

### Added
- HTTP keep alive (#30)

## [0.1.0] - 2022-06-27

### Breaking changes
- Messages and events have changed `message.msg.msg` to `message.msg.decodeMsg.msg`. This is due to lazy loading and will mean you don't need to provide chain types for messages you don't care about
- Dictionary structure has changed

### Fixed
- Loading chainTypes that referred to other files (#28)
- Dictionary queries, this also required a new dictionary (#26)

### Updated
- Sync with latest development from origin (#27)

### Added
- Support for nested filters (#21)
- Support for enum contract call (#23)
- Lazy decoding of messages (#17)

## [0.0.7] - 2022-06-21
### Fixed
- Handle JSON variable types in dictionary (#24)
- Dictionary message filter being undefined

## [0.0.6] - 2022-06-17
### Fixed
- Use modified tendermint-rpc to avoid Juno block 3103475

## [0.0.5] - 2022-06-15
First release

[Unreleased]: https://github.com/subquery/subql-cosmos/compare/node/0.2.0...HEAD
[0.2.0]: https://github.com/subquery/subql-cosmos/compare/node/0.1.3...node/0.2.0
[0.1.3]: https://github.com/subquery/subql-cosmos/compare/node/0.1.2...node/0.1.3
[0.1.2]: https://github.com/subquery/subql-cosmos/compare/node/0.1.1...node/0.1.2
[0.1.1]: https://github.com/subquery/subql-cosmos/compare/node/0.1.0...node/0.1.1
[0.1.0]: https://github.com/subquery/subql-cosmos/compare/node/0.0.7...node/0.1.0
[0.0.7]: https://github.com/subquery/subql-cosmos/compare/node/0.0.6...node/0.0.7
[0.0.6]: https://github.com/subquery/subql-cosmos/compare/node/0.0.5...node/0.0.6
