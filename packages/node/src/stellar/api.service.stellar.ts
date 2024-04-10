// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StellarProjectNetwork,
  StellarProjectNetworkConfig,
} from '@subql/common-stellar';
import {
  ApiService,
  ConnectionPoolService,
  NetworkMetadataPayload,
  getLogger,
  IndexerEvent,
  ProjectUpgradeService,
} from '@subql/node-core';
import { StellarBlockWrapper } from '@subql/types-stellar';
import {
  StellarProjectDs,
  SubqueryProject,
  dsHasSorobanEventHandler,
} from '../configure/SubqueryProject';
import { StellarApiConnection } from './api.connection';
import { StellarApi } from './api.stellar';
import SafeStellarProvider from './safe-api';
import { SorobanServer } from './soroban.server';

const logger = getLogger('api');

const MAX_RECONNECT_ATTEMPTS = 5;

@Injectable()
export class StellarApiService extends ApiService<
  StellarApi,
  SafeStellarProvider,
  StellarBlockWrapper[]
> {
  constructor(
    @Inject('ISubqueryProject') private project: SubqueryProject,
    @Inject('IProjectUpgradeService')
    private projectUpgradeService: ProjectUpgradeService,
    connectionPoolService: ConnectionPoolService<StellarApiConnection>,
    eventEmitter: EventEmitter2,
  ) {
    super(connectionPoolService, eventEmitter);
  }

  async init(): Promise<StellarApiService> {
    let network: StellarProjectNetworkConfig;
    try {
      network = this.project.network;
    } catch (e) {
      logger.error(Object.keys(e));
      process.exit(1);
    }

    const sorobanEndpoint: string | undefined =
      network.sorobanEndpoint ??
      (
        this.projectUpgradeService.getProject(Number.MAX_SAFE_INTEGER)
          .network as StellarProjectNetwork
      ).soroban;

    if (!network.sorobanEndpoint && sorobanEndpoint) {
      //update sorobanEndpoint from parent project
      this.project.network.sorobanEndpoint = sorobanEndpoint;
    }

    if (
      dsHasSorobanEventHandler([
        ...this.project.dataSources,
        ...(this.project.templates as StellarProjectDs[]),
      ]) &&
      !sorobanEndpoint
    ) {
      throw new Error(
        `Soroban network endpoint must be provided for network. chainId="${this.project.network.chainId}"`,
      );
    }

    const sorobanClient = sorobanEndpoint
      ? new SorobanServer(sorobanEndpoint)
      : undefined;

    await this.createConnections(
      network,
      (endpoint) =>
        StellarApiConnection.create(
          endpoint,
          this.fetchBlockBatches,
          this.eventEmitter,
          sorobanClient,
        ),
      //eslint-disable-next-line @typescript-eslint/require-await
      async (connection: StellarApiConnection) => {
        const api = connection.unsafeApi;
        return api.getChainId();
      },
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
          return async (...args: any[]) => {
            let retries = 0;
            let currentApi = target;
            let throwingError: Error;

            while (retries < maxRetries) {
              try {
                return await originalMethod.apply(currentApi, args);
              } catch (error) {
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
  ): Promise<StellarBlockWrapper[]> {
    return api.fetchBlocks(batch);
  }
}
