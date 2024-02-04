// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  SecondLayerHandlerProcessor,
  SubqlCustomDatasource,
  SubqlDatasource,
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import {fromBech32Address} from '@zilliqa-js/crypto';
import {buildMessage, isEthereumAddress, ValidateBy, ValidationOptions} from 'class-validator';

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<EthereumHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<EthereumHandlerKind.Block, unknown, E> {
  return hp.baseHandlerKind === EthereumHandlerKind.Block;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<EthereumHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<EthereumHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === EthereumHandlerKind.Event;
}

export function isCallHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<EthereumHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<EthereumHandlerKind.Call, unknown, E> {
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
