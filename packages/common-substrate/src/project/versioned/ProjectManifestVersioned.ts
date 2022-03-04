// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasource} from '@subql/types';
import {plainToClass} from 'class-transformer';
import {ISubstrateProjectManifest} from '../types';
import {SubstrateProjectManifestV0_0_1Impl} from './v0_0_1';
import {SubstrateProjectManifestV0_2_0Impl} from './v0_2_0';
import {SubstrateProjectManifestV0_2_1Impl} from './v0_2_1';
import {SubstrateProjectManifestV0_3_0Impl} from './v0_3_0';
import {SubstrateProjectManifestV1_0_0Impl} from './v1_0_0';
export type VersionedProjectManifest = {specVersion: string};

const SUBSTRATE_SUPPORTED_VERSIONS = {
  '0.0.1': SubstrateProjectManifestV0_0_1Impl,
  '0.2.0': SubstrateProjectManifestV0_2_0Impl,
  '0.2.1': SubstrateProjectManifestV0_2_1Impl,
  '0.3.0': SubstrateProjectManifestV0_3_0Impl,
  '1.0.0': SubstrateProjectManifestV1_0_0Impl,
};

type Versions = keyof typeof SUBSTRATE_SUPPORTED_VERSIONS;

type ProjectManifestImpls = InstanceType<typeof SUBSTRATE_SUPPORTED_VERSIONS[Versions]>;

export function manifestIsV0_0_1(manifest: ISubstrateProjectManifest): manifest is SubstrateProjectManifestV0_0_1Impl {
  return manifest.specVersion === '0.0.1';
}

export function manifestIsV0_2_0(manifest: ISubstrateProjectManifest): manifest is SubstrateProjectManifestV0_2_0Impl {
  return manifest.specVersion === '0.2.0';
}

export function manifestIsV0_2_1(manifest: ISubstrateProjectManifest): manifest is SubstrateProjectManifestV0_2_1Impl {
  return manifest.specVersion === '0.2.1';
}

export function manifestIsV0_3_0(manifest: ISubstrateProjectManifest): manifest is SubstrateProjectManifestV0_3_0Impl {
  return manifest.specVersion === '0.3.0';
}

export function manifestIsV1_0_0(manifest: ISubstrateProjectManifest): manifest is SubstrateProjectManifestV1_0_0Impl {
  return manifest.specVersion === '1.0.0';
}

export class SubstrateProjectManifestVersioned implements ISubstrateProjectManifest {
  private _impl: ProjectManifestImpls;

  constructor(projectManifest: VersionedProjectManifest) {
    const klass = SUBSTRATE_SUPPORTED_VERSIONS[projectManifest.specVersion as Versions];
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

  get asV0_0_1(): SubstrateProjectManifestV0_0_1Impl {
    return this._impl as SubstrateProjectManifestV0_0_1Impl;
  }

  get isV0_2_0(): boolean {
    return this.specVersion === '0.2.0';
  }

  get asV0_2_0(): SubstrateProjectManifestV0_2_0Impl {
    return this._impl as SubstrateProjectManifestV0_2_0Impl;
  }

  get isV0_2_1(): boolean {
    return this.specVersion === '0.2.1';
  }

  get asV0_2_1(): SubstrateProjectManifestV0_2_1Impl {
    return this._impl as SubstrateProjectManifestV0_2_1Impl;
  }

  get isV0_3_0(): boolean {
    return this.specVersion === '0.3.0';
  }

  get asV0_3_0(): SubstrateProjectManifestV0_3_0Impl {
    return this._impl as SubstrateProjectManifestV0_3_0Impl;
  }

  get isV1_0_0(): boolean {
    return this.specVersion === '1.0.0';
  }

  get asV1_0_0(): SubstrateProjectManifestV1_0_0Impl {
    return this._impl as SubstrateProjectManifestV1_0_0Impl;
  }

  toDeployment(): string | undefined {
    return this._impl.toDeployment();
  }

  validate(): void {
    return this._impl.validate();
  }

  get dataSources(): SubqlDatasource[] {
    return this._impl.dataSources;
  }

  get schema(): string {
    if (manifestIsV0_0_1(this._impl)) {
      return this._impl.schema;
    }

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
