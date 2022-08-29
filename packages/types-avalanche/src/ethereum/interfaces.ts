// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BlockWrapper} from '../interfaces';
import { AvalancheBlockFilter, AvalancheTransactionFilter, AvalancheLogFilter, AvalancheResult } from '../avalanche';
import { ethers } from 'ethers';

export type EthereumResult = AvalancheResult;

export type EthereumBlock = ethers.providers.Block;

export type EthereumTransaction = ethers.providers.TransactionResponse & {
    receipt: ethers.providers.TransactionReceipt;
}

export type EthereumLog<T extends EthereumResult = EthereumResult> = ethers.providers.Log & {
    args?: T;
}

export type EthereumBlockWrapper = BlockWrapper<
    EthereumBlock,
    EthereumTransaction,
    EthereumLog,
    AvalancheTransactionFilter,
    AvalancheLogFilter
>;

