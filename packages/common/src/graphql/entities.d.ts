import { GraphQLEnumType, GraphQLObjectType, GraphQLSchema } from 'graphql';
import { GraphQLJsonObjectType, GraphQLModelsRelationsEnums } from './types';
export declare function getAllJsonObjects(_schema: GraphQLSchema | string): GraphQLObjectType[];
export declare function getAllEnums(_schema: GraphQLSchema | string): GraphQLEnumType[];
export declare function getAllEntitiesRelations(_schema: GraphQLSchema | string): GraphQLModelsRelationsEnums;
export declare function setJsonObjectType(jsonObject: GraphQLObjectType<unknown, unknown>, jsonObjects: GraphQLObjectType<unknown, unknown>[]): GraphQLJsonObjectType;
