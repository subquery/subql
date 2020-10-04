import {GraphQLSchema, GraphQLNamedType} from 'graphql';
import {DirectiveName} from "./constant";

export function getAllEntities(schema: GraphQLSchema): GraphQLNamedType[] {
  return Object.entries( schema.getTypeMap() )
    .filter(([typeName, node]) =>
      node.astNode?.directives?.find(({name: {value}})=>value === DirectiveName.Entity))
    .map(([typeName, node]) => node)
  ;
}

// TODO: GraphQLNamedType -> EntitySchema
