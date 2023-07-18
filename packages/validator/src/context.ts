// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Reader} from '@subql/common';
import {AlgorandProjectManifestVersioned} from '@subql/common-algorand';
import {CosmosProjectManifestVersioned} from '@subql/common-cosmos';
import {EthereumProjectManifestVersioned} from '@subql/common-ethereum';
import {EthereumProjectManifestVersioned as FlareProjectManifestVersioned} from '@subql/common-flare';
import {NearProjectManifestVersioned} from '@subql/common-near';
import {SubstrateProjectManifestVersioned} from '@subql/common-substrate';
import {IPackageJson} from 'package-json-type';

export interface ContextData {
  projectPath: string;
  pkg: IPackageJson;
  schema?:
    | SubstrateProjectManifestVersioned
    | CosmosProjectManifestVersioned
    | AlgorandProjectManifestVersioned
    | EthereumProjectManifestVersioned
    | FlareProjectManifestVersioned
    | NearProjectManifestVersioned;
}

export interface Context {
  data: ContextData;
  logger: Console;
  reader: Reader;
}
