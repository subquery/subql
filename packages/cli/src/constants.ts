// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

//DEPLOYMENT
export const DEFAULT_DEPLOYMENT_TYPE = 'primary';
//PROJECT
export const ROOT_API_URL_DEV = 'https://api.thechaindata.com';
export const ROOT_API_URL_PROD = 'https://api.subquery.network';

export const BASE_PROJECT_URL = 'https://project.subquery.network';

export const BASE_TEMPLATE_URl = 'https://templates.subquery.network';

// Regex for cold tsManifest
export const ENDPOINT_REG = /endpoint:\s*(\[[^\]]+\]|['"`][^'"`]+['"`])/;
export const ADDRESS_REG = /address\s*:\s*['"]([^'"]+)['"]/;
