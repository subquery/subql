// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {parseChainTypes} from '@subql/common';
import {Context} from '../context';
import {Rule, RuleType} from './rule';

export default class RequireValidChainTypes implements Rule {
  type = RuleType.Schema;
  name = 'require-valid-chaintypes';
  description = 'Specified chain types file must match the polkadot RegistryTypes';

  async validate(ctx: Context): Promise<boolean> {
    if (ctx.data.schema.isV0_0_1) return true;

    const schema = ctx.data.schema.asV0_2_0;

    // No chain types to validate
    if (!schema.network.chaintypes?.file) return true;

    //TODO, skip validate if chaintype is js format for now
    const {ext} = path.parse(schema.network.chaintypes.file);
    if (ext === '.js' || ext === '.cjs') return true;

    try {
      const rawChainTypes = await ctx.reader.getFile(schema.network.chaintypes.file);
      parseChainTypes(rawChainTypes);
      return true;
    } catch (e) {
      return false;
    }
  }
}
