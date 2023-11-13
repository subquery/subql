// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import {
  NodeConfig,
  DictionaryService as CoreDictionaryService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';

@Injectable()
export class DictionaryService extends CoreDictionaryService {
  private constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    dictionaryUrl?: string,
  ) {
    super(
      dictionaryUrl ?? project.network.dictionary,
      project.network.chainId,
      nodeConfig,
      eventEmitter,
      ['lastProcessedHeight', 'chain'],
    );
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
  ): Promise<DictionaryService> {
    const url =
      project.network.dictionary ??
      (await CoreDictionaryService.resolveDictionary(
        NETWORK_FAMILY.cosmos,
        project.network.chainId,
        nodeConfig.dictionaryRegistry,
      ));

    return new DictionaryService(project, nodeConfig, eventEmitter, url);
  }
}
