// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {isCustomDs, SubstrateProjectManifestVersioned} from '@subql/common-substrate';
import {SubqlDatasourceProcessor, SubqlNetworkFilter} from '@subql/types';
import {Context} from '../context';
import {Rule, RuleType} from './rule';

export class RequireCustomDsValidation implements Rule {
  type = RuleType.Schema;
  name = 'require-custom-ds-validation';
  description = 'custom datasources mast pass processor validation';

  validate(ctx: Context): boolean {
    const schema = ctx.data.schema;

    if (
      (schema as SubstrateProjectManifestVersioned).isV0_2_0 ||
      (schema as SubstrateProjectManifestVersioned).isV0_2_1
    ) {
      for (const customDs of (schema as SubstrateProjectManifestVersioned).dataSources.filter(isCustomDs)) {
        const processor: SubqlDatasourceProcessor<string, SubqlNetworkFilter> = require(path.resolve(
          ctx.data.projectPath,
          customDs.processor.file
        )).default;

        if (customDs.kind !== processor.kind) {
          ctx.logger.log(`ds kind (${customDs.kind}) doesnt match processor (${processor.kind})`);
          return false;
        }

        for (const handler of customDs.mapping.handlers) {
          if (!(handler.kind in processor.handlerProcessors)) {
            ctx.logger.log(`ds kind ${handler.kind} not one of ${Object.keys(processor.handlerProcessors).join(', ')}`);
            return false;
          }
        }

        try {
          customDs.mapping.handlers.map((handler) =>
            processor.handlerProcessors[handler.kind].filterValidator(handler.filter)
          );
        } catch (e) {
          ctx.logger.log(`Invalid filter for DS: ${e.message}`);
          return false;
        }
      }
    }

    return true;
  }
}
