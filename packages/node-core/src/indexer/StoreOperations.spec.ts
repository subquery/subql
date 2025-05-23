// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {GraphQLJsonFieldType, u8aToHex} from '@subql/utils';
import {StoreOperations} from './StoreOperations';
import {OperationType} from './types';

type StarterEntity = {
  id: string;
  field1: number;
  field2?: string;
  field3?: bigint;
  field4?: Date;
  field5?: boolean;
  field6?: any;
  field7?: number;
  createdAt: Date;
  updatedAt: Date;
};

const testOperations = [
  {
    operation: OperationType.Set,
    entityType: 'StarterEntity',
    data: {
      id: '0x2494bd5d089cf370c366351e851755ee42e8477df1c17ea1d9c2ae94e4f77ea8',
      field1: 41914,
    },
  },
  {
    operation: OperationType.Set,
    entityType: 'StarterEntity',
    data: <StarterEntity>{
      id: '0x2494bd5d089cf370c366351e851755ee42e8477df1c17ea1d9c2ae94e4f77ea8',
      field3: undefined,
      field1: 41914,
      field2: undefined,
      field4: new Date('2020-05-29T13:28:36.000Z'),
      field5: true,
      createdAt: new Date('2021-08-18T02:36:06.549Z'),
      updatedAt: new Date('2021-08-18T02:36:06.549Z'),
    },
  },
  {
    operation: OperationType.Set,
    entityType: 'StarterEntity',
    data: <StarterEntity>{
      id: '0x2494bd5d089cf370c366351e851755ee42e8477df1c17ea1d9c2ae94e4f77ea8',
      field3: undefined,
      field1: 41914,
      field2: undefined,
      field4: new Date('2020-05-29T13:28:36.000Z'),
      field5: true,
      createdAt: new Date('2021-08-18T02:36:06.549Z'),
      updatedAt: new Date('2021-08-18T02:36:06.549Z'),
    },
  },
  {
    operation: OperationType.Set,
    entityType: 'StarterEntity',
    data: <StarterEntity>{
      id: '0x2494bd5d089cf370c366351e851755ee42e8477df1c17ea1d9c2ae94e4f77ea8',
      field3: undefined,
      field1: 41914,
      field2: undefined,
      field4: new Date('2020-05-29T13:28:36.000Z'),
      field5: true,
      field6: {meat: 0, fruit: {apple: 'Apple'}},
      createdAt: new Date('2021-08-18T02:36:06.549Z'),
      updatedAt: new Date('2021-08-18T02:36:06.549Z'),
      field7: parseFloat('3.14'),
      field8: 'Foo',
    },
  },
  {
    operation: OperationType.Remove,
    entityType: 'StarterEntity',
    data: '0x2494bd5d089cf370c366351e851755ee42e8477df1c17ea1d9c2ae94e4f77ea8',
  },
];

// Single object in operations
const testOperations2 = [
  {
    operation: OperationType.Set,
    entityType: 'IndexEra',
    data: {
      id: '0x2494bd5d089cf370c366351e851755ee42e8477df1c17ea1d9c2ae94e4f77ea8',
      field1: 41914,
    },
  },
];

// negative in the field
const testOperations3 = [
  {
    operation: OperationType.Set,
    entityType: 'StarterEntity',
    data: {
      id: '0x2494bd5d089cf370c366351e851755ee42e8477df1c17ea1d9c2ae94e4f77ea8',
      field1: -1,
    },
  },
];

const falseOperation = {
  operation: OperationType.Remove,
  entityType: 'StarterEntity',
  data: <StarterEntity>{
    id: '0x2494bd5d089cf370c366351e851755ee42e8477df1c17ea1d9c2ae94e4f77ea8',
    field3: undefined,
    field1: 41914,
    field2: undefined,
    field4: new Date('2020-05-29T13:28:36.000Z'),
    field5: true,
    field6: {meat: 0, fruit: {apple: 'Apple'}},
    createdAt: new Date('2021-08-18T02:36:06.549Z'),
    updatedAt: new Date('2021-08-18T02:36:06.549Z'),
    field7: parseFloat('3.14'),
  },
};
const apple: GraphQLJsonFieldType = {
  name: 'apple',
  type: 'String',
  nullable: true,
  isArray: false,
};
const fruitJson: GraphQLJsonFieldType = {
  name: 'fruit',
  type: 'Json',
  jsonInterface: {name: 'Fruit', fields: [apple]},
  isArray: false,
  nullable: true,
};
const meatJson: GraphQLJsonFieldType = {
  name: 'meat',
  type: 'Int',
  nullable: true,
  isArray: false,
};
const models = [
  {
    name: 'StarterEntity',
    fields: [
      {
        name: 'id',
        type: 'ID',
        isArray: false,
        nullable: false,
        isEnum: false,
      },
      {
        name: 'field1',
        type: 'Int',
        isArray: false,
        nullable: false,
        isEnum: false,
      },
      {
        name: 'field2',
        type: 'String',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'field3',
        type: 'BigInt',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'field4',
        type: 'Date',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'field5',
        type: 'Boolean',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'field6',
        type: 'Json',
        jsonInterface: {name: 'Food', fields: [meatJson, fruitJson]},
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'field7',
        type: 'Float',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        type: 'TestEnum',
        description: 'Field description',
        isEnum: true,
        isArray: false,
        nullable: false,
        name: 'field8',
      },
    ],
    indexes: <any[]>[],
  },
  {
    name: 'IndexEra',
    fields: [
      {
        name: 'id',
        type: 'ID',
        isArray: false,
        nullable: false,
        isEnum: false,
      },
      {
        name: 'field1',
        type: 'Int',
        isArray: false,
        nullable: false,
        isEnum: false,
      },
    ],
    indexes: <any[]>[],
  },
];

describe('StoreOperations', () => {
  it('single leaf, expect merkleRoot to be hashed', () => {
    const operationStack = new StoreOperations(models);
    for (const o of testOperations2) {
      operationStack.put(o.operation, o.entityType, o.data);
    }

    operationStack.makeOperationMerkleTree();
    expect(operationStack.getOperationLeafCount()).toBe(1);
    const mRoot = operationStack.getOperationMerkleRoot();
    // To be hashed and 32 bytes long
    expect(mRoot?.length).toBe(32);
    console.log(`Root in hex: ${u8aToHex(mRoot)}`);
    operationStack.reset();
    expect(operationStack.getOperationLeafCount()).toBe(0);
  });

  it('put operation into the merkel leaf, and generate Merkle Root, also able to reset', () => {
    const operationStack = new StoreOperations(models);
    for (const o of testOperations) {
      operationStack.put(o.operation, o.entityType, o.data);
    }
    operationStack.makeOperationMerkleTree();
    expect(operationStack.getOperationLeafCount()).toBe(5);
    const mRoot = operationStack.getOperationMerkleRoot();
    expect(mRoot?.length).toBe(32);
    console.log(`Root in hex: ${u8aToHex(mRoot)}`);
    operationStack.reset();
    expect(operationStack.getOperationLeafCount()).toBe(0);
  });

  it('throw error when remove data is not string type', () => {
    const operationStack = new StoreOperations(models);

    expect(() => operationStack.put(falseOperation.operation, falseOperation.entityType, falseOperation.data)).toThrow(
      `Remove operation only accept data in string type`
    );
  });

  it('could generate operation hash with negative value', () => {
    const operationStack = new StoreOperations(models);
    for (const o of testOperations3) {
      operationStack.put(o.operation, o.entityType, o.data);
    }
    expect(() => operationStack.makeOperationMerkleTree()).not.toThrow();
  });
});
