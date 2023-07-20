// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DataTypes, Model, ModelAttributes} from '@subql/x-sequelize';
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
    storeService.addIdAndBlockRangeAttributes(attributes);
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
});
