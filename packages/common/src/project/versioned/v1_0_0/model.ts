// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasourceKind} from '@subql/types';
import {SubqlTerraDatasourceKind} from '@subql/types-terra';
import {plainToClass, Type} from 'class-transformer';
import {Equals, IsEnum, IsObject, IsString, ValidateNested, validateSync} from 'class-validator';
import {ProjectManifestV0_2_1Impl, DeploymentV0_2_1, CustomDatasourceTemplateImpl} from '../v0_2_1';
import {runnerSpecs, ProjectManifestV1_0_0, NodeSpec, QuerySpec, queryKind, nodeKind} from './types';
export class NodeSpecImpl implements NodeSpec {
  @IsEnum(nodeKind)
  name: nodeKind;
  @IsString()
  version: string;
}

export class QuerySpecImpl implements QuerySpec {
  @IsEnum(queryKind)
  name: queryKind;
  @IsString()
  version: string;
}

export class RunnerSpecImpl implements runnerSpecs {
  @IsObject()
  @Type(() => NodeSpecImpl)
  node: NodeSpec;
  @IsObject()
  @Type(() => NodeSpecImpl)
  query: QuerySpec;
}

export class DeploymentV1_0_0 extends DeploymentV0_2_1 {
  @Equals('1.0.0')
  @IsString()
  specVersion: string;
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerSpecImpl)
  runner: runnerSpecs;
}

export class ProjectManifestV1_0_0Impl extends ProjectManifestV0_2_1Impl implements ProjectManifestV1_0_0 {
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerSpecImpl)
  runner: runnerSpecs;
  protected _deployment: DeploymentV1_0_0;

  get deployment(): DeploymentV1_0_0 {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV1_0_0, this);
      validateSync(this._deployment, {whitelist: true});
      this.validate();
    }
    return this._deployment;
  }

  validate(): void {
    //check deployment datasource match with runner
    if (this.runner.node.name === nodeKind.Substrate) {
      this.deployment.dataSources.map((ds) => {
        //TODO, handle custom ds
        if (
          ds.kind !== SubqlDatasourceKind.Runtime &&
          ds.kind !== 'Substrate/FrontierEvm' &&
          ds.kind !== 'Substrate/FrontierEvm'
        ) {
          throw new Error(`Datasource ${ds.kind} not match with runner node spec ${nodeKind.Substrate}`);
        }
      });
    } else if (this.runner.node.name === nodeKind.Terra) {
      this.deployment.dataSources.map((ds) => {
        if (ds.kind === SubqlTerraDatasourceKind.Runtime) {
          throw new Error(`Datasource ${ds.kind} not match with runner node spec ${nodeKind.Terra}`);
        }
      });
    }
    //TODO check runner version format
  }
}
