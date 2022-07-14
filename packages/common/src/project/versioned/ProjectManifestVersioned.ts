// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {plainToClass} from 'class-transformer';
import {GenericDatasource, GenericSubstrateProjectManifest} from '../types';
import {GenericProjectManifestV0_2_0Impl} from './v0_2_0';
import {GenericProjectManifestV0_2_1Impl} from './v0_2_1';
import {GenericProjectManifestV1_0_0Impl} from './v1_0_0';
export type VersionedProjectManifest = {specVersion: string};

const GENERIC_SUPPORTED_VERSIONS = {
  '0.2.0': GenericProjectManifestV0_2_0Impl,
  '0.2.1': GenericProjectManifestV0_2_1Impl,
  '1.0.0': GenericProjectManifestV1_0_0Impl,
};

type Versions = keyof typeof GENERIC_SUPPORTED_VERSIONS;

type ProjectManifestImpls = InstanceType<typeof GENERIC_SUPPORTED_VERSIONS[Versions]>;

export function manifestIsV0_2_0(
  manifest: GenericSubstrateProjectManifest
): manifest is GenericProjectManifestV0_2_0Impl {
  return manifest.specVersion === '0.2.0';
}

export function manifestIsV0_2_1(
  manifest: GenericSubstrateProjectManifest
): manifest is GenericProjectManifestV0_2_1Impl {
  return manifest.specVersion === '0.2.1';
}

export function manifestIsV1_0_0(
  manifest: GenericSubstrateProjectManifest
): manifest is GenericProjectManifestV1_0_0Impl {
  return manifest.specVersion === '1.0.0';
}

export class GenericProjectManifestVersioned implements GenericSubstrateProjectManifest {
  private _impl: ProjectManifestImpls;

  constructor(projectManifest: VersionedProjectManifest) {
    const klass = GENERIC_SUPPORTED_VERSIONS[projectManifest.specVersion as Versions];
    if (!klass) {
      throw new Error('specVersion not supported for project manifest file');
    }
    this._impl = plainToClass<ProjectManifestImpls, VersionedProjectManifest>(klass, projectManifest);
  }

  get asImpl(): ProjectManifestImpls {
    return this._impl;
  }

  get isV0_0_1(): boolean {
    return this.specVersion === '0.0.1';
  }

  get isV0_2_0(): boolean {
    return this.specVersion === '0.2.0';
  }

  get asV0_2_0(): GenericProjectManifestV0_2_0Impl {
    return this._impl as GenericProjectManifestV0_2_0Impl;
  }

  get isV0_2_1(): boolean {
    return this.specVersion === '0.2.1';
  }

  get asV0_2_1(): GenericProjectManifestV0_2_1Impl {
    return this._impl as GenericProjectManifestV0_2_1Impl;
  }

  get isV1_0_0(): boolean {
    return this.specVersion === '1.0.0';
  }

  get asV1_0_0(): GenericProjectManifestV1_0_0Impl {
    return this._impl as GenericProjectManifestV1_0_0Impl;
  }

  validate(): void {
    return this._impl.validate();
  }

  get dataSources(): GenericDatasource[] {
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
