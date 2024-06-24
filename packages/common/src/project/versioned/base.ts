// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseDeploymentV1_0_0Interface,
  FileReference,
  ParentProject,
  Processor,
  ProjectManifestBaseImplInterface,
} from '@subql/types-core';
import {plainToInstance, Type} from 'class-transformer';
import {
  Allow,
  Equals,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  validateSync,
} from 'class-validator';
import yaml from 'js-yaml';
import {IsEndBlockGreater, toJsonObject} from '../utils';
import {ParentProjectModel} from './v1_0_0/models';

export abstract class ProjectManifestBaseImpl<D extends BaseDeploymentV1_0_0>
  implements ProjectManifestBaseImplInterface<D>
{
  @Allow()
  definitions!: object;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  repository?: string;
  @IsString()
  specVersion!: string;

  protected _deployment!: D;

  protected constructor(private readonly _deploymentClass: new () => D) {}

  get deployment(): D {
    if (!this._deployment) {
      this._deployment = plainToInstance(this._deploymentClass, toJsonObject(this));
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }

  validate(): void {
    const errors = validateSync(this.deployment, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Failed to parse project. Please see below for more information.\n${errorMsgs}`);
    }
  }

  toDeployment(): string {
    return this.deployment.toYaml();
  }
}

export class FileType implements FileReference {
  @IsString()
  file!: string;
}

export class ProcessorImpl<O = any> extends FileType implements Processor<O> {
  @IsOptional()
  @IsObject()
  options?: O;
}

export class BaseDeploymentV1_0_0 implements BaseDeploymentV1_0_0Interface {
  @Equals('1.0.0')
  @IsString()
  specVersion!: string;
  @ValidateNested()
  @Type(() => FileType)
  schema!: FileType;
  @IsOptional()
  @IsObject()
  @Type(() => ParentProjectModel)
  parent?: ParentProject;

  toYaml(): string {
    // plainToClass was used but ran into issues
    // We convert it to a plain object to get Maps converted to Records/Objects
    return yaml.dump(toJsonObject(this), {
      sortKeys: true,
      condenseFlow: true,
    });
  }
}

export class BaseDataSource {
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Validate(IsEndBlockGreater)
  @IsOptional()
  @IsInt()
  endBlock?: number;
}
