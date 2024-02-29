// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export interface V2MetadataFilters {
  [key: string]: string[];
}

export interface RawFatDictionaryResponseData<RFB> {
  blocks: RFB[]; //raw fat blocks
  BlockRange: number[];
  GenesisHash: string;
}

export interface DictionaryV2Metadata {
  start: number;
  end: number;
  genesisHash: string;
  filters: V2MetadataFilters;
  supported: string[];
}

export type DictionaryV2QueryEntry = Record<string, object>;
