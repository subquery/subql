// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Flags} from '@oclif/core';
import {FlagInput} from '@oclif/core/lib/interfaces/parser';
import axios, {Axios} from 'axios';
import chalk from 'chalk';
import {BASE_PROJECT_URL, DEFAULT_DEPLOYMENT_TYPE, ROOT_API_URL_PROD} from '../constants';
import {
  DeploymentDataType,
  ProjectDataType,
  QueryAdvancedOpts,
  V3DeploymentIndexerType,
  V3DeploymentInput,
  ValidateDataType,
  ProjectDeploymentInterface,
  GenerateDeploymentChainInterface,
  DeploymentFlagsInterface,
  MultichainDataFieldType,
} from '../types';
import {buildProjectKey, errorHandle} from '../utils';

function getAxiosInstance(url: string, authToken?: string): Axios {
  const headers: Record<string, string> = {};

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return axios.create({
    baseURL: url,
    headers,
  });
}

export async function createDeployment(
  org: string,
  projectName: string,
  authToken: string,
  ipfsCID: string,
  queryImageVersion: string,
  type: string,
  query: QueryAdvancedOpts,
  chains: V3DeploymentIndexerType[],
  url: string
): Promise<DeploymentDataType> {
  try {
    const res = await getAxiosInstance(url, authToken).post(
      `v3/subqueries/${buildProjectKey(org, projectName)}/deployments`,
      {
        cid: ipfsCID,
        type: type,
        queryImageVersion: queryImageVersion,
        queryAdvancedSettings: {query},
        chains,
      } as V3DeploymentInput
    );
    return res.data.deployment;
  } catch (e) {
    throw errorHandle(e, 'Error deploying to hosted service:');
  }
}

export async function promoteDeployment(
  org: string,
  projectName: string,
  authToken: string,
  deploymentId: number,
  url: string
): Promise<string> {
  try {
    await getAxiosInstance(url, authToken).post(
      `subqueries/${buildProjectKey(org, projectName)}/deployments/${deploymentId}/release`
    );
    return `${deploymentId}`;
  } catch (e) {
    throw errorHandle(e, 'Failed to promote project:');
  }
}

export async function deleteDeployment(
  org: string,
  projectName: string,
  authToken: string,
  deploymentId: number,
  url: string
): Promise<string> {
  try {
    await getAxiosInstance(url, authToken).delete(
      `subqueries/${buildProjectKey(org, projectName)}/deployments/${deploymentId}`
    );
    return `${deploymentId}`;
  } catch (e) {
    throw errorHandle(e, 'Failed to delete deployment:');
  }
}

export async function deploymentStatus(
  org: string,
  projectName: string,
  authToken: string,
  deployID: number,
  url: string
): Promise<string> {
  try {
    const res = await getAxiosInstance(url, authToken).get<{status: string}>(
      `subqueries/${buildProjectKey(org, projectName)}/deployments/${deployID}/status`
    );
    return `${res.data.status}`;
  } catch (e) {
    throw errorHandle(e, 'Failed to get deployment status:');
  }
}

export async function projectsInfo(
  authToken: string,
  org: string,
  projectName: string,
  url: string,
  type: string
): Promise<ProjectDataType> {
  const key = `${org}/${projectName}`;
  try {
    const res = await getAxiosInstance(url, authToken).get<ProjectDataType[]>(
      `subqueries/${buildProjectKey(org, projectName)}/deployments`
    );
    const info = res.data.find((element) => element.projectKey === `${key}` && element.type === type);
    assert(info, `Project ${key} not found`);
    return info;
  } catch (e) {
    throw errorHandle(e, 'Failed to get projects:');
  }
}

export async function updateDeployment(
  org: string,
  projectName: string,
  deployID: number,
  authToken: string,
  ipfsCID: string,
  queryVersion: string,
  query: QueryAdvancedOpts,
  chains: V3DeploymentIndexerType[],
  url: string
): Promise<void> {
  try {
    await getAxiosInstance(url, authToken).put(
      `v3/subqueries/${buildProjectKey(org, projectName)}/deployments/${deployID}`,
      {
        cid: ipfsCID,
        queryImageVersion: queryVersion,
        queryAdvancedSettings: {query},
        chains,
      } as V3DeploymentInput
    );
  } catch (e) {
    throw errorHandle(e, `Failed to redeploy project: ${(e as any).message}`);
  }
}

export async function ipfsCID_validate(
  cid: string | undefined,
  authToken: string,
  url: string
): Promise<ValidateDataType> {
  assert(cid, 'IPFS CID is required');
  try {
    const res = await getAxiosInstance(url, authToken).post<ValidateDataType>(`ipfs/deployment-id/${cid}/validate`);

    if (res.status === 500) {
      throw new Error((res.data as unknown as {message: string}).message);
    }

    return res.data;
  } catch (e) {
    throw errorHandle(e, 'Failed to validate IPFS CID:');
  }
}

export async function dictionaryEndpoints(url: string): Promise<EndpointType[]> {
  try {
    const res = await getAxiosInstance(url).get<EndpointType[]>(`subqueries/dictionaries`);

    return res.data;
  } catch (e) {
    throw errorHandle(e, 'Failed to get dictionary endpoint:');
  }
}

export function processEndpoints(endpoints: EndpointType[], chainId: string): string | undefined {
  return endpoints.find((endpoint: EndpointType) => endpoint.chainId === chainId)?.endpoint;
}

export async function imageVersions(name: string, version: string, authToken: string, url: string): Promise<string[]> {
  try {
    const res = await getAxiosInstance(url, authToken).get<string[]>(
      `info/images/${encodeURIComponent(name)}?version=${encodeURIComponent(version)}`
    );
    return res.data;
  } catch (e) {
    throw errorHandle(e, 'Failed to get image:');
  }
}

export function splitEndpoints(endpointStr: string): string[] {
  return endpointStr.split(',').map((e) => e.trim());
}

export interface EndpointType {
  network: string;
  endpoint: string;
  chainId: string;
}

export function splitMultichainDataFields(fieldStr = ''): MultichainDataFieldType {
  const result: MultichainDataFieldType = {};

  splitEndpoints(String(fieldStr)).forEach((unparsedRow) => {
    const regexpResult = unparsedRow.match(/(.*?):(.*)/);
    if (regexpResult) {
      const regexpRes = Object.values(regexpResult);
      if (regexpRes && regexpRes.length === 6 && ['http', 'https', 'ws', 'wss'].indexOf(regexpRes[1]) === -1) {
        result[regexpRes[1]] = regexpRes[2];
      }
    }
  });

  return result;
}

export const DefaultDeployFlags = {
  org: Flags.string({description: 'Enter organization name'}),
  projectName: Flags.string({description: 'Enter project name'}),
  // ipfsCID: Flags.string({description: 'Enter IPFS CID'}),

  type: Flags.string({options: ['stage', 'primary'], default: DEFAULT_DEPLOYMENT_TYPE, required: false}),
  indexerVersion: Flags.string({description: 'Enter indexer-version', required: false}),
  queryVersion: Flags.string({description: 'Enter query-version', required: false}),
  dict: Flags.string({description: 'Enter dictionary', required: false}),
  endpoint: Flags.string({description: 'Enter endpoint', required: false}),
  //indexer set up flags
  indexerUnsafe: Flags.boolean({description: 'Enable indexer unsafe', required: false}),
  indexerBatchSize: Flags.integer({description: 'Enter batchSize from 1 to 30', required: false}),
  indexerSubscription: Flags.boolean({description: 'Enable Indexer subscription', required: false}),
  disableHistorical: Flags.boolean({description: 'Disable Historical Data', required: false}),
  indexerUnfinalized: Flags.boolean({
    description: 'Index unfinalized blocks (requires Historical to be enabled)',
    required: false,
  }),
  indexerStoreCacheThreshold: Flags.integer({
    description: 'The number of items kept in the cache before flushing',
    required: false,
  }),
  disableIndexerStoreCacheAsync: Flags.boolean({
    description: 'If enabled the store cache will flush data asynchronously relative to indexing data.',
    required: false,
  }),
  indexerWorkers: Flags.integer({description: 'Enter worker threads from 1 to 5', required: false, max: 5}),

  //query flags
  queryUnsafe: Flags.boolean({description: 'Enable indexer unsafe', required: false}),
  querySubscription: Flags.boolean({description: 'Enable Query subscription', required: false}),
  queryTimeout: Flags.integer({description: 'Enter timeout from 1000ms to 60000ms', required: false}),
  queryMaxConnection: Flags.integer({description: 'Enter MaxConnection from 1 to 10', required: false}),
  queryAggregate: Flags.boolean({description: 'Enable Aggregate', required: false}),
  queryLimit: Flags.integer({description: 'Set the max number of results the query service returns', required: false}),

  useDefaults: Flags.boolean({
    char: 'd',
    description: 'Use default values for indexerVersion, queryVersion, dictionary, endpoint',
    required: false,
  }),
} satisfies FlagInput<DeploymentFlagsInterface>;

export function generateDeploymentChain(row: GenerateDeploymentChainInterface): V3DeploymentIndexerType {
  return {
    cid: row.cid,
    dictEndpoint: row.dictEndpoint,
    endpoint: row.endpoint,
    indexerImageVersion: row.indexerImageVersion,
    indexerAdvancedSettings: {
      indexer: {
        unsafe: row.flags.indexerUnsafe,
        batchSize: row.flags.indexerBatchSize,
        subscription: row.flags.indexerSubscription,
        historicalData: !row.flags.disableHistorical,
        unfinalizedBlocks: row.flags.indexerUnfinalized,
        storeCacheThreshold: row.flags.indexerStoreCacheThreshold,
        disableStoreCacheAsync: row.flags.disableIndexerStoreCacheAsync,
      },
    },
    extraParams: row.flags.indexerWorkers
      ? {
          workers: {
            num: row.flags.indexerWorkers,
          },
        }
      : {},
  };
}

export function generateAdvancedQueryOptions(flags: DeploymentFlagsInterface): QueryAdvancedOpts {
  return {
    unsafe: !!flags.queryUnsafe,
    subscription: !!flags.querySubscription,
    queryTimeout: Number(flags.queryTimeout),
    queryLimit: flags.queryLimit ? Number(flags.queryLimit) : undefined,
    // maxConnection: Number(flags.queryMaxConnection), // project version or plan does not support maxConnection
    aggregate: !!flags.queryAggregate,
  };
}

export async function executeProjectDeployment(data: ProjectDeploymentInterface): Promise<DeploymentDataType | void> {
  if (data.projectInfo !== undefined) {
    await updateDeployment(
      data.org,
      data.projectName,
      data.projectInfo.id,
      data.authToken,
      data.ipfsCID,
      data.queryVersion,
      generateAdvancedQueryOptions(data.flags),
      data.chains,
      ROOT_API_URL_PROD
    );
    data.log(`Project: ${data.projectName} has been re-deployed`);
  } else {
    const deploymentOutput: DeploymentDataType = await createDeployment(
      data.org,
      data.projectName,
      data.authToken,
      data.ipfsCID,
      data.queryVersion,
      data.flags.type,
      generateAdvancedQueryOptions(data.flags),
      data.chains,
      ROOT_API_URL_PROD
    ).catch((e) => {
      throw e;
    });

    if (deploymentOutput) {
      data.log(`Project: ${deploymentOutput.projectKey}
      \nStatus: ${chalk.blue(deploymentOutput.status)}
      \nDeploymentID: ${deploymentOutput.id}
      \nDeployment Type: ${deploymentOutput.type}
      \nIndexer version: ${deploymentOutput.indexerImage}
      \nQuery version: ${deploymentOutput.queryImage}
      \nEndpoint: ${deploymentOutput.endpoint}
      \nDictionary Endpoint: ${deploymentOutput.dictEndpoint}
      \nQuery URL: ${deploymentOutput.queryUrl}
      \nProject URL: ${BASE_PROJECT_URL}/project/${deploymentOutput.projectKey}
      \nAdvanced Settings for Query: ${JSON.stringify(deploymentOutput.configuration.config.query)}
      \nAdvanced Settings for Indexer: ${JSON.stringify(deploymentOutput.configuration.config.indexer)}
      `);
    }
    return deploymentOutput;
  }
}
