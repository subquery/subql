// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface GraphQLModelsRelations{

    models: GraphQLModelsType[];

    relations: GraphQLRelationsType[]

}

export interface GraphQLModelsType {

    name: string

    fields: GraphQLEntityField[]
}


export interface GraphQLEntityField {

    name: string;

    type: keyof typeof FieldScalar

    isArray: boolean;

    nullable: boolean;
}


export interface GraphQLRelationsType {

    from: string;

    type: 'hasOne'| 'hasMany' | 'belongsTo';

    to: string;

    foreignKey: string;

    fieldName?: string;
}

export enum FieldScalar {
    ID = 'ID',
    Int = 'Int',
    BigInt = 'BigInt',
    String = 'String',
    Date = 'Date'
}



