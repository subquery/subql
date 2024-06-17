// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {DataTypes} from '@subql/x-sequelize';
type ValueOf<T> = T[keyof T];
export type SequelizeTypes = string | ValueOf<typeof DataTypes>;

export class TypeClass<T extends string, D> {
  constructor(
    public name: T,
    private _hashCode: (data: D) => Uint8Array,
    private _tsType?: string,
    private _fieldScalar?: string,
    private _sequelizeType?: SequelizeTypes
  ) {}
  get tsType(): string | undefined {
    return this._tsType;
  }
  get fieldScalar(): string | undefined {
    return this._fieldScalar;
  }
  get sequelizeType(): SequelizeTypes {
    assert(this._sequelizeType !== undefined, `Type ${this.name} associated sequelize type is not supported`);
    return this._sequelizeType;
  }
  hashCode(data: D): Uint8Array {
    if (this._hashCode === undefined) {
      return Buffer.from(JSON.stringify(data));
    }
    return this._hashCode(data);
  }
}
