import {buildSchema} from './graphql/schema';
import {getAllEntities} from './graphql/entities';

export async function main() {
  const schema = await buildSchema('./schema.graphql');
  const entites = getAllEntities(schema);
  return entites;
}
