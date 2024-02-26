// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export interface DictionaryV2Metadata {
  chain: string;
  start: number;
  end: number;
  genesisHash: string;
  filters: any[];
  supported: string[];
}

export type DictionaryV2QueryEntry = Record<string, object>;
