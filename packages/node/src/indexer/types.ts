// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { StellarBlockWrapper } from '@subql/types-stellar';

export type BestBlocks = Record<number, string>;

export function getBlockSize(block: StellarBlockWrapper): number {
  const {
    failed_transaction_count,
    operation_count,
    successful_transaction_count,
    tx_set_operation_count,
  } = block.block;
  return (
    (tx_set_operation_count ??
      successful_transaction_count + failed_transaction_count) + operation_count
  );
}
