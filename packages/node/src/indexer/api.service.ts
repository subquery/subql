// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubqueryProject } from '../configure/project.model';

@Injectable()
export class ApiService implements OnModuleInit {
  private api: Promise<ApiPromise>;
  constructor(protected project: SubqueryProject) {
    this.api = ApiPromise.create({
      provider: new WsProvider(this.project.endpoint),
    });
  }

  async onModuleInit(): Promise<void> {
    // this.api = await ApiPromise.create({
    //   provider: new WsProvider(this.project.endpoint),
    // });
  }

  async getApi(): Promise<ApiPromise> {
    return this.api;
  }
}
