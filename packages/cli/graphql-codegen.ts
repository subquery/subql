import type {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://gateway.subquery.network/query/QmQqqmwwaBben8ncfHo3DMnDxyWFk5QcEdTmbevzKj7DBd',
  documents: 'src/controller/network/graphql/*.ts',
  generates: {
    'src/controller/network/gql/': {
      preset: 'client',
      plugins: [],
    },
    './graphql.schema.json': {
      plugins: ['introspection'],
    },
  },
};

export default config;
