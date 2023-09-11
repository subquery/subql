# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Update apollo-links to 1.0.2, fix dictionary resolver failed to get token issue
- Use test runs as unit for tests instead of entity checks (#1957)
- handle APIs in connection pool whose initialization failed (#1970)
- Fix generated operation hash with single entity, buffer did not get hashed issue.
- Infinite recursion in setValueModel with arrays (#1993)
- Fix health checks for Networks that produce batched blocks (#2005)
- Update `@willsoto/nestjs-prometheus` version to `5.4.0` (#2012)

### Changed
- Move more code from node to node-core. Including configure module, workers (#1797)
- Update api service generics to support multiple block types (#1968)
- UnfinalizedBlocksService: make private methods protected to allow custom fork detection (#2009)
- Update fetching blocks to use moving window rather than batches (#2000)

### Added
- Project upgrades feature and many other changes to support it (#1797)
- `skipBlock` option to NodeConfig (#1968)
- `getByFields` to store (#1993)
- `getPoiBlocksBefore` method to PoiModel so we can get recent blocks with operations (#2009)

## [4.2.3] - 2023-08-17
### Fixed
- delay getPoiBlocksByRange when fully synced, fixes the high CPU usage issue (#1952)

## [4.2.2] - 2023-08-16
### Fixed
- Fix modulo filter wrongful block queueing (#1944)

## [4.2.1] - 2023-08-11
### Fixed
- Bump with `@subql/types` package, fix missing `unsafeApi`. (#1935)

## [4.2.0] - 2023-08-10
### Added
- Added primary network endpoint that is always used from connection pool unless it fails (#1927)

## [4.1.0] - 2023-08-04
### Fixed
- Fix poi operationHash and miss poi blocks (#1917)
- Sync @subql/apollo-links to 0.5.8, fix consuming cached token issue

### Changed
- moved `indexBlock` to base `TestingService` (#1913)
- Simplify connection pool logic (#1915)

## [4.0.1] - 2023-07-31
### Fixed
- Update license (#1891)
- Performance scoring fix (#1895)
- Fix mmrQuery should always read mmr leaf length from Db (#1900).

## [4.0.0] - 2023-07-17
### Changed
- **Breaking**: Inti DB schema manually during test run (#1870)

### Fixed
- Updated `@subql/apollo-links` to 0.5.3 for bug fixes. (#1886)
- Establish common connection pool state among workers using `ConnectionPoolStateManager` (#1829)

## [3.1.2] - 2023-07-11
### Fixed
- Fix `TestingService` to run tests in seperate application contexts (#1870)
- Cache race condition when flushing cache and getting data (#1873)
- Various improvements for POI feature: (#1869)
  - Benchmarking mmr processing
  - Improve performance when initialize mmr service, find the latest mmr height in Poi table by record it in `_metadata` table
  - Correct mmr query directly from Db rather than cache

## [3.1.1] - 2023-07-06
### Fixed
- Fixed Poi table missing mmr, due to incorrectly merged data from Db and cache. (#1871)

## [3.1.0] - 2023-07-04
### Added
- Configurable limit to the store cache size, this will cause indexing to wait for the cache to be flushed. This resolves an issue where OOM errors happen. (#1859)

## [3.0.0] - 2023-06-26
### Changed
- Added `pgMmrCacheService` to use independent Db connection, now mmr cache flush by itself. (#1828)
- Update meta exports to require `MmrQueryController` and move code from node core (#1823)
- Switch from node-fetch to cross-fetch. [See apollo issue for more](https://github.com/apollographql/apollo-client/issues/4857)

### Fixed
- Not being able to test with null/undefined values on entities (#1809)

### Fixed
- Fix reconnection issues in connection pool

## [2.6.0] - 2023-06-19
### Changed
- upgrade @subql/apollo-links (#1801)

## [2.5.1] - 2023-06-16
### Fixed
- Fixed meta service missing construct, align blockHeight update with store cache flush interval (#1804)

## [2.5.0] - 2023-06-15
### Added
- Implemented load balancing for multiple endpoints, with distribution based on endpoint performance (#1657)
- Introduced a suspension mechanism for rate-limited endpoints using exponential backoff to regulate usage (#1657)

## [2.4.5] - 2023-06-09
### Changed
- Use @subql/x-sequelize in order support cockroach (#1791)

### Fixed
- Base58 encoding check for POI (#1788)
- Fix project \_startHeight been blocked by poiSync (#1792)

## [2.4.4] - 2023-06-07
### Fixed
- Fixed various issue for mmr (#1787)

## [2.4.3] - 2023-06-02
### Fixed
- Fixed mmr missing node due to cache lock (#1784)

## [2.4.2] - 2023-06-01
### Changed
- Cache MMR leaf length and flush with rest of db, enable more mmr logging (#1782)

### Fixed
- Fix jump buffer height issue (#1781)
- Error if testing entitiy not found (#1766)

## [2.4.1] - 2023-05-31
### Fixed
- Sync flushing MMR potentially getting corrupt (#1777)

## [2.4.0] - 2023-05-30
### Added
- Add cache layer to postgres mmr db (#1762)
- Support for block hashes with base64 format for POI (#1761)

### Changed
- Update vm2 past problimatic version (#1770)
- Add optional root option to config (#1771)

## [2.3.1] - 2023-05-26
### Fixed
- Improve mmr error and expose ready status (#1752)
- Fix subcommand could escape issue, setup profiler at application init (#1755)

## [2.3.0] - 2023-05-24
### Fixed
- Fix datasource processors base filters not working (#1745)

### Added
- Support for base58 blockhashes with POI (#1750)
- Allow url in sandbox and set URL global (#1747)
- Log for unfound mappingHandlers and list available ones (#1742)

## [2.2.2] - 2023-05-19
### Fixed
- Fix project service init failing due to start height being 0 (#1735)
- No longer intialize store and indexer inside testing service (#1734)
- Fix poi read leaf height error under cockroach (#1733)
- Ensure min start height to be 1, even if set to 0 (#1737)
- Upgrade apollo link package (#1739)

### Changed
- allow dictionary when only --dictionaryResolver is enabled (#1730)
- Improve error messages (#1729)
- Deprecate project id from poi table, track deployment in metadata (#1696)

## [2.2.1] - 2023-05-17
### Fixed
- CockroachDB upsert performance issues (#1723)
- Exiting if dictionary-resolver fails (#1721)
- Typo in multi-chain logging message (#1722)

## [2.2.0] - 2023-05-16
### Added
- Worker threads support for unfinalized blocks (#1695)

### Fixed
- Logging historical enabled with cockroach db (#1715)
- Non-historical flushing order (#1711)
- Filtering arguments to include datasoruce (#1703)
- Not logging dictionary start height check (#1700)

### Changed
- Default matcher from insensitive to sensitive casing (#1706)

## [2.1.3] - 2023-05-12
### Fixed
- Fix app could fail to start, due to flush before metadata repo been set (#1688)

## [2.1.2] - 2023-05-11
### Fixed
- Fix metadata check, allow base indexer manager to parse abis with ethereum (#1682)

### Changed
- Move validate function to common (#1683)

### Added
- Inject the chain id into sandboxes (#1684)

## [2.1.1] - 2023-05-11
### Fixed
- Extract dictionary meta validation so it can be overridden (#1679)

## [2.1.0] - 2023-05-10
### Added
- Added interval for flushing the cache. (#1670)
- `bulkRemove` method on the store. (#1666)
- Ability to regenerate MMR (#1664)
- Ability to migrade MMR from file based db to postgres db and vice versa (#1618)

### Changed
- Move more chain agnostic code form node. (#1658) (#1659)
- Move any polkadot imports to utils package. (#1653)

### Fixed
- POI Cache issues (#1660)
- `store.getOneByField` with historical and index (#1667)
- Store cache threshold not including removed items (#1675)

## [2.0.2] - 2023-04-27
### Changed
- Deprecate `localMode` (#1648)

## [2.0.1] - 2023-04-27
### Fixed
- Fix ApiService abstract class, improve getting all DS (#1638)
- Fix assertion error and pk index type (#1641)
- Fix tests (#1640)

## [2.0.0] - 2023-04-20
### Changed
- Major release 2.0.0, align with other package versions
- Update metadata when dictionary skips large number of blocks (#1577)

### Added
- Added StoreCache service and various other improvements (#1561)
- Added TestingService (#1584)

### Fixed
- Enable Typescript strict setting and improve code quality (#1625)
- Fixed enum not being included in POI (#1561)
- Fixed when Poi block offset 0, it could get updated when app restart (#1459)
- Fixed index name too long issue (#1599)
- Fixed dictionary validation issues and improve error messages (#1561)

## [1.11.3] - 2023-04-17
### Fixed
- Improve log, update progress string (#1612)

## [1.11.2] - 2023-04-05
### Fixed
- Compute block size one property at a time to prevent RangeError
- Upgrade @subql/apollo-link version

## [1.11.1] - 2023-03-30
### Changed
- Change to support multiple endpoints (#1551)

### Fixed
- Fix previous release 1.11.0 failed

## [1.11.0] - 2023-03-29
### Added
- Add SmartBatchService and BlockSizeBuffer (#1506)
- Handle bigint in json.stringify (#1562)
- Generate sourcemap for projects (#1569)
- Update polkadot api to 10.1.4 (#1580)

### Fixed
- Fix enum under schema not being escaped (#1555)
- Remove blocking in process queueing (#1572)

### Changed
- Use `performance.now` instead of date for profiler. (#1549)
- Rename `--sponsored-dictionary` to `--dictionary-resolver` (#1559)

## [1.10.0] - 2023-03-06
### Fixed
- fix issue store getByField limit could potentially excess config limit (#1529)

### Changed
- Move enum under schema (#1527)
- Deprecate exclude constraint (#1543)

## [1.9.0] - 2023-02-21
### Added
- add blockTime to NodeConfig (#1501)

### Changed
- Support array type in dictionary queries (#1510)

## [1.8.0] - 2023-01-23
### Added
- Add validation of dictionary with start height (#1473)
- `Store` add count for entity (#1480)

### Fixed
- Fix custom metadata keys not being applied (#1496)

## [1.7.1] - 2022-12-22
### Fixed
- Fix trigger function name too long (#1469)

## [1.7.0] - 2022-12-19
### Fixed
- Workers: Fix SequelizeDatabaseError - tuple concurrently updated (#1458)
- Handle `bulkUpdate` when fields are undefined with historical indexing (#1463)

### Added
- Add start height to project metadata (#1456)

## [1.6.0] - 2022-12-06
### Added
- Support for `bypassBlocks` (#1435)

## [1.5.1] - 2022-11-30
### Fixed
- Fixed enum name (#1441)

## [1.5.0] - 2022-11-23
### Added
- Dictionary auth link integration (#1411)
- Support multi-chain indexing (#1375)

### Changed
- Move enum name generation method to node-core (#1427)

## [1.4.1] - 2022-11-15
### Fixed
- Hot fix for hot schema reload (#1404)

## [1.4.0] - 2022-11-15
### Added
- Support for hot schema reload. (#1401)
- Support for distinct query plugin. (#1274)

## [1.3.3] - 2022-11-09
### Added
- Added retry method for handle fetch errors (#1386)

## [1.3.2] - 2022-11-08
### Fixed
- Fix missing sequelize sync (#1389)

## [1.3.1] - 2022-11-08
### Fixed
- Remove sequelize alter table (#1387)

## [1.3.0] - 2022-11-07
### Fixed
- Improve dictionary query by filter with data sources start block. (#1371)

## [1.2.0] - 2022-10-28
### Added
- Support for unfinalized blocks. (#1308)

## [1.1.0] - 2022-10-27
### Changed
- Update to `@polkadot/api@9.4.2`/ (#1356)
- Backport dictionary service features from Algorand. (#1346)

## [1.0.1] - 2022-10-11
### Added
- Common code from sandbox and dictionary. (#1345)

## [1.0.0] - 2022-10-10
### Removed
- `Subqueries` database table. (#1340)

## [0.1.3] - 2022-10-06
### Changed
- Update IPFS endpoints. (#1337)

### Fixed
- Benchmark info not being logged. (#1138)

## [0.1.2] - 2022-09-27
### Changed
- Moved `yargs` file from `node-core` to `node`. (#1281)
- Update `sequelize`. (#1311)

## [0.1.1] - 2022-08-26
### Fixed
- Imports not being relative (#1268)

## [0.1.0] - 2022-08-26
### Changed
- Move blockchain agnostic code from `node` to `node-core` package. (#1222)

[Unreleased]: https://github.com/subquery/subql/compare/node-core/4.2.3...HEAD
[4.2.3]: https://github.com/subquery/subql/compare/node-core/4.2.2...node-core/4.2.3
[4.2.2]: https://github.com/subquery/subql/compare/node-core/4.2.1...node-core/4.2.2
[4.2.1]: https://github.com/subquery/subql/compare/node-core/4.2.0...node-core/4.2.1
[4.2.0]: https://github.com/subquery/subql/compare/node-core/4.1.0...node-core/4.2.0
[4.1.0]: https://github.com/subquery/subql/compare/node-core/4.0.1...node-core/4.1.0
[4.0.1]: https://github.com/subquery/subql/compare/node-core/4.0.0...node-core/4.0.1
[4.0.0]: https://github.com/subquery/subql/compare/node-core/3.1.2...node-core/4.0.0
[3.1.2]: https://github.com/subquery/subql/compare/node-core/3.1.1...node-core/3.1.2
[3.1.1]: https://github.com/subquery/subql/compare/node-core/3.1.0...node-core/3.1.1
[3.1.0]: https://github.com/subquery/subql/compare/node-core/3.0.0...node-core/3.1.0
[3.0.0]: https://github.com/subquery/subql/compare/node-core/2.6.0...node-core/3.0.0
[2.6.0]: https://github.com/subquery/subql/compare/node-core/2.5.1...node-core/2.6.0
[2.5.1]: https://github.com/subquery/subql/compare/node-core/2.5.0...node-core/2.5.1
[2.5.0]: https://github.com/subquery/subql/compare/node-core/2.4.5...node-core/2.5.0
[2.4.5]: https://github.com/subquery/subql/compare/node-core/2.4.4...node-core/2.4.5
[2.4.4]: https://github.com/subquery/subql/compare/node-core/2.4.3...node-core/2.4.4
[2.4.3]: https://github.com/subquery/subql/compare/node-core/2.4.2...node-corev2.4.3
[2.4.2]: https://github.com/subquery/subql/compare/node-core/2.4.1...node-core/2.4.2
[2.4.1]: https://github.com/subquery/subql/compare/node-core/2.4.0...node-core/2.4.1
[2.4.0]: https://github.com/subquery/subql/compare/node-core/2.3.1...node-core/2.4.0
[2.3.1]: https://github.com/subquery/subql/compare/node-core/2.3.0...node-core/2.3.1
[2.3.0]: https://github.com/subquery/subql/compare/node-core/2.2.2...node-core/2.3.0
[2.2.2]: https://github.com/subquery/subql/compare/node-core/2.2.1...node-core/2.2.2
[2.2.1]: https://github.com/subquery/subql/compare/node-core/2.2.0...node-core/2.2.1
[2.2.0]: https://github.com/subquery/subql/compare/node-core/2.1.2...node-core/2.2.0
[2.1.3]: https://github.com/subquery/subql/compare/node-core/2.1.2...node-core/2.1.3
[2.1.2]: https://github.com/subquery/subql/compare/node-core/2.1.1...node-core/2.1.2
[2.1.1]: https://github.com/subquery/subql/compare/node-core/2.1.0...node-core/2.1.1
[2.1.0]: https://github.com/subquery/subql/compare/node-core/2.0.2...node-core/2.1.0
[2.0.2]: https://github.com/subquery/subql/compare/node-core/2.0.1...node-core/2.0.2
[2.0.1]: https://github.com/subquery/subql/compare/node-core/2.0.0...node-core/2.0.1
[2.0.0]: https://github.com/subquery/subql/compare/node-core/1.11.3..node-core/2.0.0
[1.11.3]: https://github.com/subquery/subql/compare/node-core/1.11.2...node-core/1.11.3
[1.11.2]: https://github.com/subquery/subql/compare/node-core/1.11.1...node-core/1.11.2
[1.11.1]: https://github.com/subquery/subql/compare/node-core/1.11.0...node-core/1.11.1
[1.11.0]: https://github.com/subquery/subql/compare/node-core/1.10.0...node-core/1.11.0
[1.10.0]: https://github.com/subquery/subql/compare/node-core1.9.0/...node-core/1.10.0
[1.9.0]: https://github.com/subquery/subql/compare/node-core/1.8.0...node-core/1.9.0
[1.8.0]: https://github.com/subquery/subql/compare/node-core/1.7.1...node-core/1.8.0
[1.7.1]: https://github.com/subquery/subql/compare/node-core/1.7.0...node-core/1.7.1
[1.7.0]: https://github.com/subquery/subql/compare/node-core/1.6.0...node-core/1.7.0
[1.6.0]: https://github.com/subquery/subql/compare/node-core/1.5.1...node-core/1.6.0
[1.5.1]: https://github.com/subquery/subql/compare/node-core/1.5.0...node-core/1.5.1
[1.5.0]: https://github.com/subquery/subql/compare/node-core/1.4.1...node-core/1.5.0
[1.4.1]: https://github.com/subquery/subql/compare/node-core/1.4.0...node-core/1.4.1
[1.4.0]: https://github.com/subquery/subql/compare/node-core/1.3.3...node-core/1.4.0
[1.3.3]: https://github.com/subquery/subql/compare/node-core/1.3.2...node-core/1.3.3
[1.3.2]: https://github.com/subquery/subql/compare/node-core/1.3.1...node-core/1.3.2
[1.3.1]: https://github.com/subquery/subql/compare/node-core/1.3.0...node-core/1.3.1
[1.3.0]: https://github.com/subquery/subql/compare/node-core/1.2.0...node-core/1.3.0
[1.2.0]: https://github.com/subquery/subql/compare/node-core/1.1.0...node-core/1.2.0
[1.1.0]: https://github.com/subquery/subql/compare/node-core/1.0.1...node-core/1.1.0
[1.0.1]: https://github.com/subquery/subql/compare/node-core/1.0.0...node-core/1.0.1
[1.0.0]: https://github.com/subquery/subql/compare/node-core/0.1.3...node-core/1.0.0
[0.1.3]: https://github.com/subquery/subql/compare/node-core/0.1.2...node-core/0.1.3
[0.1.2]: https://github.com/subquery/subql/compare/node-core/0.1.1...node-core/0.1.2
[0.1.1]: https://github.com/subquery/subql/compare/node-core/0.1.0...node-core/0.1.1
[0.1.0]: https://github.com/subquery/subql/creleases/tag/0.1.0
