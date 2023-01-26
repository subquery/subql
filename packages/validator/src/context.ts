// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Reader} from '@subql/common';
import {AlgorandProjectManifestVersioned} from '@subql/common-algorand';
import {SubstrateProjectManifestVersioned as AvalancheProjectManifestVersioned} from '@subql/common-avalanche';
import {CosmosProjectManifestVersioned} from '@subql/common-cosmos';
import {EthereumProjectManifestVersioned} from '@subql/common-ethereum';
import {EthereumProjectManifestVersioned as FlareProjectManifestVersioned} from '@subql/common-flare';
import {NearProjectManifestVersioned} from '@subql/common-near';
import {SubstrateProjectManifestVersioned} from '@subql/common-substrate';
import {TerraProjectManifestVersioned} from '@subql/common-terra';
import {IPackageJson} from 'package-json-type';

export interface ContextData {
  projectPath: string;
  pkg: IPackageJson;
  schema?:
    | SubstrateProjectManifestVersioned
    | TerraProjectManifestVersioned
    | CosmosProjectManifestVersioned
    | AvalancheProjectManifestVersioned
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
