// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {classToPlain} from 'class-transformer';
import {Allow, IsString, validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {FileReference} from '../types';

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
    // plainToClass was used but ran into issues
    // We convert it to a plain object to get Maps converted to Records/Objects
    return yaml.dump(JSON.parse(JSON.stringify(this.deployment)), {
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

export interface BaseDataSource<
  F = any,
  H extends BaseHandler<F> = BaseHandler<F>,
  T extends BaseMapping<F, H> = BaseMapping<F, H>
> {
  name?: string;
  kind: string;
  startBlock?: number;
  mapping: T;
}

export interface BaseCustomDataSource<
  F = any,
  H extends BaseHandler<F> = BaseHandler<F>,
  T extends BaseMapping<F, H> = BaseMapping<F, H>
> extends BaseDataSource<F, H, T> {
  processor: FileReference;
  assets: Map<string, FileReference>;
}

export interface BaseMapping<F, T extends BaseHandler<F>> {
  file: string;
  handlers: T[];
}

export interface BaseHandler<T> {
  handler: string;
  kind: string;
  filter?: T;
}
