// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {u8aConcat, u8aToBuffer, isString} from '@polkadot/util';
import {Entity} from '@subql/types';
import {getTypeByScalarName, GraphQLModelsType} from '@subql/utils';
import MerkleTools from 'merkle-tools';
import {OperationEntity, OperationType} from './types';

export class StoreOperations {
  private merkleTools;

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
      for (const field of operationModel.fields) {
        const fieldValue = operation.data[field.name];
        dataBufferArray.push(Buffer.from(field.name));

        if (fieldValue !== undefined && fieldValue !== null) {
          if (field.isEnum) {
            //if it is a enum, process it as string
            getTypeByScalarName('String').hashCode(fieldValue);
          } else {
            dataBufferArray.push(getTypeByScalarName(field.type).hashCode(fieldValue));
          }
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
    this.merkleTools.addLeaf(u8aToBuffer(this.operationEntityToUint8Array(operationEntity)));
  }

  reset(): void {
    this.merkleTools.resetTree();
  }

  makeOperationMerkleTree(): void {
    this.merkleTools.makeTree();
  }

  getOperationMerkleRoot(): Uint8Array {
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
