// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { ReaderFactory } from '@subql/common';

import { SubqueryProject } from './SubqueryProject';

describe('SubqueryProject', () => {
  describe('convert manifest to project object', () => {
    let projectDirV0_0_1: string;
    let projectDirV0_2_0: string;
    let projectDirV0_3_0: string;

    beforeEach(() => {
      projectDirV0_0_1 = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.0.1',
      );

      projectDirV0_2_0 = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.2.0',
      );

      projectDirV0_3_0 = path.resolve(
        __dirname,
        '../../test/projectFixture/v0.3.0',
      );
    });
    it('convert 0.0.1 to project object', () => {
      expect(() => SubqueryProject.create(projectDirV0_0_1)).not.toThrow();
    });

    it('load 0.0.1 chain types', async () => {
      const project = await SubqueryProject.create(projectDirV0_0_1);
      console.log(project.chainTypes);
    });

    it('convert local 0.2.0 manifest to project object', async () => {
      const reader = await ReaderFactory.create(projectDirV0_2_0);
      //manually pass the endpoint
      const project = await SubqueryProject.create(projectDirV0_2_0, {
        endpoint: 'wss://rpc.polkadot.io/public-ws',
      });
      expect((project.dataSources[1] as any).processor.file).toMatch(
        /moonbeam.js/,
      );
    }, 5000000);

    it('convert local 0.3.0 manifest to project object', async () => {
      const reader = await ReaderFactory.create(projectDirV0_3_0);
      //manually pass the endpoint
      const project = await SubqueryProject.create(projectDirV0_3_0, {
        endpoint: 'wss://rpc.polkadot.io/public-ws',
      });
      expect((project.dataSources[1] as any).processor.file).toMatch(
        /moonbeam.js/,
      );
    }, 5000000);

    it.skip('convert 0.2.0 ipfs deployment to project object', async () => {
      const deployment = `ipfs://QmUdQKsfHox5qcEYKCVZQwWtye8bdGQM2vCZrw6o4NBKwm`;
      //manually pass the endpoint
      const project = await SubqueryProject.create(
        deployment,
        { endpoint: 'wss://rpc.polkadot.io/public-ws' },
        { ipfs: 'http://127.0.0.1:8080' },
      );
    }, 5000000);
  });
});
