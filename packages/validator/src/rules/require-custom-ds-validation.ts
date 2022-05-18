// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Context} from '../context';
import {Rule, RuleType} from './rule';

export class RequireCustomDsValidation implements Rule {
  type = RuleType.Schema;
  name = 'require-custom-ds-validation';
  description = 'custom datasources mast pass processor validation';

  validate(ctx: Context): boolean {
    const schema = ctx.data.schema;

    return true;
  }
}
