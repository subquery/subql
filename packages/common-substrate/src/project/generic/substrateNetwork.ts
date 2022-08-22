// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {GenericNetworkConfig} from '@subql/common';
import {plainToClass, Transform, TransformFnParams, Type} from 'class-transformer';
import {IsNotEmpty, IsOptional, IsString, ValidateNested} from 'class-validator';
import {FileType} from '../versioned';

export function getVersionedNetwork(specVersion: string, network: Partial<GenericNetworkConfig>): SubstrateNetworkImp {
  switch (specVersion) {
    case '1.0.0':
      return plainToClass(SubstrateNetworkImpV1_0_0, network);
      break;
    case '0.2.0' || '0.2.1' || '0.3.0':
      return plainToClass(SubstrateNetworkImpV0_2_0, network);
      break;
    case '0.0.1':
      return plainToClass(SubstrateNetworkBaseImp, network);
      break;
    default:
      throw new Error(`Failed to identify network type with unknown specVersion ${specVersion} `);
      break;
  }
}

export class SubstrateNetworkBaseImp implements Partial<GenericNetworkConfig> {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
}

export class SubstrateNetworkImpV0_2_0 extends SubstrateNetworkBaseImp {
  @IsString()
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  genesisHash: string;
  @ValidateNested()
  @Type(() => FileType)
  @IsOptional()
  chaintypes?: FileType;
}

export class SubstrateNetworkImpV1_0_0 extends SubstrateNetworkBaseImp {
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  @IsString()
  chainId: string;
  @ValidateNested()
  @Type(() => FileType)
  @IsOptional()
  chaintypes?: FileType;
}

export type SubstrateNetworkImp = SubstrateNetworkImpV1_0_0 | SubstrateNetworkImpV0_2_0 | SubstrateNetworkBaseImp;
