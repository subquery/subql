// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Context} from './context';
import {Reader, ReaderFactory} from './readers';
import {Rule, RuleType} from './rules';

export interface Report {
  name: string;
  skipped: boolean;
  description: string;
  valid: boolean;
}

export class Validator {
  private readonly reader: Reader;
  private readonly rules: Rule[] = [];

  constructor(private readonly location: string) {
    this.reader = ReaderFactory.create(location);
  }

  addRule(...rules: Rule[]): void {
    this.rules.push(...rules);
  }

  async validate(): Promise<Report[]> {
    const reports: Report[] = [];
    const [pkg, schema] = await Promise.all([this.reader.getPkg(), this.reader.getProjectSchema()]);

    reports.push(
      {
        name: 'package-json-file',
        description: 'a package.json file should be placed in the project folder',
        valid: !!pkg,
        skipped: false,
      },
      {
        name: 'project-yaml-file',
        description: 'a project.yaml file should be placed in the project root folder',
        valid: !!pkg,
        skipped: false,
      }
    );

    const ctx: Context = {
      data: {
        projectPath: this.location,
        pkg,
        schema,
      },
      logger: console,
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
        report.valid = r.validate(ctx);
      }
      reports.push(report);
    }
    return reports;
  }
}
