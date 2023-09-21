// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FileReference, ParentProject, Processor} from '@subql/types-core';
import {plainToInstance, Type} from 'class-transformer';
import {Allow, Equals, IsObject, IsOptional, IsString, ValidateNested, validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {toJsonObject} from '../utils';
import {ParentProjectModel} from './v1_0_0/models';

export abstract class ProjectManifestBaseImpl<D extends BaseDeploymentV1_0_0> {
  @Allow()
  definitions: object;
  @IsString()
  description: string;
  @IsString()
  repository: string;
  @IsString()
  specVersion: string;

  protected _deployment: D;

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
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
  }

  toDeployment(): string {
    return this.deployment.toYaml();
  }
}

export class FileType implements FileReference {
  @IsString()
  file: string;
}

export class ProcessorImpl<O = any> extends FileType implements Processor<O> {
  @IsOptional()
  @IsObject()
  options?: O;
}

export class BaseDeploymentV1_0_0 {
  @Equals('1.0.0')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
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
