// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const METADATA_REGEX = /^_metadata$/;

export const MULTI_METADATA_REGEX = /^_metadata_[a-zA-Z0-9-]+$/;

export function getMetadataTableName(chainId: string): string {
  // 63 chars is the max postgres database table name length
  return `_metadata${chainId ? `_${chainId.substring(0, 63)}` : ''}`;
}
