import { DocumentNode, GraphQLSchema } from 'graphql';
export declare function buildSchemaFromFile(path: string): GraphQLSchema;
export declare function buildSchemaFromString(raw: string): GraphQLSchema;
export declare function buildSchemaFromDocumentNode(doc: DocumentNode): GraphQLSchema;
