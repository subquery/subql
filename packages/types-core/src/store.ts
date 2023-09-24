// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

type SingleOperators = '=' | '!=';
type ArrayOperators = 'in' | '!in';
export type FieldOperators = SingleOperators | ArrayOperators;

export type FieldsExpression<T> =
  | [field: keyof T, operator: SingleOperators, value: T[keyof T]]
  | [field: keyof T, operator: ArrayOperators, value: Array<T[keyof T]>];


export interface Entity {
  id: string;
  _name?: string;
  save?: () => Promise<void>;
}

export interface Store {
  get(entity: string, id: string): Promise<Entity | undefined>;
  getByFields<T extends Entity>(
    entity: string,
    filter: FieldsExpression<T>[],
    options?: {offset?: number; limit?: number}
  ): Promise<T[]>;
  getByField(entity: string, field: string, value: any, options?: {offset?: number; limit?: number}): Promise<Entity[]>;
  getOneByField(entity: string, field: string, value: any): Promise<Entity | undefined>;
  set(entity: string, id: string, data: Entity): Promise<void>;
  bulkCreate(entity: string, data: Entity[]): Promise<void>;
  //if fields in provided, only specify fields will be updated
  bulkUpdate(entity: string, data: Entity[], fields?: string[]): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
  bulkRemove(entity: string, ids: string[]): Promise<void>;
}
