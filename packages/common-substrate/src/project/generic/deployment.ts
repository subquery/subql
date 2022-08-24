// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {GenericNetworkConfig, GenericTemplates, RunnerSpecs} from '@subql/common';
import {plainToClass, Transform, Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import {FileType, SubstrateRunnerSpecsImpl} from '../versioned';
import {SubstrateCustomDataSource, SubstrateHandler, SubstrateRuntimeDataSource} from './substrateDatasource';
import {SubstrateNetworkImpV1_0_0, SubstrateNetworkImpV0_2_0} from './substrateNetwork';

export class SubstrateDeploymentV0_2_0 {
  @ValidateNested()
  @Type(() => SubstrateNetworkImpV0_2_0)
  network: GenericNetworkConfig;
  @Equals('0.2.0')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  dataSources: (SubstrateRuntimeDataSource | SubstrateCustomDataSource)[];
}

export class SubstrateDeploymentV0_2_1 extends SubstrateDeploymentV0_2_0 {
  @Equals('0.2.1')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  dataSources: (SubstrateRuntimeDataSource | SubstrateCustomDataSource)[];
  @IsOptional()
  @IsArray()
  @ValidateNested()
  templates?: GenericTemplates<SubstrateHandler>[];
}

export class SubstrateDeploymentV1_0_0 extends SubstrateDeploymentV0_2_1 {
  @Transform((params) => {
    if (params.value.genesisHash && !params.value.chainId) {
      params.value.chainId = params.value.genesisHash;
    }
    return plainToClass(SubstrateNetworkImpV1_0_0, params.value);
  })
  @ValidateNested()
  @Type(() => SubstrateNetworkImpV1_0_0)
  network: GenericNetworkConfig;
  @Equals('1.0.0')
  @IsString()
  specVersion: string;
  @IsObject()
  @ValidateNested()
  @Type(() => SubstrateRunnerSpecsImpl)
  runner: RunnerSpecs;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  dataSources: (SubstrateRuntimeDataSource | SubstrateCustomDataSource)[];
  @IsOptional()
  @IsArray()
  @ValidateNested()
  templates?: GenericTemplates<SubstrateHandler>[];
}
