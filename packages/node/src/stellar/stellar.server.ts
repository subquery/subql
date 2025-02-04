// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Horizon } from '@stellar/stellar-sdk';
import { getLogger } from '@subql/node-core';

const logger = getLogger('stellar-server');

export interface StellarNetwork {
  network_passphrase: string;
  history_latest_ledger: string;
  name: string;
}

export class StellarServer extends Horizon.Server {
  async getNetwork(): Promise<StellarNetwork> {
    const network: StellarNetwork = (
      await Horizon.AxiosClient.get(new URL(this.serverURL as any).toString())
    ).data;
    return network;
  }
}
