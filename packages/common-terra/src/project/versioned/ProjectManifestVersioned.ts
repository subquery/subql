// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlTerraDatasource} from '@subql/types-terra';
import {plainToClass} from 'class-transformer';
import {ITerraProjectManifest} from '../types';
import {ProjectManifestV0_3_0Impl} from './v0_3_0';

export type VersionedProjectManifest = {specVersion: string};

const SUPPORTED_VERSIONS = {
  '0.3.0': ProjectManifestV0_3_0Impl,
};

type Versions = keyof typeof SUPPORTED_VERSIONS;

type ProjectManifestImpls = InstanceType<typeof SUPPORTED_VERSIONS[Versions]>;

export function manifestIsV0_3_0(manifest: ITerraProjectManifest): manifest is ProjectManifestV0_3_0Impl {
  return manifest.specVersion === '0.3.0';
}

export class TerraProjectManifestVersioned implements ITerraProjectManifest {
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

  toDeployment(): string | undefined {
    return this._impl.toDeployment();
  }

  validate(): void {
    return this._impl.validate();
  }

  get dataSources(): SubqlTerraDatasource[] {
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
