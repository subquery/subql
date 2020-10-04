import {loadSchema} from '@graphql-tools/load';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import {Source, parse, extendSchema, GraphQLSchema} from 'graphql';
import path from 'path';
import fs from 'fs';

export async function loadBaseSchema(): Promise<GraphQLSchema> {
  return loadSchema(path.join(__dirname , 'schema/*.ts'), { // load from multiple files using glob
    loaders: [
      new CodeFileLoader()
    ]
  });
}

export async function buildSchema(path: string): Promise<GraphQLSchema> {
  const src = new Source(fs.readFileSync(path).toString());
  const doc = parse(src);
  return extendSchema(await loadBaseSchema(), doc);
}
