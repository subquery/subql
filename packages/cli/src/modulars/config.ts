// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';

export const networkPackages: {[key in NETWORK_FAMILY]: string} = {
  [NETWORK_FAMILY.algorand]: '@subql/common-algorand',
  [NETWORK_FAMILY.concordium]: '@subql/common-concordium',
  [NETWORK_FAMILY.cosmos]: '@subql/common-cosmos',
  [NETWORK_FAMILY.ethereum]: '@subql/common-ethereum',
  [NETWORK_FAMILY.near]: '@subql/common-near',
  [NETWORK_FAMILY.stellar]: '@subql/common-stellar',
  [NETWORK_FAMILY.substrate]: '@subql/common-substrate',
};
