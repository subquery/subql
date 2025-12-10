// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
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
  ValidationError,
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

  /**
   * Recursively formats validation errors into a structured format.
   * Handles nested errors (errors with children) by recursively processing them.
   * Formats array indices with brackets for better readability (e.g., dataSources[0].mapping.handlers[1].filter).
   */
  private formatValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
    const errorMessages: string[] = [];
    
    for (const error of errors) {
      // Check if property is a numeric string (array index)
      const isArrayIndex = /^\d+$/.test(error.property);
      const propertyPath = parentPath
        ? isArrayIndex
          ? `${parentPath}[${error.property}]`
          : `${parentPath}.${error.property}`
        : error.property;
      
      if (error.constraints && Object.keys(error.constraints).length > 0) {
        const constraints = Object.values(error.constraints).join(', ');
        errorMessages.push(`  - ${propertyPath}: ${constraints}`);
      }
      
      // Recursively handle nested errors
      if (error.children && error.children.length > 0) {
        errorMessages.push(...this.formatValidationErrors(error.children, propertyPath));
      }
    }
    
    return errorMessages;
  }

  validate(): void {
    const errors = validateSync(this.deployment, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      const errorMsgs = this.formatValidationErrors(errors).join('\n');
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
