// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestVersioned, VersionedProjectManifest} from '@subql/common';
import {Context} from '../context';
import {Rule, RuleType} from './rule';

export class RequireValidManifest implements Rule {
  type = RuleType.Schema;
  name: 'require-valid-manifest';
  description: '`project.yaml` must match the schema';

  validate(ctx: Context): boolean {
    const schema = ctx.data.schema;

    try {
      const project = new ProjectManifestVersioned(schema as VersionedProjectManifest);
      project.validate();
      return true;
    } catch (e) {
      return false;
    }
  }
}
