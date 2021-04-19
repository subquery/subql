// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface GraphQLJsonObjectType {
  name: string;
  fields: GraphQLJsonFieldType[];
}

export interface GraphQLJsonFieldType {
  name: string;
  type: Exclude<keyof typeof FieldScalar, 'ID'> | 'Json';
  jsonInterface?: GraphQLJsonObjectType;
  nullable: boolean;
  isArray: boolean;
}

export interface GraphQLModelsRelations {
  models: GraphQLModelsType[];

  relations: GraphQLRelationsType[];
}

export interface GraphQLModelsType {
  name: string;

  fields: GraphQLEntityField[];

  indexes: GraphQLEntityIndex[];
}

export interface GraphQLEntityField {
  name: string;

  type: keyof typeof FieldScalar | 'Json';

  jsonInterface?: GraphQLJsonObjectType;

  isArray: boolean;

  nullable: boolean;
}

enum IndexType {
  BTREE = 'btree',
  HASH = 'hash',
  GIST = 'gist',
  SPGIST = 'spgist',
  GIN = 'gin',
  BRIN = 'brin',
}

export interface GraphQLEntityIndex {
  fields: string[];

  unique?: boolean;

  type?: IndexType;
}

export interface GraphQLRelationsType {
  from: string;

  type: 'hasOne' | 'hasMany' | 'belongsTo';

  to: string;

  foreignKey: string;

  fieldName?: string;
}

export enum FieldScalar {
  ID = 'ID',
  Int = 'Int',
  BigInt = 'BigInt',
  String = 'String',
  Date = 'Date',
  Boolean = 'Boolean',
}
