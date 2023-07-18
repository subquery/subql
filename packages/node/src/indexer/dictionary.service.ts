// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  NodeConfig,
  DictionaryService as CoreDictionaryService,
} from '@subql/node-core';
import JSON5 from 'json5';
import fetch from 'node-fetch';
import { SubqueryProject } from '../configure/SubqueryProject';

const CHAIN_ALIASES_URL =
  'https://raw.githubusercontent.com/subquery/templates/main/chainAliases.json5';

@Injectable()
export class DictionaryService
  extends CoreDictionaryService
  implements OnApplicationShutdown
{
  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
  ) {
    super(project.network.dictionary, project.network.chainId, nodeConfig);
  }
}
