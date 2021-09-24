// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { u8aConcat, numberToU8a, u8aToBuffer, isString } from '@polkadot/util';
import { GraphQLModelsType } from '@subql/common/graphql/types';
import { Entity } from '@subql/types';
import MerkleTools from 'merkle-tools';
import { OperationEntity, OperationType } from './types';

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
      const operationModel = this.models.find(
        ({ name }) => name === operation.entityType,
      );
      for (const field of operationModel.fields) {
        const fieldValue = operation.data[field.name];
        dataBufferArray.push(Buffer.from(field.name));
        if (fieldValue !== undefined && fieldValue !== null) {
          switch (field.type) {
            case 'Date':
              dataBufferArray.push(
                Buffer.from(numberToU8a(fieldValue.getTime())),
              );
              break;
            case 'BigInt':
              dataBufferArray.push(Buffer.from(fieldValue.toString()));
              break;
            case 'ID':
              dataBufferArray.push(Buffer.from(fieldValue.toString()));
              break;
            case 'Int':
              dataBufferArray.push(numberToU8a(fieldValue.toString()));
              break;
            case 'Boolean':
              dataBufferArray.push(
                Buffer.from(numberToU8a(fieldValue ? 1 : 0)),
              );
              break;
            case 'String':
              dataBufferArray.push(Buffer.from(fieldValue.toString()));
              break;
            default:
              dataBufferArray.push(Buffer.from(JSON.stringify(fieldValue)));
              break;
          }
        }
      }
    }
    return u8aConcat(
      Buffer.from(operation.operation),
      Buffer.from(operation.entityType),
      ...dataBufferArray,
    );
  }

  put(operation: OperationType, entity: string, data: Entity | string): void {
    const operationEntity: OperationEntity = {
      operation: operation,
      entityType: entity,
      data: data,
    };
    this.merkleTools.addLeaf(
      u8aToBuffer(this.operationEntityToUint8Array(operationEntity)),
    );
  }

  reset(): void {
    this.merkleTools.resetTree();
  }

  makeOperationMerkleTree() {
    this.merkleTools.makeTree();
  }

  getOperationMerkleRoot(): Uint8Array {
    if (this.merkleTools.getTreeReadyState()) {
      return this.merkleTools.getMerkleRoot();
    } else {
      throw new Error(
        `Failed to get Merkle root from operations, tree is not built yet`,
      );
    }
  }

  getOperationLeafCount() {
    return this.merkleTools.getLeafCount();
  }
}
