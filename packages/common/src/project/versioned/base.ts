// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Allow, IsString, validateSync} from 'class-validator';
import yaml from 'js-yaml';

export abstract class ProjectManifestBaseImpl<D extends object> {
  @Allow()
  definitions: object;
  @IsString()
  description: string;
  @IsString()
  repository: string;
  @IsString()
  specVersion: string;

  abstract readonly deployment: D;

  toDeployment(): string {
    return yaml.dump(this.deployment, {
      sortKeys: true,
      condenseFlow: true,
    });
  }

  validate(): void {
    const errors = validateSync(this.deployment, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
  }
}
