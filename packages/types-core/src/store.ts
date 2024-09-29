// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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

export type GetOptions<T> = {
  /**
   * The number of items to return, if this exceeds the query-limit flag it will throw
   * */
  limit: number;
  offset?: number;
  orderBy?: keyof T;
  orderDirection?: 'ASC' | 'DESC';
};

export interface Store {
  get(entity: string, id: string): Promise<Entity | undefined>;
  /**
   * Gets entities matching the specified filters and options.
   *
   * ⚠️ This function will first search cache data followed by DB data. Please consider this when using order and offset options.⚠️
   * */
  getByFields<T extends Entity>(entity: string, filter: FieldsExpression<T>[], options: GetOptions<T>): Promise<T[]>;
  /**
   * This is an alias for getByFields with a single filter
   * */
  getByField<T extends Entity>(entity: string, field: keyof T, value: any, options: GetOptions<T>): Promise<T[]>;
  /**
   * This is an alias for getByField with limit set to 1
   * */
  getOneByField(entity: string, field: string, value: any): Promise<Entity | undefined>;
  set(entity: string, id: string, data: Entity): Promise<void>;
  bulkCreate(entity: string, data: Entity[]): Promise<void>;
  //if fields in provided, only specify fields will be updated
  bulkUpdate(entity: string, data: Entity[], fields?: string[]): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
  bulkRemove(entity: string, ids: string[]): Promise<void>;
}
