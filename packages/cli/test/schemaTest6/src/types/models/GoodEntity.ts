// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from '@subql/types';
import assert from 'assert';

import {Test} from '../enums';

export type GoodEntityProps = Omit<GoodEntity, NonNullable<FunctionPropertyNames<GoodEntity>> | '_name'>;

export class GoodEntity implements Entity {
  constructor(
    id: string,

    field1: number
  ) {
    this.id = id;

    this.field1 = field1;
  }

  public id: string;

  public field1: number;

  public field2?: string;

  public field3?: bigint;

  public field4?: Date;

  public field5?: Test;

  public field6?: number;

  get _name(): string {
    return 'goodEntity';
  }

  async save(): Promise<void> {
    let id = this.id;
    assert(id !== null, 'Cannot save GoodEntity entity without an ID');
    await store.set('goodEntity', id.toString(), this);
  }
  static async remove(id: string): Promise<void> {
    assert(id !== null, 'Cannot remove GoodEntity entity without an ID');
    await store.remove('goodEntity', id.toString());
  }

  static async get(id: string): Promise<GoodEntity | undefined> {
    assert(id !== null && id !== undefined, 'Cannot get GoodEntity entity without an ID');
    const record = await store.get('goodEntity', id.toString());
    if (record) {
      return this.create(record as GoodEntityProps);
    } else {
      return;
    }
  }

  static create(record: GoodEntityProps): GoodEntity {
    assert(typeof record.id === 'string', 'id must be provided');
    let entity = new this(
      record.id,

      record.field1
    );
    Object.assign(entity, record);
    return entity;
  }
}
