// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';

export async function prepareProject(network: NETWORK_FAMILY, subqlProjectPath: string): Promise<void> {
  // TODO, Pull a network starter, as base project. Then mapping, manifest, schema can be overridden, copy over abi files
}
