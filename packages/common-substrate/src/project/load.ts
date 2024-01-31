// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import {ChainTypes} from './models';
import {SubstrateProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function parseSubstrateProjectManifest(raw: unknown): SubstrateProjectManifestVersioned {
  const projectManifest = new SubstrateProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

export function parseChainTypes(raw: unknown): ChainTypes {
  const chainTypes = plainToClass(ChainTypes, raw);
  if (
    !!chainTypes.types ||
    !!chainTypes.typesChain ||
    !!chainTypes.typesBundle ||
    !!chainTypes.typesAlias ||
    !!chainTypes.typesSpec
  ) {
    const errors = validateSync(chainTypes, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse chain types.\n${errorMsgs}`);
    }
    return chainTypes;
  } else {
    throw new Error(`chainTypes is not valid`);
  }
}
