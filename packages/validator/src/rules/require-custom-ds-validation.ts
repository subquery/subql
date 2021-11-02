// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {SubqlCustomDatasource, SubqlDatasource, SubqlDatasourceProcessor, SubqlNetworkFilter} from '@subql/types';
import {Context} from '../context';
import {Rule, RuleType} from './rule';

function isCustomDs<F extends SubqlNetworkFilter>(ds: SubqlDatasource): ds is SubqlCustomDatasource<string, F> {
  return !!(ds as SubqlCustomDatasource).processor?.file;
}

export class RequireCustomDsValidation implements Rule {
  type = RuleType.Schema;
  name = 'require-custom-ds-validation';
  description = 'custom datasources mast pass processor validation';

  validate(ctx: Context): boolean {
    const schema = ctx.data.schema;

    if (schema.isV0_2_0) {
      for (const customDs of schema.dataSources.filter(isCustomDs)) {
        const processor: SubqlDatasourceProcessor<string, SubqlNetworkFilter> = require(path.join(
          ctx.data.projectPath,
          customDs.processor.file
        )).default;

        if (customDs.kind !== processor.kind) {
          console.log(`ds kind (${customDs.kind}) doesnt match processor (${processor.kind})`);
          return false;
        }

        for (const handler of customDs.mapping.handlers) {
          if (!(handler.kind in processor.handlerProcessors)) {
            console.log('Unsupported DS handler kind');
            return false;
          }
        }

        try {
          customDs.mapping.handlers.map((handler) =>
            processor.handlerProcessors[handler.kind].filterValidator(handler.filter)
          );
        } catch (e) {
          console.log('Invalid filter for DS', e.message);
          return false;
        }
      }
    }

    return true;
  }
}
