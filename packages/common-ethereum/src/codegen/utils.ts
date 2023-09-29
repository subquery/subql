// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {loadFromJsonOrYaml} from '@subql/common';
import {parseContractPath} from 'typechain';
import {AbiInterface} from './codegen-controller';

// Re-export for generate command
export {parseContractPath};

export function loadReadAbi(filePath: string): AbiInterface[] | {abi: AbiInterface[]} {
  return loadFromJsonOrYaml(filePath) as AbiInterface[] | {abi: AbiInterface[]};
}
