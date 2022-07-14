// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Transform, TransformFnParams, Type} from 'class-transformer';
import {
  Allow,
  Equals,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {FileReference, GenericDatasource} from '../../types';
import {validateObject} from '../../utils';
import {BaseMapping} from '../base';
import {GenericHandlerInterface, GenericNetworkFilter} from './types';

export class GenericFileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class ProjectNetworkDeploymentV0_2_0 {
  @IsString()
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  genesisHash: string;
  @ValidateNested()
  @Type(() => GenericFileReferenceImpl)
  @IsOptional()
  chaintypes?: GenericFileReferenceImpl;
}
export class ProjectNetworkV0_2_0 extends ProjectNetworkDeploymentV0_2_0 {
  @IsString()
  @IsOptional()
  endpoint?: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
}

export class GenericHandler implements GenericHandlerInterface {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class GenericMapping implements BaseMapping<Record<string, unknown>, GenericHandlerInterface> {
  @IsArray()
  @Type(() => GenericHandler)
  @ValidateNested()
  handlers: GenericHandler[];
  @IsString()
  file: string;
}

export class GenericDataSourceBase<K extends string, T extends GenericNetworkFilter, M extends GenericMapping, O = any>
  implements GenericDatasource<K, T, M, O>
{
  @IsString()
  kind: K;
  @Type(() => GenericMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Type(() => GenericFileReferenceImpl)
  @IsOptional()
  @ValidateNested({each: true})
  assets?: Map<string, FileReference>;
  @Type(() => GenericFileReferenceImpl)
  @IsObject()
  @IsOptional()
  processor?: FileReference;
  @IsOptional()
  @IsObject()
  filter?: T;
}

export class GenericDataSourceV0_2_0Impl<
    K extends string = string,
    T extends GenericNetworkFilter = GenericNetworkFilter,
    M extends BaseMapping<any, any> = BaseMapping<Record<string, unknown>, any>
  >
  extends GenericDataSourceBase<K, T, M>
  implements GenericDatasource<K, T, M>
{
  validate(): void {
    return validateObject(this, 'failed to validate custom datasource.');
  }
}

export class GenericProjectManifestV0_2_0Impl {
  @Allow()
  definitions: object;
  @IsString()
  description: string;
  @IsString()
  repository: string;
  @Equals('0.2.0')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectNetworkV0_2_0)
  network: ProjectNetworkV0_2_0;
  @ValidateNested()
  @Type(() => GenericFileReferenceImpl)
  schema: GenericFileReferenceImpl;
  @IsArray()
  @ValidateNested()
  @Type(() => GenericDataSourceV0_2_0Impl)
  dataSources: GenericDatasource[];

  validate(): void {
    const errors = validateSync(this, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
  }
}
