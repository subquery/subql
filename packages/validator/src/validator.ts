// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Reader, ReaderFactory, ReaderOptions} from '@subql/common';
import {ProjectManifestVersioned, VersionedProjectManifest} from '@subql/common-substrate';
import {Context} from './context';
import {Rule, RuleType} from './rules';

export interface Report {
  name: string;
  skipped: boolean;
  description: string;
  valid: boolean;
}

export class Validator {
  private readonly rules: Rule[] = [];

  static async create(location: string, opts?: ReaderOptions): Promise<Validator> {
    return new Validator(await ReaderFactory.create(location, opts), location);
  }
  constructor(private readonly reader: Reader, private readonly location: string) {}

  addRule(...rules: Rule[]): void {
    this.rules.push(...rules);
  }

  async getValidateReports(): Promise<Report[]> {
    const reports: Report[] = [];
    const [pkg, rawSchema] = await Promise.all([this.reader.getPkg(), this.reader.getProjectSchema()]);

    if (!rawSchema) {
      throw new Error('Not a valid SubQuery project, project.yaml is missing');
    }

    reports.push({
      name: 'project-yaml-file',
      description: 'A valid `project.yaml` file must exist in the root directory of the project',
      valid: !!rawSchema,
      skipped: false,
    });

    const schema = new ProjectManifestVersioned(rawSchema as VersionedProjectManifest);

    if (schema.isV0_0_1) {
      reports.push({
        name: 'package-json-file',
        description: 'A valid `package.json` file must exist in the root directory of the project',
        valid: !!pkg,
        skipped: false,
      });
    }

    const ctx: Context = {
      data: {
        projectPath: this.location,
        pkg,
        schema,
      },
      logger: console,
      reader: this.reader,
    };

    for (const r of this.rules) {
      const report = {
        name: r.name,
        description: r.description,
        valid: false,
        skipped: false,
      };
      if ((!pkg && r.type === RuleType.PackageJSON) || (!schema && r.type === RuleType.Schema)) {
        report.skipped = true;
      } else {
        report.valid = await r.validate(ctx);
      }
      reports.push(report);
    }
    return reports;
  }

  async validate(): Promise<boolean> {
    const reports = await this.getValidateReports();
    return !reports.some((r) => !r.valid);
  }
}
