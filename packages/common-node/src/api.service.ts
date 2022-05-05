// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
import {ApiWrapper} from '@subql/types-avalanche';
import { NetworkMetadataPayload } from './events';

@Injectable()
export abstract class ApiService {
  networkMeta: NetworkMetadataPayload;

  constructor(protected project: any) {}

  abstract init(): Promise<ApiService>;

  abstract get api(): ApiWrapper;
}
