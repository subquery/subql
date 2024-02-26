// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { SubstrateCustomDatasource } from '@subql/types';

export type SubstrateDsInterface = SubstrateCustomDatasource & {
  name?: string;
};
