// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Entity} from '@subql/types-core';
import {getTypeByScalarName, GraphQLModelsType, u8aConcat, u8aToBuffer, isString} from '@subql/utils';
import MerkleTools from 'merkle-tools';
import {monitorWrite} from '../process';
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

          // This should be done for all types when we have an array, but for backwards compatibility this is only for BigInt, Date and Bytes as using an array would throw an error.
          if (field.isArray && ['BigInt', 'Bytes', 'Date'].includes(type.name)) {
            for (const item of fieldValue as Array<any>) {
              dataBufferArray.push(type.hashCode(item));
            }
          } else {
            dataBufferArray.push(type.hashCode(fieldValue));
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
    // skip full data, should write in higher level
    monitorWrite(
      `-- [POI][StoreOperations][put] ${operation} entity ${entity}, data/id: ${
        typeof data === 'string' ? data : data.id
      }`
    );
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
