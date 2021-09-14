// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { PoiService } from './poi.service';
import { PoiBlock } from './PoiBlock';

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject();
  project.network = {
    endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    dictionary: 'https://api.subquery.network/sq/subquery/dictionary-polkadot',
    types: {
      TestType: 'u32',
    },
  };
  project.dataSources = [];
  return project;
}
jest.mock('sequelize', () => {
  const mSequelize = {
    authenticate: jest.fn(),
    define: jest.fn(),
  };
  const actualSequelize = jest.requireActual('sequelize');
  return {
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: actualSequelize.DataTypes,
  };
});

const mSequelizeContext = new Sequelize();

const testPoiService = new PoiService(
  new NodeConfig({ subquery: '', subqueryName: '' }),
  testSubqueryProject(),
  mSequelizeContext,
);

const poiBlock = PoiBlock.create(
  10012312,
  Buffer.from(
    `0x1dd4cbc8deb7fb5eb52a5d48bffbdd773016c48cf5018dd9a26f5b51e5245bd6`,
  ),
  Buffer.from('remove-1'),
  Buffer.from('0x00', 'hex'),
  'testProject',
);
const poiBlock2 = PoiBlock.create(
  10012313,
  Buffer.from(
    `0x1dd4cbc8deb7fb5eb52a5d48bffbdd773016c48cf5018dd9a26f5b51e5245bd7`,
  ),
  Buffer.from('remove-2'),
  Buffer.from('0x00', 'hex'),
  'testProject',
);

describe('Proof of index service', () => {
  it('open or create a fd mmr, and append a poiBlock as node to a fd mmr', async () => {
    const projectMmrPath = path.join(process.cwd(), `./mmrs/test.mmr`);
    testPoiService.ensureFileBasedMmr(projectMmrPath);
    await testPoiService.appendMmrNode(poiBlock);
    const mmrMeta = await testPoiService.getMmrMeta();
    console.log(`node length: ${mmrMeta.nodeLength}`);
    console.log(`leaf length: ${mmrMeta.leafLength}`);
  });

  it('get latest mmr', async () => {
    const projectMmrPath = path.join(process.cwd(), `./mmrs/test.mmr`);
    await testPoiService.ensureFileBasedMmr(projectMmrPath);
    const mmrMeta = await testPoiService.getMmrMeta();
    // const mmr = await testPoiService.getLatestMmr();
    console.log(`node length: ${mmrMeta.nodeLength}`);
    console.log(`leaf length: ${mmrMeta.leafLength}`);
    // console.log(`${mmr.toString('hex')}`)
  });
});
