// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {findLast, last} from 'lodash';
import {CacheMetadataModel} from '../indexer';
import {ISubqueryProject} from '../indexer/types';
import {getLogger} from '../logger';
import {getStartHeight} from '../utils';
import {BlockHeightMap} from '../utils/blockHeightMap';

export interface IProjectUpgradeService<P extends ISubqueryProject = ISubqueryProject> {
  init: (metadata: CacheMetadataModel) => Promise<number | undefined>;
  updateIndexedDeployments: (id: string, blockHeight: number) => Promise<void>;
  currentHeight: number;
  currentProject: P;
  projects: Map<number, P>;
  getProject: (height: number) => P;
}

const serviceKeys: Array<keyof IProjectUpgradeService> = [
  'getProject',
  'currentHeight',
  'projects',
  'init',
  'updateIndexedDeployments',
];

function assertEqual<T>(valueA: T, valueB: T, name: string) {
  assert(valueA === valueB, `Expected ${name} to be equal. expected="${valueA}" parent has="${valueB}"`);
}

const logger = getLogger('ProjectUpgradeSevice');

/*
  We setup a proxy here so that we can have a class that matches ISubquery project but will change when we set the current height to the correct project
*/
export function upgradableSubqueryProject<P extends ISubqueryProject>(
  upgradeService: ProjectUpgradeSevice<P>
): P & IProjectUpgradeService<P> {
  return new Proxy<P & IProjectUpgradeService<P>>(upgradeService as any, {
    set(target, key, value) {
      if (key !== 'currentHeight') {
        throw new Error(`All properties except 'currentHeight' are readonly. Trying to set "${key.toString()}"`);
        // return false
        // TODO should this return false?
      }
      target.currentHeight = value;
      return true;
    },
    get(target, prop, receiver) {
      const project = target.currentProject;
      if (project[prop as keyof P]) {
        const value = project[prop as keyof P];
        if (value instanceof Function) {
          return value.bind(project);
        }

        return value;
      }
      /*
       * It would be nice to limit this to `serviceKeys` but there are issues with
       * nestjs scheduler reflecting and being unable to get props.
       * If we can fix that then we can move this above the project accessors
       */
      if (target[prop as keyof IProjectUpgradeService<P>] /*(serviceKeys as Array<string | symbol>).includes(prop)*/) {
        const result = target[prop as keyof IProjectUpgradeService<P>];

        if (result instanceof Function) {
          return result.bind(target);
        }

        return result;
      }
    },
  });
}

export class ProjectUpgradeSevice<P extends ISubqueryProject = ISubqueryProject> implements IProjectUpgradeService<P> {
  // Mapping of the start height -> Project version
  // private projects: Record<number, P> = {};

  #currentHeight: number;
  #currentProject: P;

  #metadata?: CacheMetadataModel;

  private constructor(private _projects: BlockHeightMap<P>, currentHeight: number) {
    // TODO change to debug
    logger.info(
      `Projects: ${JSON.stringify(
        [..._projects.getAll().entries()].reduce((acc, curr) => {
          acc[curr[0]] = curr[1].id;
          return acc;
        }, {} as Record<number, string>),
        undefined,
        2
      )}`
    );

    // Bypass setters here because we want to avoid side-effect
    this.#currentHeight = currentHeight;
    this.#currentProject = this.getProject(this.#currentHeight);
  }

  async init(metadata: CacheMetadataModel): Promise<number | undefined> {
    this.#metadata = metadata;

    const indexedDeployments = await this.getDeploymentsMetadata();

    const lastProjectChange = this.validateIndexedData(indexedDeployments);

    return lastProjectChange;
  }

  get projects(): Map<number, P> {
    return this._projects.getAll();
  }

  get currentProject(): P {
    return this.#currentProject;
  }

  get currentHeight(): number {
    return this.#currentHeight;
  }

  set currentHeight(height: number) {
    this.#currentHeight = height;
    const newProjectDetails = this._projects.getDetails(height);
    assert(newProjectDetails, `Unable to find project for height ${height}`);
    const {startHeight, value: newProject} = newProjectDetails;

    if (this.#currentProject !== newProject) {
      logger.info(`Project upgraded to ${newProject.id} at height ${height}`);
      // Use the project start height here for when resuming indexing at an arbitrary height
      void this.updateIndexedDeployments(newProject.id, startHeight).catch((e) => {
        logger.error(e, 'Failed to update deployment metadata');
        process.exit(1);
      });
    }
    this.#currentProject = newProject;
  }

  static async create<P extends ISubqueryProject>(
    startProject: P, // The project passed in via application start
    loadProject: (ipfsCid: string) => Promise<P>,
    startHeight?: number // How far back we need to load parent versions
  ): Promise<ProjectUpgradeSevice<P>> {
    const projects: Map<number, P> = new Map();

    let currentProject = startProject;
    let currentHeight: number | undefined;

    const addProject = (height: number, project: P) => {
      this.validateProject(startProject, project);
      projects.set(height, project);
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const projectStartHeight = getStartHeight(currentProject.dataSources);

      // Set the current height to the start of the startProject if not provided
      if (currentHeight === undefined) {
        currentHeight = startProject.parent?.block ?? projectStartHeight;
      }

      // At the end of the chain
      if (!currentProject.parent) {
        // At the limit of the start height for DS
        if (startHeight !== undefined && startHeight < projectStartHeight) {
          break;
        }
        addProject(projectStartHeight, currentProject);
        break;
      }
      if (currentProject.parent.block) {
        addProject(currentProject.parent.block, currentProject);
      }
      // At the limit of the start height for Parent
      if (startHeight !== undefined && startHeight >= currentProject.parent.block) {
        break;
      }

      // Load the next project and repeat
      const nextProject = await loadProject(currentProject.parent.reference);
      if (nextProject.parent && nextProject.parent.block > currentProject.parent.block) {
        throw new Error(
          `Parent project ${currentProject.parent.reference} has a block height that is greater than the current project`
        );
      }
      currentProject = nextProject;
    }

    if (!projects.size) {
      throw new Error('No valid projects found, this could be due to the startHeight.');
    }

    assert(currentHeight, 'Unable to determine current height from projects');
    return new ProjectUpgradeSevice(new BlockHeightMap(projects), currentHeight);
  }

  getProject(height: number): P {
    return this._projects.get(height);
  }

  private static validateProject<P extends ISubqueryProject>(startProject: P, parentProject: P): void {
    assertEqual(startProject.network.chainId, parentProject.network.chainId, 'chainId');
    assertEqual(startProject.runner?.node.name, parentProject.runner?.node.name, 'subquery node');

    // TODO validate schema
  }

  // Returns a height to rewind to if rewind is needed. Otherwise throws an error
  validateIndexedData(deploymentsMetadata: Record<number, string>): number | undefined {
    // Using project upgades feature
    if (this.projects.size > 1) {
      const indexedEntries = Object.entries(deploymentsMetadata);
      const projectEntries: [number, string][] = [...this.projects.entries()].map(([height, project]) => [
        height,
        project.id,
      ]);

      // Nothing has been indexed
      if (!indexedEntries.length) {
        return projectEntries[0][0];
      }

      // TODO do we need to compare heights?
      const lastCommonProject = findLast(
        projectEntries,
        ([, projectId]) => !!indexedEntries.find(([, indexedId]) => projectId === indexedId)
      );

      if (!lastCommonProject) {
        throw new Error(`The indexed projects don't match the provided project or any of it's parents.`);
      }

      return this._projects.getDetails(lastCommonProject[0])?.endHeight;
    }

    return undefined;
  }

  private async getDeploymentsMetadata(): Promise<Record<number, string>> {
    assert(this.#metadata, 'Project Upgrades service has not been initialized, unable to update metadata');
    const deploymentsRaw = await this.#metadata.find('deployments');

    if (!deploymentsRaw) return {};

    return JSON.parse(deploymentsRaw);
  }

  async updateIndexedDeployments(id: string, blockHeight: number): Promise<void> {
    assert(this.#metadata, 'Project Upgrades service has not been initialized, unable to update metadata');
    const deployments = await this.getDeploymentsMetadata();

    // If the last deployment is the same as the one we're updating to theres no need to do anything
    if (last(Object.values(deployments)) === id) {
      return;
    }

    // If we encounter a fork, remove all future block heights
    Object.keys(deployments).forEach((key) => {
      const keyNum = parseInt(key, 10);
      if (keyNum >= blockHeight) {
        delete deployments[keyNum];
      }
    });

    deployments[blockHeight] = id;

    this.#metadata.set('deployments', JSON.stringify(deployments));
  }
}
