// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {GraphQLSchema, GraphQLObjectType, isObjectType} from 'graphql';
import {DirectiveName} from './constant';

export function getAllEntities(schema: GraphQLSchema): GraphQLObjectType[] {
  return Object.entries(schema.getTypeMap())
    .filter(([, node]) => node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.Entity))
    .map(([, node]) => node)
    .filter(isObjectType);
}

// TODO: GraphQLNamedType -> EntitySchema
