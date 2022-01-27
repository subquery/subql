// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
