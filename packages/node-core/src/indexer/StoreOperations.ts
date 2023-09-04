// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Entity} from '@subql/types-core';
import {getTypeByScalarName, GraphQLModelsType, u8aConcat, u8aToBuffer, isString} from '@subql/utils';
import MerkleTools from 'merkle-tools';
import {OperationEntity, OperationType} from './types';

export class StoreOperations {
  private merkleTools: MerkleTools;

  constructor(private models: GraphQLModelsType[]) {
    this.merkleTools = new MerkleTools({
      hashType: 'sha256',
    });
  }

  private operationEntityToUint8Array(operation: OperationEntity): Uint8Array {
    const dataBufferArray: Uint8Array[] = [];
    if (operation.operation === OperationType.Remove) {
      //remove case
      if (isString(operation.data)) {
        dataBufferArray.push(Buffer.from(operation.data));
      } else {
        throw new Error(`Remove operation only accept data in string type`);
      }
    } else {
      const operationModel = this.models.find(({name}) => name === operation.entityType);
      if (!operationModel) {
        throw new Error(`Unable to find model with name ${operation.entityType}`);
      }
      for (const field of operationModel.fields) {
        const fieldValue = (operation.data as Entity & Record<string, any>)[field.name];
        dataBufferArray.push(Buffer.from(field.name));

        if (fieldValue !== undefined && fieldValue !== null) {
          const type = field.isEnum ? getTypeByScalarName('String') : getTypeByScalarName(field.type);
          if (!type) {
            throw new Error('Unable to get type by scalar name');
          }

          dataBufferArray.push(type.hashCode(fieldValue));
        }
      }
    }
    return u8aConcat(Buffer.from(operation.operation), Buffer.from(operation.entityType), ...dataBufferArray);
  }

  put(operation: OperationType, entity: string, data: Entity | string): void {
    const operationEntity: OperationEntity = {
      operation: operation,
      entityType: entity,
      data: data,
    };
    this.merkleTools.addLeaf(u8aToBuffer(this.operationEntityToUint8Array(operationEntity)), true);
  }

  reset(): void {
    // Bad types
    (this.merkleTools as any).resetTree();
  }

  makeOperationMerkleTree(): void {
    this.merkleTools.makeTree();
  }

  getOperationMerkleRoot(): Uint8Array | null {
    if (this.merkleTools.getTreeReadyState()) {
      return this.merkleTools.getMerkleRoot();
    } else {
      throw new Error(`Failed to get Merkle root from operations, tree is not built yet`);
    }
  }

  getOperationLeafCount(): any {
    return this.merkleTools.getLeafCount();
  }
}
