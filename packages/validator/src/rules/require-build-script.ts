// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Context} from '../context';
import {Rule, RuleType} from './rule';

export class RequireBuildScript implements Rule {
  type = RuleType.PackageJSON;
  name = 'require-build-script';
  description = 'A `build` script in `package.json` is required to compile this SubQuery project';

  validate(ctx: Context): boolean {
    return 'build' in ctx.data.pkg.scripts;
  }
}
