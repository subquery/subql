// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Context} from '../context';
import {Rule, RuleType} from './rule';

export class RequireValidRunner implements Rule {
  type = RuleType.Schema;
  name = 'require-valid-runner';
  description = '`runner` must match the `datasource`';

  validate(ctx: Context): boolean {
    const schema = ctx.data.schema;
    if (schema.isV1_0_0) {
      try {
        schema.toDeployment();
      } catch (e) {
        return false;
      }
    }
    return true;
  }
}
