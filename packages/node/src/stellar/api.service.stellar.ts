// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StellarProjectNetworkConfig } from '@subql/common-stellar';
import {
  ApiService,
  ConnectionPoolService,
  getLogger,
  IBlock,
  exitWithError,
  NodeConfig,
} from '@subql/node-core';
import { IEndpointConfig } from '@subql/types-core';
import {
  StellarBlockWrapper,
  SubqlDatasource,
  IStellarEndpointConfig,
} from '@subql/types-stellar';
import {
  SubqueryProject,
  dsHasSorobanEventHandler,
} from '../configure/SubqueryProject';
import { StellarApiConnection } from './api.connection';
import { StellarApi } from './api.stellar';
import SafeStellarProvider from './safe-api';
import { SorobanServer } from './soroban.server';

const logger = getLogger('api');

@Injectable()
export class StellarApiService extends ApiService<
  StellarApi,
  SafeStellarProvider,
  IBlock<StellarBlockWrapper>[],
  StellarApiConnection,
  IStellarEndpointConfig
> {
  private nodeConfig: NodeConfig;
  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    connectionPoolService: ConnectionPoolService<StellarApiConnection>,
    eventEmitter: EventEmitter2,
    nodeConfig: NodeConfig,
  ) {
    super(connectionPoolService, eventEmitter);
    this.nodeConfig = nodeConfig;
  }

  async init(): Promise<StellarApiService> {
    let network: StellarProjectNetworkConfig;
    try {
      network = this.project.network;
    } catch (e) {
      exitWithError(new Error(`Failed to init api`, { cause: e }), logger);
    }

    if (this.nodeConfig.primaryNetworkEndpoint) {
      const [endpoint, config] = this.nodeConfig.primaryNetworkEndpoint;
      (network.endpoint as Record<string, IEndpointConfig>)[endpoint] = config;
    }

    const sorobanEndpoint: string | undefined = network.sorobanEndpoint;

    if (!network.sorobanEndpoint && sorobanEndpoint) {
      //update sorobanEndpoint from parent project
      this.project.network.sorobanEndpoint = sorobanEndpoint;
    }

    if (
      dsHasSorobanEventHandler([
        ...this.project.dataSources,
        ...(this.project.templates as SubqlDatasource[]),
      ]) &&
      !sorobanEndpoint
    ) {
      throw new Error(
        `Soroban network endpoint must be provided for network. chainId="${this.project.network.chainId}"`,
      );
    }

    const { protocol } = new URL(sorobanEndpoint);
    const protocolStr = protocol.replace(':', '');

    const sorobanClient = sorobanEndpoint
      ? new SorobanServer(sorobanEndpoint, {
          allowHttp: protocolStr === 'http',
        })
      : undefined;

    await this.createConnections(network, (endpoint, config) =>
      StellarApiConnection.create(
        endpoint,
        this.fetchBlockBatches,
        sorobanClient,
        config,
      ),
    );

    return this;
  }

  get api(): StellarApi {
    return this.unsafeApi;
  }

  safeApi(height: number): SafeStellarProvider {
    const maxRetries = 5;

    const handler: ProxyHandler<SafeStellarProvider> = {
      get: (target, prop, receiver) => {
        const originalMethod = target[prop as keyof SafeStellarProvider];
        if (typeof originalMethod === 'function') {
          return async (
            ...args: any[]
          ): Promise<ReturnType<typeof originalMethod>> => {
            let retries = 0;
            let currentApi = target;
            let throwingError: Error | undefined;

            while (retries < maxRetries) {
              try {
                return await originalMethod.apply(currentApi, args);
              } catch (error: any) {
                logger.warn(
                  `Request failed with api at height ${height} (retry ${retries}): ${error.message}`,
                );
                throwingError = error;
                currentApi = this.unsafeApi.getSafeApi(height);
                retries++;
              }
            }

            logger.error(
              `Maximum retries (${maxRetries}) exceeded for api at height ${height}`,
            );
            if (!throwingError) {
              throw new Error('Failed to make request, maximum retries failed');
            }
            throw throwingError;
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    };

    return new Proxy(this.unsafeApi.getSafeApi(height), handler);
  }

  private async fetchBlockBatches(
    api: StellarApi,
    batch: number[],
  ): Promise<IBlock<StellarBlockWrapper>[]> {
    return api.fetchBlocks(batch);
  }
}
