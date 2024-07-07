// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {loadFromJsonOrYaml} from '@subql/common';
import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlDatasource,
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlRuntimeDatasource,
  SecondLayerHandlerProcessorArray,
} from '@subql/types-ethereum';
import {fromBech32Address} from '@zilliqa-js/crypto';
import {buildMessage, isEthereumAddress, ValidateBy, ValidationOptions} from 'class-validator';
import {Interface} from 'ethers/lib/utils';

// Todo, this aligns with cli/src/generate-controller, but we should move this to common in next version
export const DEFAULT_ABI_DIR = '/abis';

type DefaultFilter = Record<string, unknown>;

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessorArray<EthereumHandlerKind, DefaultFilter, unknown>
): hp is SecondLayerHandlerProcessor<EthereumHandlerKind.Block, DefaultFilter, E> {
  return hp.baseHandlerKind === EthereumHandlerKind.Block;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessorArray<EthereumHandlerKind, DefaultFilter, unknown>
): hp is SecondLayerHandlerProcessor<EthereumHandlerKind.Event, DefaultFilter, E> {
  return hp.baseHandlerKind === EthereumHandlerKind.Event;
}

export function isCallHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessorArray<EthereumHandlerKind, DefaultFilter, unknown>
): hp is SecondLayerHandlerProcessor<EthereumHandlerKind.Call, DefaultFilter, E> {
  return hp.baseHandlerKind === EthereumHandlerKind.Call;
}

export function isCustomDs(ds: SubqlDatasource): ds is SubqlCustomDatasource<string> {
  return ds.kind !== EthereumDatasourceKind.Runtime && !!(ds as SubqlCustomDatasource<string>).processor;
}

export function isRuntimeDs(ds: SubqlDatasource): ds is SubqlRuntimeDatasource {
  return ds.kind === EthereumDatasourceKind.Runtime;
}

export function isEthereumOrZilliqaAddress(address: string): boolean {
  try {
    const ethFormat = fromBech32Address(address);
    return isEthereumAddress(ethFormat);
  } catch (e) {
    return isEthereumAddress(address);
  }
}

export function IsEthereumOrZilliqaAddress(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isEthereumOrZilliqaAddress',
      validator: {
        validate: (value, args): boolean => isEthereumOrZilliqaAddress(value),
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must be a Zilliqa address`,
          validationOptions
        ),
      },
    },
    validationOptions
  );
}

export function getAbiInterface(projectPath: string, abiFileName: string): Interface {
  const abi = loadFromJsonOrYaml(path.join(projectPath, DEFAULT_ABI_DIR, abiFileName)) as any;
  if (!Array.isArray(abi)) {
    if (!abi.abi) {
      throw new Error(`Provided ABI is not a valid ABI or Artifact`);
    }
    return new Interface(abi.abi);
  } else {
    return new Interface(abi);
  }
}
