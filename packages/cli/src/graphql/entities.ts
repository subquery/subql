import {GraphQLSchema, GraphQLNamedType, GraphQLObjectType, isObjectType} from 'graphql'
import {DirectiveName} from './constant'

export function getAllEntities(schema: GraphQLSchema): GraphQLObjectType[] {
  return Object.entries(schema.getTypeMap())
  .filter(([, node]) =>
      node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.Entity))
  .map(([, node]) => node)
  .filter(isObjectType)
}

// TODO: GraphQLNamedType -> EntitySchema
