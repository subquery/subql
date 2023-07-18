// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// APP API PORT
export const DEFAULT_PORT = 3000;

//IPFS
export const IPFS_READ = 'https://unauthipfs.subquery.network';
export const IPFS_WRITE = 'https://authipfs.subquery.network';
export const IPFS_NODE_ENDPOINT = `${IPFS_READ}/ipfs/api/v0`;
export const IPFS_CLUSTER_ENDPOINT = `${IPFS_WRITE}/cluster/add`;
export const IPFS_REGEX = /^ipfs:\/\//i;

// MANIFEST
export const RUNNER_REGEX = /(\^?)(\d|x|\*)+\.(\d|x|\*)+\.(\d|x|\*)+/;

//MMR
export const DEFAULT_WORD_SIZE = 32;
export const DEFAULT_LEAF = Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex');
export const MMR_AWAIT_TIME = 2;

// NETWORK
export enum NETWORK_FAMILY {
  substrate = 'Substrate',
  cosmos = 'Cosmos',
  algorand = 'Algorand',
  ethereum = 'Ethereum',
  flare = 'Flare',
  near = 'Near',
}

export const runnerMapping = {
  '@subql/node': NETWORK_FAMILY.substrate,
  '@subql/node-substrate': NETWORK_FAMILY.substrate,
  '@subql/node-cosmos': NETWORK_FAMILY.cosmos,
  '@subql/node-algorand': NETWORK_FAMILY.algorand,
  '@subql/node-ethereum': NETWORK_FAMILY.ethereum,
  '@subql/node-flare': NETWORK_FAMILY.flare,
  '@subql/node-near': NETWORK_FAMILY.near,
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
