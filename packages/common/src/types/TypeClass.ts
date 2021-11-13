// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {DataTypes} from 'sequelize';
type ValueOf<T> = T[keyof T];
export type SequelizeTypes = string | ValueOf<typeof DataTypes>;

export class TypeClass {
  constructor(
    public name: string,
    private _hashCode: (data: unknown) => Uint8Array,
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
  hashCode(data: any): Uint8Array {
    if (this._hashCode === undefined) {
      return Buffer.from(JSON.stringify(data));
    }
    return this._hashCode(data);
  }
}
