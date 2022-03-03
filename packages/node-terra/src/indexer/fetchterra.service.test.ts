// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SubqlTerraDatasourceKind,
  SubqlTerraHandlerKind,
} from '@subql/types-terra';
import { GraphQLSchema } from 'graphql';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { ApiTerraService } from './apiterra.service';
import { TerraDictionaryService } from './dictionaryterra.service';
import { FetchTerraService } from './fetchterra.service';
import { TerraDsProcessorService } from './terrads-processor.service';

const ENDPOINT = 'https://terra.stakesystems.io';
const CHAIN_ID = 'columbus-5';

function testTerraProject(): SubqueryTerraProject {
  return {
    network: {
      endpoint: ENDPOINT,
      chainId: CHAIN_ID,
    },
    dataSources: [
      {
        name: 'runtime',
        kind: SubqlTerraDatasourceKind.Runtime,
        startBlock: 6000000,
        mapping: {
          file: '',
          entryScript: '',
          handlers: [
            { handler: 'handleTest', kind: SubqlTerraHandlerKind.Block },
          ],
        },
      },
    ],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

jest.setTimeout(200000);

async function createFetchService(
  project = testTerraProject(),
  batchSize = 5,
): Promise<FetchTerraService> {
  const apiService = new ApiTerraService(project, {} as any);
  await apiService.init();
  const dsPluginService = new TerraDsProcessorService(project);
  const dictionaryService = new TerraDictionaryService(project);
  return new FetchTerraService(
    apiService,
    new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
    project,
    dictionaryService,
    dsPluginService,
    new EventEmitter2(),
  );
}

describe('FetchService', () => {
  let fetchService: FetchTerraService;
  //
  // afterEach(() => {
  //   return (
  //     fetchService as unknown as any
  //   )?.apiService?.onApplicationShutdown();
  // });

  it('fetch blocks', async () => {
    const batchSize = 5;
    const project = testTerraProject();

    fetchService = await createFetchService(project, batchSize);
    await fetchService.init();

    const loopPromise = fetchService.startLoop(6684553);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      if (Number(content.block.block.header.height) === 6684563) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
  }, 500000);
});
