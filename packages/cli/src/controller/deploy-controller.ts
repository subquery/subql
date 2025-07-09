// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import axios, {Axios} from 'axios';

import chalk from 'chalk';
import {Logger, Prompt} from '../adapters/utils';
import {BASE_PROJECT_URL, ROOT_API_URL_PROD} from '../constants';
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
  DeploymentType,
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
  type: DeploymentType,
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
      } satisfies V3DeploymentInput
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
): Promise<ProjectDataType | undefined> {
  const key = `${org}/${projectName.toLowerCase()}`;
  try {
    const res = await getAxiosInstance(url, authToken).get<ProjectDataType[]>(
      `v3/subqueries/${buildProjectKey(org, projectName)}/deployments`
    );

    return res.data.find((element) => element.projectKey === `${key}` && element.type === type);
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

export async function executeProjectDeployment(
  data: ProjectDeploymentInterface
): Promise<DeploymentDataType | undefined> {
  // This should not happe, the commands that call this should set the query version
  if (!data.flags.queryVersion) {
    throw new Error('Query version is required');
  }
  if (data.projectInfo !== undefined) {
    await updateDeployment(
      data.flags.org,
      data.flags.projectName,
      data.projectInfo.id,
      data.authToken,
      data.ipfsCID,
      data.flags.queryVersion,
      generateAdvancedQueryOptions(data.flags),
      data.chains,
      ROOT_API_URL_PROD
    );
  } else {
    const deploymentOutput = await createDeployment(
      data.flags.org,
      data.flags.projectName,
      data.authToken,
      data.ipfsCID,
      data.flags.queryVersion,
      data.flags.type,
      generateAdvancedQueryOptions(data.flags),
      data.chains,
      ROOT_API_URL_PROD
    );

    return deploymentOutput;
  }
}

export async function promptImageVersion(
  runner: string,
  version: string,
  useDefaults: boolean | undefined,
  authToken: string,
  type: 'indexer' | 'query',
  prompt: Prompt | null
): Promise<string> {
  const versions = await imageVersions(runner, version, authToken, ROOT_API_URL_PROD);
  if (useDefaults) {
    return versions[0];
  }
  if (!prompt) {
    throw new Error(`${type} is required`);
  }

  return prompt({
    message: `Enter ${type} version for ${runner}`,
    type: 'string',
    options: versions,
    defaultValue: versions[0],
  });
}

export function logDeployment(logger: Logger, org: string, projectName: string, deploymentOutput?: DeploymentDataType) {
  if (deploymentOutput) {
    logger.info(`Project: ${deploymentOutput.projectKey}
  Status: ${chalk.blue(deploymentOutput.status)}
  DeploymentID: ${deploymentOutput.id}
  Deployment Type: ${deploymentOutput.type}
  Indexer version: ${deploymentOutput.indexerImage}
  Query version: ${deploymentOutput.queryImage}
  Endpoint: ${deploymentOutput.endpoint}
  Dictionary Endpoint: ${deploymentOutput.dictEndpoint}
  Query URL: ${deploymentOutput.queryUrl}
  Project URL: ${BASE_PROJECT_URL}/org/${org}/project/${projectName}
  Advanced Settings for Query: ${JSON.stringify(deploymentOutput.configuration.config.query)}
  Advanced Settings for Indexer: ${JSON.stringify(deploymentOutput.configuration.config.indexer)}
`);
  } else {
    logger.info(`Project: ${projectName} has been re-deployed`);
  }
}
