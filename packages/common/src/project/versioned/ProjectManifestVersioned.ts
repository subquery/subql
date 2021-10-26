// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasource} from '@subql/types';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import {IProjectManifest} from '../types';
import {ProjectManifestV0_0_1Impl} from './v0_0_1';
import {ProjectManifestV0_2_0Impl} from './v0_2_0';

export type VersionedProjectManifest = {specVersion: string};

const SUPPORTED_VERSIONS = {
  '0.0.1': ProjectManifestV0_0_1Impl,
  '0.2.0': ProjectManifestV0_2_0Impl,
};

type Versions = keyof typeof SUPPORTED_VERSIONS;

type ProjectManifestImpls = InstanceType<typeof SUPPORTED_VERSIONS[Versions]>;

export function manifestIsV0_0_1(manifest: IProjectManifest): manifest is ProjectManifestV0_0_1Impl {
  return manifest.specVersion === '0.0.1';
}

export function manifestIsV0_2_0(manifest: IProjectManifest): manifest is ProjectManifestV0_2_0Impl {
  return manifest.specVersion === '0.2.0';
}

export class ProjectManifestVersioned implements IProjectManifest {
  private _impl: ProjectManifestImpls;

  constructor(projectManifest: VersionedProjectManifest) {
    const klass = SUPPORTED_VERSIONS[projectManifest.specVersion as Versions];
    if (!klass) {
      throw new Error('specVersion not supported for project manifest file');
    }
    this._impl = plainToClass<ProjectManifestImpls, VersionedProjectManifest>(klass, projectManifest);
  }

  get asImpl(): IProjectManifest {
    return this._impl;
  }

  get isV0_0_1(): boolean {
    return this.specVersion === '0.0.1';
  }

  get asV0_0_1(): ProjectManifestV0_0_1Impl {
    return this._impl as ProjectManifestV0_0_1Impl;
  }

  get isV0_2_0(): boolean {
    return this.specVersion === '0.2.0';
  }

  get asV0_2_0(): ProjectManifestV0_2_0Impl {
    return this._impl as ProjectManifestV0_2_0Impl;
  }

  validate(): void {
    const errors = validateSync(this._impl, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
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
