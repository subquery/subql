import {Source, parse, extendSchema, GraphQLSchema, buildASTSchema} from 'graphql';
// import path = require('path')
import fs = require('fs');

import {scalas} from './schema/scalas';
import {directives} from './schema/directives';

export async function loadBaseSchema(): Promise<GraphQLSchema> {
  const schema = buildASTSchema(scalas);
  return extendSchema(schema, directives);
  // return loadSchema([scalas, directives], { // load from multiple files using glob
  //   loaders: [
  //     new CodeFileLoader(),
  //   ],
  // })
}

export async function buildSchema(path: string): Promise<GraphQLSchema> {
  const src = new Source(fs.readFileSync(path).toString());
  const doc = parse(src);
  return extendSchema(await loadBaseSchema(), doc);
}
