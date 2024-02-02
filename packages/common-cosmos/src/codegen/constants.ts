// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {TSBuilderInput, ContractFile} from '@cosmwasm/ts-codegen';
import {TelescopeOptions} from '@subql/x-cosmology-types';

export const TELESCOPE_OPTS: TelescopeOptions = {
  removeUnusedImports: true,
  interfaces: {
    enabled: false,
    useUnionTypes: false,
  },
  prototypes: {
    enabled: false,
    addTypeUrlToDecoders: true,
    addTypeUrlToObjects: true,
    excluded: {
      packages: [
        'amino',
        'gogoproto',
        // 'google.api',
        // 'ibc.core.port.v1',
        // 'ibc.core.types.v1',
      ],
      // query.proto can be removed, and it is unnecessary to generate types for them
      protos: ['**/query.proto'],
    },
    methods: {
      fromJSON: false,
      toJSON: false,

      encode: false,
      decode: false,
      fromPartial: false,

      toSDK: false,
      fromSDK: false,

      toAmino: false,
      fromAmino: false,
      fromProto: false,
      toProto: false,
    },
    parser: {
      keepCase: false,
    },
    typingsFormat: {
      duration: 'duration',
      timestamp: 'date',
      useExact: false,
      useDeepPartial: false,
    },
  },
  aminoEncoding: {
    enabled: false,
    exceptions: {},
  },
  lcdClients: {
    enabled: false,
  },
  rpcClients: {
    // unsure if needed
    enabled: false,
    camelCase: true,
  },
};

export const COSMWASM_OPTS = (outPath: string, contracts: (ContractFile | string)[]): TSBuilderInput => {
  return {
    contracts,
    outPath,
    options: {
      bundle: {
        enabled: false,
      },
      types: {
        enabled: true,
      },
      messageComposer: {
        enabled: true,
      },
    },
  };
};
