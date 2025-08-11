// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://gateway.subquery.network/query/QmQqqmwwaBben8ncfHo3DMnDxyWFk5QcEdTmbevzKj7DBd',
  documents: 'src/controller/network/queries/*.graphql',
  config: {
    namingConvention: {
      enumValues: 'keep',
    },
    preResolveTypes: true,
    avoidOptionals: true,
    nonOptionalTypename: true,
    skipTypeNameForRoot: true,
    immutableTypes: true,
    scalars: {
      Date: 'Date',
      Datetime: 'Date',
      BigFloat: 'bigint' || 'string',
      BigInt: 'bigint',
      Cursor: 'string',
    },
  },
  generates: {
    'src/controller/network/__graphql__/base-types.ts': {
      plugins: ['typescript', 'typescript-operations'],
    },
    src: {
      preset: 'near-operation-file',
      config: {
        importOperationTypesFrom: 'Types',
      },
      presetConfig: {
        folder: '../__graphql__/network',
        extensions: '.generated.ts',
        baseTypesPath: 'controller/network/__graphql__/base-types.ts',
      },
      plugins: ['typescript-document-nodes'],
    },
  },
};

export default config;
