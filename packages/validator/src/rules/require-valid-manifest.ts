// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Context} from '../context';
import {Rule, RuleType} from './rule';

export class RequireValidManifest implements Rule {
  type = RuleType.Schema;
  name = 'require-valid-manifest';
  description = '`project.yaml` must match the schema';

  validate(ctx: Context): boolean {
    const schema = ctx.data.schema;

    try {
      schema.validate();
      return true;
    } catch (e) {
      ctx.logger.error(e.message);
      return false;
    }
  }
}
