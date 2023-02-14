// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {blake2AsHex} from '@polkadot/util-crypto';

export const METADATA_REGEX = /^_metadata$/;

export const MULTI_METADATA_REGEX = /^_metadata_[a-zA-Z0-9-]+$/;

export function getMetadataTableName(chainId: string): string {
  const hash = blake2AsHex(chainId, 64);
  return `_metadata_${hash}`.substring(0, 63); // 63 chars is the max postgres database table name length
}

// Hash names of SQL functions, triggers, channels to ensure it does not exceed the char limit
export function hashName(schema: string, type: string, tableName: string): string {
  // Postgres identifier limit is 63 bytes (chars)
  return blake2AsHex(`${schema}_${tableName}_${type}`, 64).substring(0, 63);
}
