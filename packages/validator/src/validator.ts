// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Context} from './context';
import {Reader, ReaderFactory} from './readers';
import {Rule, RuleType} from './rules';

export interface Report {
  name: string;
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
      },
      {
        name: 'project-yaml-file',
        description: 'a project.yaml file should be placed in the project root folder',
        valid: !!pkg,
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
      if ((!pkg && r.type === RuleType.PackageJSON) || (!schema && r.type === RuleType.Schema)) {
        continue;
      }
      reports.push({
        name: r.name,
        description: r.description,
        valid: r.validate(ctx),
      });
    }
    return reports;
  }
}
