// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FileReference} from '@subql/types-core';
import {
  SecondLayerHandlerProcessor,
  SubqlCosmosCustomDatasource,
  SubqlCosmosDatasource,
  SubqlCosmosDatasourceKind,
  SubqlCosmosHandlerKind,
  SubqlCosmosRuntimeDatasource,
  CustomDatasourceTemplate,
  RuntimeDatasourceTemplate,
} from '@subql/types-cosmos';
import {ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface} from 'class-validator';
import {gte} from 'semver';

export function isCustomCosmosDs(ds: SubqlCosmosDatasource): ds is SubqlCosmosCustomDatasource<string> {
  return ds.kind !== SubqlCosmosDatasourceKind.Runtime && !!(ds as SubqlCosmosCustomDatasource<string>).processor;
}

export function isRuntimeCosmosDs(ds: SubqlCosmosDatasource): ds is SubqlCosmosRuntimeDatasource {
  return ds.kind === SubqlCosmosDatasourceKind.Runtime;
}

export function isBlockHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Block, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Block;
}

export function isTransactionHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Transaction, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Transaction;
}

export function isMessageHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Message, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Message;
}

export function isEventHandlerProcessor<E>(
  hp: SecondLayerHandlerProcessor<SubqlCosmosHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlCosmosHandlerKind.Event, unknown, E> {
  return hp.baseHandlerKind === SubqlCosmosHandlerKind.Event;
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
