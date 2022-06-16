// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BlockWrapper} from '../interfaces';

export type AlgorandBlock = Record<string, any>;
export type AlgorandTransaction = Record<string, any>; // TODO
export type AlgorandEvent = Record<string, any>; // TODO

export type AlgorandBlockWrapper = BlockWrapper<AlgorandBlock, AlgorandTransaction, AlgorandEvent>;
