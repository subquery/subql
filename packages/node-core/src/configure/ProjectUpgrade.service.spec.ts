// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ISubqueryProject} from '../indexer';
import {ProjectUpgradeSevice} from './ProjectUpgrade.service';

const demoProjects = [
  {
    dataSources: [{startBlock: 1}],
  },
  {
    parent: {
      block: 10,
      reference: '0',
    },
    dataSources: [{startBlock: 1}],
  },
  {
    parent: {
      block: 20,
      reference: '1',
    },
    dataSources: [{startBlock: 1}],
  },
  {
    parent: {
      block: 30,
      reference: '2',
    },
    dataSources: [{startBlock: 1}],
  },
  {
    parent: {
      block: 40,
      reference: '3',
    },
    dataSources: [{startBlock: 1}],
  },
  {
    parent: {
      block: 50,
      reference: '4',
    },
    dataSources: [{startBlock: 1}],
  },
] as ISubqueryProject[];

const loopProjects = [
  {
    parent: {
      block: 10,
      reference: '1',
    },
    dataSources: [{startBlock: 1}],
  },
  {
    parent: {
      block: 20,
      reference: '0',
    },
    dataSources: [{startBlock: 1}],
  },
] as ISubqueryProject[];

const futureProjects = [
  {
    dataSources: [{startBlock: 1}],
  },
  {
    parent: {
      block: 30,
      reference: '0',
    },
    dataSources: [{startBlock: 1}],
  },
  {
    parent: {
      block: 20,
      reference: '1',
    },
    dataSources: [{startBlock: 1}],
  },
] as ISubqueryProject[];

describe('Project Upgrades', () => {
  describe('Loading projects', () => {
    it('can load a project with no parents', async () => {
      const upgradeService = await ProjectUpgradeSevice.create(demoProjects[0], (id) =>
        Promise.resolve(demoProjects[parseInt(id, 10)])
      );

      expect(Object.keys(upgradeService.projects)).toEqual(['1']);
    });

    it('can load all parent projects', async () => {
      const upgradeService = await ProjectUpgradeSevice.create(demoProjects[5], (id) =>
        Promise.resolve(demoProjects[parseInt(id, 10)])
      );

      expect(Object.keys(upgradeService.projects)).toEqual(['1', '10', '20', '30', '40', '50']);
    });

    it('can handle projects that somehow refer to each other', async () => {
      await expect(
        ProjectUpgradeSevice.create(loopProjects[1], (id) => Promise.resolve(loopProjects[parseInt(id, 10)]))
      ).rejects.toThrow();
    });

    it('can load all parent projects upto startHeight', async () => {
      const upgradeService = await ProjectUpgradeSevice.create(
        demoProjects[5],
        (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
        21
      );

      expect(Object.keys(upgradeService.projects)).toEqual(['20', '30', '40', '50']);
    });

    it('can load all parent projects upto and including startHeight', async () => {
      const upgradeService = await ProjectUpgradeSevice.create(
        demoProjects[5],
        (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
        20
      );

      expect(Object.keys(upgradeService.projects)).toEqual(['20', '30', '40', '50']);
    });

    it('will throw if parent projects are not at an earlier height', async () => {
      await expect(
        ProjectUpgradeSevice.create(futureProjects[2], (id) => Promise.resolve(futureProjects[parseInt(id, 10)]))
      ).rejects.toThrow();
    });
  });

  describe('Getting projects for heights', () => {
    let upgradeService: ProjectUpgradeSevice<ISubqueryProject>;

    beforeAll(async () => {
      upgradeService = await ProjectUpgradeSevice.create(demoProjects[5], (id) =>
        Promise.resolve(demoProjects[parseInt(id, 10)])
      );
    });

    it('can get the latest project', () => {
      expect(upgradeService.getProject(100).parent?.block).toEqual(50);
    });

    it('gets the right project with an exact match', () => {
      expect(upgradeService.getProject(30).parent?.block).toEqual(30);
    });

    it('throws an error before the first project start height', () => {
      expect(() => upgradeService.getProject(-1)).toThrow();
    });
  });
});
