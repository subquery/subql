// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

//IPFS
export const IPFS_DEV = 'https://interipfs.thechaindata.com';
export const IPFS_PROD = 'https://ipfs.subquery.network';
export const IPFS_NODE_ENDPOINT = `${IPFS_PROD}/ipfs/api/v0`;
export const IPFS_CLUSTER_ENDPOINT = `${IPFS_PROD}/cluster/add`;
export const IPFS_REGEX = /^ipfs:\/\//i;

// MANIFEST
export const RUNNER_REGEX = /(\^?)(\d|x|\*)+\.(\d|x|\*)+\.(\d|x|\*)+/;

//MMR
export const DEFAULT_WORD_SIZE = 32;
export const DEFAULT_LEAF = Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex');
export const MMR_AWAIT_TIME = 2;

//DEPLOYMENT
export const DEFAULT_DEPLOYMENT_TYPE = 'primary';
export const INDEXER_V = 'v1.1.2';
export const QUERY_V = 'v1.1.1';
export const DEFAULT_ENDPOINT = 'wss://polkadot.api.onfinality.io/public-ws';
export const DEFAULT_DICT_ENDPOINT = 'https://api.subquery.network/sq/subquery/polkadot-dictionary';

//PROJECT
export const ROOT_API_URL_DEV = 'https://api.thechaindata.com/';
export const ROOT_API_URL_PROD = 'https://api.subquery.network/';
