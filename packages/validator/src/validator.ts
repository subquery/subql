// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getProjectNetwork, NETWORK_FAMILY, Reader, ReaderFactory, ReaderOptions} from '@subql/common';
import {parseAlgorandProjectManifest} from '@subql/common-algorand';
import {parseSubstrateProjectManifest as parseAvalancheProjectManifest} from '@subql/common-avalanche';
import {parseCosmosProjectManifest} from '@subql/common-cosmos';
import {parseEthereumProjectManifest} from '@subql/common-ethereum';
import {parseEthereumProjectManifest as parseFlareProjectManifest} from '@subql/common-flare';
import {parseNearProjectManifest} from '@subql/common-near';
import {parseSubstrateProjectManifest} from '@subql/common-substrate';
import {parseTerraProjectManifest} from '@subql/common-terra';

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

  static async create(location: string, opts?: ReaderOptions, networkFamily?: NETWORK_FAMILY): Promise<Validator> {
    return new Validator(await ReaderFactory.create(location, opts), location, networkFamily);
  }
  constructor(
    private readonly reader: Reader,
    private readonly location: string,
    private readonly networkFamily?: NETWORK_FAMILY
  ) {}

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

    let schema;

    const networkFamily = this.networkFamily ?? getProjectNetwork(rawSchema);
    switch (networkFamily) {
      case NETWORK_FAMILY.substrate:
        schema = parseSubstrateProjectManifest(rawSchema);
        if (schema.isV0_0_1) {
          reports.push({
            name: 'package-json-file',
            description: 'A valid `package.json` file must exist in the root directory of the project',
            valid: !!pkg,
            skipped: false,
          });
        }
        break;
      case NETWORK_FAMILY.terra:
        schema = parseTerraProjectManifest(rawSchema);
        break;
      case NETWORK_FAMILY.avalanche:
        schema = parseAvalancheProjectManifest(rawSchema);
        break;
      case NETWORK_FAMILY.cosmos:
        schema = parseCosmosProjectManifest(rawSchema);
        break;
      case NETWORK_FAMILY.algorand:
        schema = parseAlgorandProjectManifest(rawSchema);
        break;
      case NETWORK_FAMILY.ethereum:
        schema = parseEthereumProjectManifest(rawSchema);
        break;
      case NETWORK_FAMILY.flare:
        schema = parseFlareProjectManifest(rawSchema);
        break;
      case NETWORK_FAMILY.near:
        schema = parseNearProjectManifest(rawSchema);
        break;
      default:
        console.error(`Load project failed, please check the manifest file.`);
        break;
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
