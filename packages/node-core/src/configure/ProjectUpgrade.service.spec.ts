// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ISubqueryProject} from '../indexer';
import {IProjectUpgradeService, ProjectUpgradeSevice, upgradableSubqueryProject} from './ProjectUpgrade.service';

const templateProject = {
  network: {
    chainId: '1',
  },
  dataSources: [{startBlock: 1}],
};

const demoProjects = [
  {
    ...templateProject,
  },
  {
    parent: {
      block: 10,
      reference: '0',
    },
    ...templateProject,
  },
  {
    parent: {
      block: 20,
      reference: '1',
    },
    ...templateProject,
  },
  {
    parent: {
      block: 30,
      reference: '2',
    },
    ...templateProject,
  },
  {
    parent: {
      block: 40,
      reference: '3',
    },
    ...templateProject,
  },
  {
    parent: {
      block: 50,
      reference: '4',
    },
    ...templateProject,
  },
] as ISubqueryProject[];

const loopProjects = [
  {
    parent: {
      block: 10,
      reference: '1',
    },
    ...templateProject,
  },
  {
    parent: {
      block: 20,
      reference: '0',
    },
    ...templateProject,
  },
] as ISubqueryProject[];

const futureProjects = [
  {
    ...templateProject,
  },
  {
    parent: {
      block: 30,
      reference: '0',
    },
    ...templateProject,
  },
  {
    parent: {
      block: 20,
      reference: '1',
    },
    ...templateProject,
  },
] as ISubqueryProject[];

describe('Project Upgrades', () => {
  describe('Loading projects', () => {
    it('can load a project with no parents', async () => {
      const upgradeService = await ProjectUpgradeSevice.create(
        demoProjects[0],
        (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
        1
      );

      expect([...upgradeService.projects.keys()]).toEqual([1]);
    });

    it('can load all parent projects', async () => {
      const upgradeService = await ProjectUpgradeSevice.create(
        demoProjects[5],
        (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
        1
      );

      expect([...upgradeService.projects.keys()]).toEqual([1, 10, 20, 30, 40, 50]);
    });

    it('can handle projects that somehow refer to each other', async () => {
      await expect(
        ProjectUpgradeSevice.create(loopProjects[1], (id) => Promise.resolve(loopProjects[parseInt(id, 10)]), 1, 1)
      ).rejects.toThrow();
    });

    it('can load all parent projects upto startHeight', async () => {
      const upgradeService = await ProjectUpgradeSevice.create(
        demoProjects[5],
        (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
        20,
        21
      );

      expect([...upgradeService.projects.keys()]).toEqual([20, 30, 40, 50]);
    });

    it('can load all parent projects upto and including startHeight', async () => {
      const upgradeService = await ProjectUpgradeSevice.create(
        demoProjects[5],
        (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
        20,
        20
      );

      expect([...upgradeService.projects.keys()]).toEqual([20, 30, 40, 50]);
    });

    it('will throw if parent projects are not at an earlier height', async () => {
      await expect(
        ProjectUpgradeSevice.create(futureProjects[2], (id) => Promise.resolve(futureProjects[parseInt(id, 10)]), 1, 1)
      ).rejects.toThrow();
    });

    it('will throw if there are no parents and earlier start height', async () => {
      const project = {
        dataSources: [{startBlock: 20}],
      } as ISubqueryProject;
      await expect(
        ProjectUpgradeSevice.create(project, (id) => Promise.resolve(futureProjects[parseInt(id, 10)]), 1, 1)
      ).rejects.toThrow();
    });

    it('will validate all parents are for the same network', async () => {
      const projects = [
        {
          ...templateProject,
          network: {chainId: 2},
        },
        {
          parent: {
            block: 30,
            reference: '0',
          },
          ...templateProject,
        },
      ] as ISubqueryProject[];

      await expect(
        ProjectUpgradeSevice.create(projects[1], (id) => Promise.resolve(projects[parseInt(id, 10)]), 1, 1)
      ).rejects.toThrow();
    });

    it('will validate all parents are for the same node runner', async () => {
      const projects = [
        {
          ...templateProject,
          runner: {
            node: {
              name: 'subql-node-wrong',
            },
          },
        },
        {
          parent: {
            block: 30,
            reference: '0',
          },
          ...templateProject,
        },
      ] as ISubqueryProject[];

      await expect(
        ProjectUpgradeSevice.create(projects[1], (id) => Promise.resolve(projects[parseInt(id, 10)]), 1, 1)
      ).rejects.toThrow();
    });
  });

  describe('Getting projects for heights', () => {
    let upgradeService: ProjectUpgradeSevice<ISubqueryProject>;

    beforeAll(async () => {
      upgradeService = await ProjectUpgradeSevice.create(
        demoProjects[5],
        (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
        1
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

  describe('Upgradable subquery project', () => {
    let upgradeService: ProjectUpgradeSevice<ISubqueryProject>;
    let project: ISubqueryProject & IProjectUpgradeService<ISubqueryProject>;

    beforeEach(async () => {
      upgradeService = await ProjectUpgradeSevice.create(
        demoProjects[5],
        (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
        1
      );

      project = upgradableSubqueryProject(upgradeService);
    });

    it('cant set values other than `currentHeight`', () => {
      expect(() => ((project as any).id = 'not possible')).toThrow();
    });

    it('will default the currentHeight if not provided', async () => {
      upgradeService = await ProjectUpgradeSevice.create(demoProjects[5], (id) =>
        Promise.resolve(demoProjects[parseInt(id, 10)])
      );
      expect(upgradeService.currentHeight).toEqual(50);
    });

    it('can set the current height on the service', () => {
      upgradeService.currentHeight = 20;

      expect(upgradeService.currentHeight).toEqual(20);
      expect(project.currentHeight).toEqual(20);
    });

    it('can set the current height on the project', () => {
      project.currentHeight = 20;

      expect(upgradeService.currentHeight).toEqual(20);
      expect(project.currentHeight).toEqual(20);
    });

    it('the project is the right project for a set height', () => {
      project.currentHeight = 25;

      expect(project.parent?.block).toEqual(20);
    });
  });
});
