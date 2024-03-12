// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Header} from '../../indexer';

export type HostUnfinalizedBlocks = {
  unfinalizedBlocksProcess: (header: Header | undefined) => Promise<number | undefined>;
};

export const hostUnfinalizedBlocksKeys: (keyof HostUnfinalizedBlocks)[] = ['unfinalizedBlocksProcess'];
