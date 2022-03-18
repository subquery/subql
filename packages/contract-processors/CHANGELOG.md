# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.3] - 2022-02-28
### Added
- Support frontier evm processor (#812)

## [0.5.2] - 2022-02-25
### Fixed
- Fix moonbeam filters post EIP1559 (#825)

## [0.5.1] - 2022-02-23
### Added
- Add support for EIP1599 transactions to Moonbeam contract processor (#814)

## [0.5.0] - 2022-02-09
### Added
- Add support for ethereum json artifacts instead of abi (#790)
### Changed
- Update `moonbeam-types-bundle` and `polkadot/api` (#773) 
### Fixed
- Lowercase moonbeam dictionary query fields (#792)

## [0.4.1] - 2022-01-13
### Changed
- Version bump with subql/types 

## [0.4.0] - 2021-12-16
### Added
- Support dictionary for custom datasource (#686)
- Flyby fix, adjust timeout for test (#640) 

## [0.3.2] - 2021-11-23
### Fixed
- Lock down class-transformer version (#654)
- Add blockTimestamp to MoonbeamEvent (#659)

## [0.3.1] - 2021-11-19
### Changed
- Reduce jest mem in Moonbeam test(#613)

## [0.3.0] - 2021-11-03
### Fixed
- Fix evm tx's `from` field (#590)
### Changed
- Bump dependencies (#584)
- Moonbeam EVM improvement (#593)

## [0.2.0] - 2021-10-31
### Fixed
- Case sensitivity when compare hash strings (#581)
- Handle tx without ethereum(Executed) log (#583)

## 0.1.0 - 2021-10-31
### Added
- Basic implementation for moonbeam evm processor (#547)

[Unreleased]: https://github.com/subquery/subql/compare/contract-processors/0.5.3...HEAD
[0.5.3]: https://github.com/subquery/subql/compare/contract-processors/0.5.2...contract-processors/0.5.3
[0.5.2]: https://github.com/subquery/subql/compare/contract-processors/0.5.1...contract-processors/0.5.2
[0.5.1]: https://github.com/subquery/subql/compare/contract-processors/0.5.0...contract-processors/0.5.1
[0.5.0]: https://github.com/subquery/subql/compare/contract-processors/0.4.1...contract-processors/0.5.0
[0.4.1]: https://github.com/subquery/subql/compare/contract-processors/0.4.0...contract-processors/0.4.1
[0.4.0]: https://github.com/subquery/subql/compare/contract-processors/0.3.1...contract-processors/0.4.0
[0.3.1]: https://github.com/subquery/subql/compare/contract-processors/0.3.0...contract-processors/0.3.1
[0.3.0]: https://github.com/subquery/subql/compare/contract-processors/0.2.0...contract-processors/0.3.0

