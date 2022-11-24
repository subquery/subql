// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {isCustomDs, SubstrateProjectManifestVersioned} from '@subql/common-substrate';
import {SubstrateDatasourceProcessor, SubstrateNetworkFilter} from '@subql/types';
import {Context} from '../context';
import {Rule, RuleType} from './rule';

export class RequireBypassBlock implements Rule {
  type = RuleType.Schema;
  name = 'require-bypass-block';
  description = 'bypass blocks validation';

  validate(): boolean {
    return true;
  }
}
