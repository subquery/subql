// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {IPFS_REGEX} from '@subql/common';
import {parseChainTypes, SubstrateProjectManifestVersioned} from '@subql/common-substrate';
import yaml from 'js-yaml';
import {Context} from '../context';
import {Rule, RuleType} from './rule';

export default class RequireValidChainTypes implements Rule {
  type = RuleType.Schema;
  name = 'require-valid-chaintypes';
  description = 'Specified chain types file must match the polkadot RegistryTypes';

  async validateSubstrate(schema: SubstrateProjectManifestVersioned, ctx: Context): Promise<boolean> {
    if (schema.isV1_0_0) {
      const schemaV1_0_0 = schema.asV1_0_0;

      // No chain types to validate
      if (!schemaV1_0_0.network.chaintypes?.file) return true;

      //TODO, skip validate if chaintype is js format for now
      if (schemaV1_0_0.network.chaintypes?.file.match(IPFS_REGEX)) return true;
      const {ext} = path.parse(schemaV1_0_0.network.chaintypes.file);
      if (ext === '.js' || ext === '.cjs') return true;

      try {
        const rawChainTypes = yaml.load(await ctx.reader.getFile(schemaV1_0_0.network.chaintypes.file));
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
