// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import path from 'path';
import {DeploymentType} from './types';

//DEPLOYMENT
export const DEFAULT_DEPLOYMENT_TYPE = 'primary' satisfies DeploymentType;
//PROJECT
export const ROOT_API_URL_PROD = 'https://index-api.onfinality.io';
export const BASE_PROJECT_URL = 'https://indexing.onfinality.io';

export const BASE_TEMPLATE_URl = 'https://templates.subquery.network';

// Regex for cold tsManifest
export const ENDPOINT_REG = /endpoint:\s*(\[[^\]]+\]|['"`][^'"`]+['"`])/;
export const ADDRESS_REG = /address\s*:\s*['"]([^'"]+)['"]/;
export const TOPICS_REG = /topics:\s*(\[[^\]]+\]|['"`][^'"`]+['"`])/;
export const FUNCTION_REG = /function\s*:\s*['"]([^'"]+)['"]/;
export const CHAIN_ID_REG = /chainId:\s*(\[[^\]]+\]|['"`][^'"`]+['"`])/;
export const CAPTURE_CHAIN_ID_REG = /chainId:\s*("([^"]*)"|(?<!")(\d+))/;

const rootPath = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
assert(
  rootPath,
  'Cannot determine root path, please create an issue and include your OS. https://github.com/subquery/subql/issues/new'
);
export const ACCESS_TOKEN_PATH = path.resolve(rootPath, '.subql/SUBQL_ACCESS_TOKEN');
export const WALLET_CONNECT_STORE_PATH = path.resolve(rootPath, '.subql/wallet-connect.json');

export const DEFAULT_SUBGRAPH_MANIFEST = 'subgraph.yaml';
export const DEFAULT_SUBGRAPH_SCHEMA = 'schema.graphql';
export const DEFAULT_SUBQL_MANIFEST = 'project.ts';
export const DEFAULT_SUBQL_SCHEMA = 'schema.graphql';
