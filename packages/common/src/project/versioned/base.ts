// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {toJsonObject} from '@subql/common';
import {FileReference, Processor} from '@subql/types-core';
import {plainToInstance} from 'class-transformer';
import {Allow, IsObject, IsOptional, IsString, validateSync} from 'class-validator';

export abstract class ProjectManifestBaseImpl<D extends object> {
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
