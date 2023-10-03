// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  DictionaryService as CoreDictionaryService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';

@Injectable()
export class DictionaryService extends CoreDictionaryService {
  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
  ) {
    super(
      project.network.dictionary,
      project.network.chainId,
      nodeConfig,
      eventEmitter,
      ['lastProcessedHeight', 'chain'],
    );
  }
}
