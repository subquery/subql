// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { getLogger } from '@subql/node-core';
import { HorizonAxiosClient, Server } from 'stellar-sdk';
import URI from 'urijs';

const logger = getLogger('stellar-server');

export interface StellarNetwork {
  network_passphrase: string;
  history_latest_ledger: string;
}

export class StellarServer extends Server {
  async getNetwork(): Promise<StellarNetwork> {
    const network: StellarNetwork = (
      await HorizonAxiosClient.get(URI(this.serverURL as any).toString())
    ).data;
    return network;
  }
}
