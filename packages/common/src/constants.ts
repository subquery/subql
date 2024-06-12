// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// APP API PORT
export const DEFAULT_PORT = 3000;

//IPFS
export const IPFS_READ = 'https://unauthipfs.subquery.network';
export const IPFS_WRITE = 'https://authipfs.subquery.network';
export const IPFS_NODE_ENDPOINT = `${IPFS_READ}/ipfs/api/v0`;
export const IPFS_WRITE_ENDPOINT = `${IPFS_WRITE}/ipfs/api/v0`;
export const IPFS_REGEX = /^ipfs:\/\//i;

// MANIFEST
export const RUNNER_REGEX = /(\^?)(\d|x|\*)+\.(\d|x|\*)+\.(\d|x|\*)+/;

// POI
export const POI_AWAIT_TIME = 2; // seconds

// NETWORK
export enum NETWORK_FAMILY {
  substrate = 'Substrate',
  cosmos = 'Cosmos',
  algorand = 'Algorand',
  ethereum = 'Ethereum',
  near = 'Near',
  stellar = 'Stellar',
  concordium = 'Concordium',
}

export const runnerMapping = {
  '@subql/node': NETWORK_FAMILY.substrate,
  '@subql/node-substrate': NETWORK_FAMILY.substrate,
  '@subql/node-cosmos': NETWORK_FAMILY.cosmos,
  '@subql/node-algorand': NETWORK_FAMILY.algorand,
  '@subql/node-ethereum': NETWORK_FAMILY.ethereum,
  '@subql/node-near': NETWORK_FAMILY.near,
  '@subql/node-stellar': NETWORK_FAMILY.stellar,
  '@subql/node-concordium': NETWORK_FAMILY.concordium,
};

// DATABASE TYPE
export enum SUPPORT_DB {
  cockRoach = 'CockroachDB',
  postgres = 'PostgreSQL',
}

// DATABASE ERROR REGEX
export const CONNECTION_SSL_ERROR_REGEX = 'not support SSL';

// BLOCK BATCH SYNC between POI MMR <-> Filebased/Postgres MMR
export const RESET_MMR_BLOCK_BATCH = 1000;

// Default Model fetch range
export const DEFAULT_FETCH_RANGE = 100;

// RUNNER ERROR REGEX
export const RUNNER_ERROR_REGEX = 'property runner.node.name has failed the following constraints: equals';
