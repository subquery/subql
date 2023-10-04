// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  NodeConfig,
  DictionaryService as CoreDictionaryService,
} from '@subql/node-core';
import EventEmitter2 from 'eventemitter2';
import { SubqueryProject } from '../configure/SubqueryProject';

@Injectable()
export class DictionaryService extends CoreDictionaryService {
  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    eventEmitter: EventEmitter2,
    nodeConfig: NodeConfig,
  ) {
    super(
      project.network.dictionary,
      project.network.chainId,
      nodeConfig,
      eventEmitter,
    );
  }
}
