// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {parseChainTypes, SubstrateProjectManifestVersioned} from '@subql/common-substrate';
import yaml from 'js-yaml';
import {Context} from '../context';
import {Rule, RuleType} from './rule';

export default class RequireValidChainTypes implements Rule {
  type = RuleType.Schema;
  name = 'require-valid-chaintypes';
  description = 'Specified chain types file must match the polkadot RegistryTypes';

  async validateSubstrate(schema: SubstrateProjectManifestVersioned, ctx: Context): Promise<boolean> {
    if (schema.isV0_0_1) return true;

    if (schema.isV0_2_0) {
      const schemaV0_2_0 = schema.asV0_2_0;

      // No chain types to validate
      if (!schemaV0_2_0.network.chaintypes?.file) return true;

      //TODO, skip validate if chaintype is js format for now
      const {ext} = path.parse(schemaV0_2_0.network.chaintypes.file);
      if (ext === '.js' || ext === '.cjs') return true;

      try {
        const rawChainTypes = yaml.load(await ctx.reader.getFile(schemaV0_2_0.network.chaintypes.file));
        parseChainTypes(rawChainTypes);
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  async validate(ctx: Context): Promise<boolean> {
    if (ctx.data.schema instanceof SubstrateProjectManifestVersioned) {
      return this.validateSubstrate(ctx.data.schema as SubstrateProjectManifestVersioned, ctx);
    } else {
      return true;
    }
  }
}
