// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DataTypes, Model, ModelAttributes} from '@subql/x-sequelize';
import {addIdAndBlockRangeAttributes} from '../db';
import {StoreService} from './store.service';

describe('Store Service', () => {
  let storeService: StoreService;

  it('addIdAndBlockRangeAttributes', () => {
    storeService = new StoreService(null as any, null as any, null as any, null as any);
    const attributes = {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
    } as ModelAttributes<Model<any, any>, any>;
    addIdAndBlockRangeAttributes(attributes);
    expect(Object.keys(attributes).length).toEqual(3);
    expect((attributes.id as any).primaryKey).toEqual(false);
    expect(attributes.__id).toEqual({
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    });
    expect(attributes.__block_range).toEqual({
      type: DataTypes.RANGE(DataTypes.BIGINT),
      allowNull: false,
    });
  });

  it('could find indexed field', () => {
    storeService = new StoreService(null as any, null as any, null as any, null as any);
    (storeService as any).__modelIndexedFields = [
      {
        entityName: 'MinerIP', // This is a special case that upperFirst and camelCase will fail
        fieldName: 'net_uid',
        isUnique: false,
        type: 'btree',
      },
      {
        entityName: 'MinerColdkey',
        fieldName: 'net_uid',
        isUnique: false,
        type: 'btree',
      },
    ];
    expect(() => storeService.isIndexed('MinerIP', 'netUid')).toBeTruthy();
  });

  it('isIndexed support snake case', () => {
    storeService = new StoreService(null as any, null as any, null as any, null as any);
    (storeService as any)._modelIndexedFields = [
      {
        entityName: 'Transfer',
        fieldName: 'account_from_id',
        isUnique: false,
        type: 'btree',
      },
      {
        entityName: 'Transfer',
        fieldName: 'account_to_id',
        isUnique: false,
        type: 'btree',
      },
    ];

    expect(storeService.isIndexed('Transfer', 'account_fromId')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountToId')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountToId2')).toEqual(false);
    expect(storeService.isIndexed('Transfer2', 'accountToId')).toEqual(false);
  });

  it('isIndexedHistorical support snake case', () => {
    storeService = new StoreService(null as any, null as any, null as any, null as any);
    (storeService as any)._historical = false;
    (storeService as any)._modelIndexedFields = [
      {
        entityName: 'Transfer',
        fieldName: 'account_from_id',
        isUnique: true,
        type: 'btree',
      },
      {
        entityName: 'Transfer',
        fieldName: 'account_to_id',
        isUnique: true,
        type: 'btree',
      },
      {
        entityName: 'Transfer',
        fieldName: 'not_index_id',
        isUnique: false,
        type: 'btree',
      },
    ];

    expect(storeService.isIndexedHistorical('Transfer', 'account_fromId')).toEqual(true);
    expect(storeService.isIndexedHistorical('Transfer', 'accountToId')).toEqual(true);

    expect(storeService.isIndexedHistorical('Transfer', 'accountToId2')).toEqual(false);
    expect(storeService.isIndexedHistorical('Transfer2', 'accountToId')).toEqual(false);

    expect(storeService.isIndexedHistorical('Transfer', 'not_index_id')).toEqual(false);
  });
});
