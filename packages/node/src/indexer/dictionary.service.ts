// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  NodeConfig,
  DictionaryService as CoreDictionaryService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';

@Injectable()
export class DictionaryService
  extends CoreDictionaryService
  implements OnApplicationShutdown
{
  constructor(protected project: SubqueryProject, nodeConfig: NodeConfig) {
    super(project.network.dictionary, nodeConfig);
  }
}
