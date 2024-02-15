// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Before conversion
export interface RawFatDictionaryResponseData<RFB> {
  blocks: RFB[]; //raw fat blocks
  BlockRange: number[];
  GenesisHash: string;
}

// After conversion
export interface FatDictionaryResponse<FB> {
  blocks: FB[];
  start: number;
  end: number;
}

export interface DictionaryV2Metadata {
  chain: string;
  start: number;
  end: number;
  genesisHash: string;
  filters: any[];
  supported: string[];
}

export type DictionaryV2QueryEntry = Record<string, object>;
