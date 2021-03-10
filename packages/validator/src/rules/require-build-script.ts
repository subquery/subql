// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Context} from '../context';
import {Rule, RuleType} from './rule';

export class RequireBuildScript implements Rule {
  type = RuleType.PackageJSON;

  name = 'require-build-script';

  description = 'the `build` script is required in the package.json file to compile project';

  validate(ctx: Context): boolean {
    return 'build' in ctx.data.pkg.scripts;
  }
}
