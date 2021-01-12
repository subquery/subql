// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ApiOptions } from '@polkadot/api/types';
import { SubqueryProject } from '../configure/project.model';

@Injectable()
export class ApiService {
  private api: Promise<ApiPromise>;
  constructor(protected project: SubqueryProject) {
    const { network } = this.project;
    const apiOption: ApiOptions = {
      provider: new WsProvider(network.endpoint),
    };
    if (network.customTypes) {
      apiOption.types = network.customTypes;
    }
    this.api = ApiPromise.create(apiOption);
  }

  async getApi(): Promise<ApiPromise> {
    return this.api;
  }
}
