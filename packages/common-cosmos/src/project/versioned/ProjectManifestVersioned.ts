// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlCosmosDatasource} from '@subql/types-cosmos';
import {plainToClass} from 'class-transformer';
import {ICosmosProjectManifest} from '../types';
import {ProjectManifestV0_3_0Impl} from './v0_3_0';
import {ProjectManifestV1_0_0Impl} from './v1_0_0';

export type VersionedProjectManifest = {specVersion: string};

const SUPPORTED_VERSIONS = {
  '0.3.0': ProjectManifestV0_3_0Impl,
  '1.0.0': ProjectManifestV1_0_0Impl,
};

type Versions = keyof typeof SUPPORTED_VERSIONS;

type ProjectManifestImpls = InstanceType<typeof SUPPORTED_VERSIONS[Versions]>;

export function manifestIsV0_3_0(manifest: ICosmosProjectManifest): manifest is ProjectManifestV0_3_0Impl {
  return manifest.specVersion === '0.3.0';
}

export function manifestIsV1_0_0(manifest: ICosmosProjectManifest): manifest is ProjectManifestV1_0_0Impl {
  return manifest.specVersion === '1.0.0';
}

export class CosmosProjectManifestVersioned implements ICosmosProjectManifest {
  private _impl: ProjectManifestImpls;

  constructor(projectManifest: VersionedProjectManifest) {
    const klass = SUPPORTED_VERSIONS[projectManifest.specVersion as Versions];
    if (!klass) {
      throw new Error('specVersion not supported for project manifest file');
    }
    this._impl = plainToClass<ProjectManifestImpls, VersionedProjectManifest>(klass, projectManifest);
  }

  get asImpl(): ProjectManifestImpls {
    return this._impl;
  }

  get isV0_3_0(): boolean {
    return this.specVersion === '0.3.0';
  }

  get asV0_3_0(): ProjectManifestV0_3_0Impl {
    return this._impl as ProjectManifestV0_3_0Impl;
  }

  get isV1_0_0(): boolean {
    return this.specVersion === '1.0.0';
  }

  get asV1_0_0(): ProjectManifestV1_0_0Impl {
    return this._impl as ProjectManifestV1_0_0Impl;
  }

  toDeployment(): string | undefined {
    return this._impl.toDeployment();
  }

  validate(): void {
    return this._impl.validate();
  }

  get dataSources(): SubqlCosmosDatasource[] {
    return this._impl.dataSources;
  }

  get schema(): string {
    return this._impl.schema.file;
  }

  get specVersion(): string {
    return this._impl.specVersion;
  }

  get description(): string {
    return this._impl.description;
  }

  get repository(): string {
    return this._impl.repository;
  }
}
