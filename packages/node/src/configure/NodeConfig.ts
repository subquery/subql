// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { IConfig, NodeConfig } from '@subql/node-core';

export interface IEthereumConfig extends IConfig {
  skipTransactions: boolean;
  blockConfirmations: number;
  blockForkReindex: number;
}

export class EthereumNodeConfig extends NodeConfig<IEthereumConfig> {
  /**
   * This is a wrapper around the core NodeConfig to get additional properties that are provided through args or node runner options
   * NOTE: This isn't injected anywhere so you need to wrap the injected node config
   *
   * @example
   * constructor(
   *   nodeConfig: NodeConfig,
   * ) {
   *   this.nodeConfig = new EthereumNodeConfig(nodeConfig);
   * }
   * */
  constructor(config: NodeConfig) {
    // Rebuild with internal config
    super((config as any)._config, (config as any)._isTest);
  }

  get skipTransactions(): boolean {
    return !!this._config.skipTransactions;
  }

  get blockConfirmations(): number {
    return this._config.blockConfirmations;
  }

  get blockForkReindex(): number {
    return this._config.blockForkReindex;
  }
}
