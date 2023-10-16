// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FileReference} from '@subql/types-core';
import {
  SecondLayerHandlerProcessor,
  CosmosCustomDatasource,
  CosmosDatasource,
  CosmosDatasourceKind,
  CosmosHandlerKind,
  CosmosRuntimeDatasource,
  CustomDatasourceTemplate,
  RuntimeDatasourceTemplate,
} from '@subql/types-cosmos';
import {ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface} from 'class-validator';
import {gte} from 'semver';

export function isCustomCosmosDs(ds: CosmosDatasource): ds is CosmosCustomDatasource<string> {
  return ds.kind !== CosmosDatasourceKind.Runtime && !!(ds as CosmosCustomDatasource<string>).processor;
}

export function isRuntimeCosmosDs(ds: CosmosDatasource): ds is CosmosRuntimeDatasource {
  return ds.kind === CosmosDatasourceKind.Runtime;
}

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<CosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<CosmosHandlerKind.Block, unknown, E> {
  return hp.baseHandlerKind === CosmosHandlerKind.Block;
}

export function isTransactionHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<CosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<CosmosHandlerKind.Transaction, unknown, E> {
  return hp.baseHandlerKind === CosmosHandlerKind.Transaction;
}

export function isMessageHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<CosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<CosmosHandlerKind.Message, unknown, E> {
  return hp.baseHandlerKind === CosmosHandlerKind.Message;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<CosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<CosmosHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === CosmosHandlerKind.Event;
}

export function isCosmosTemplates(
  templatesData: any,
  specVersion: string
): templatesData is (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[] {
  return (isRuntimeCosmosDs(templatesData[0]) || isCustomCosmosDs(templatesData[0])) && gte(specVersion, '0.2.1');
}

@ValidatorConstraint({name: 'isFileReference', async: false})
export class FileReferenceImp implements ValidatorConstraintInterface {
  validate(value: Map<string, FileReference>): boolean {
    if (!value) {
      return false;
    }
    return !!Object.values(value).find((fileReference: FileReference) => this.isValidFileReference(fileReference));
  }
  defaultMessage(args: ValidationArguments): string {
    return `${JSON.stringify(args.value)} is not a valid assets format`;
  }

  private isValidFileReference(fileReference: FileReference): boolean {
    return typeof fileReference === 'object' && 'file' in fileReference && typeof fileReference.file === 'string';
  }
}
