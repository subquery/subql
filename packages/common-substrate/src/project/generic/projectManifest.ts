// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  FileReference,
  GenericHandler,
  GenericManifest,
  GenericNetworkConfig,
  GenericTemplate,
  NetworkValidator,
  RunnerSpecs,
} from '@subql/common';
import {FileType, GenericRunnerSpecsImpl, GenericTemplateImp} from '@subql/common/project/versioned/genericManifest';
import {classToPlain, plainToClass, plainToClassFromExist, Type} from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
  ValidateNested,
  validateSync,
} from 'class-validator';
import yaml from 'js-yaml';
import {DeploymentV0_2_0, DeploymentV1_0_0} from '../versioned';
import {
  SubstrateDataSourceBaseImp,
  SubstrateRuntimeDataSource,
  SubstrateCustomDataSource,
  SubstrateRuntimeDataSourceImp,
  SubstrateCustomDataSourceImp,
} from './substrateDatasource';
import {getVersionedNetwork, SubstrateNetworkBaseImp} from './substrateNetwork';

export class SubstrateProjectManifestImp<
  H extends Partial<GenericHandler>,
  N extends Partial<GenericNetworkConfig>,
  O = any
> implements GenericManifest<H, N>
{
  protected _deployment: DeploymentV1_0_0 | DeploymentV0_2_0;
  @ValidateIf((o) => o.specVersion === '1.0.0')
  @IsObject()
  @ValidateNested()
  @Type(() => GenericRunnerSpecsImpl)
  runner: RunnerSpecs;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsString()
  specVersion: string;
  @IsString()
  description: string;
  @IsString()
  repository: string;
  @IsArray()
  @ValidateNested()
  // @Type(() => SubstrateDataSourceBaseImp, {keepDiscriminatorProperty: true})
  @Type(() => SubstrateRuntimeDataSourceImp, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateCustomDataSourceImp, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (SubstrateRuntimeDataSource<H> | SubstrateCustomDataSource<H, O>)[];
  @ValidateNested()
  @Type(() => FileType)
  schema: FileReference | string;
  @Validate(NetworkValidator)
  @ValidateNested()
  @Type(() => SubstrateNetworkBaseImp, {keepDiscriminatorProperty: true})
  network: N;
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => GenericTemplateImp, {keepDiscriminatorProperty: true})
  templates: GenericTemplate<H, O>[];

  constructor(raw: any) {
    const manifest = raw as GenericManifest<H, N>;
    this.network = getVersionedNetwork(manifest.specVersion, manifest.network) as N;
    this.dataSources = manifest.dataSources.map((d) => {
      if (d.kind === 'substrate/Runtime') {
        return plainToClass(SubstrateRuntimeDataSourceImp, d, {enableImplicitConversion: true});
      }
      return plainToClass(SubstrateCustomDataSourceImp, d, {enableImplicitConversion: true});
    });
  }

  toDeployment(): string {
    if (!this._deployment) {
      switch (this.specVersion) {
        case '1.0.0':
          this._deployment = plainToClass(DeploymentV1_0_0, this);
          break;
        case '0.2.0' || '0.2.1' || '0.3.0':
          this._deployment = plainToClass(DeploymentV0_2_0, this);
          break;
        default:
          throw new Error(`specVersion ${this.specVersion} to deployment not supported`);
      }
      validateSync(this._deployment, {whitelist: true});
    }

    return yaml.dump(classToPlain(this._deployment), {
      sortKeys: true,
      condenseFlow: true,
    });
  }
  validate(): void {
    const errors = validateSync(this, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
  }
}
