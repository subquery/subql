// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {isMainThread} from 'worker_threads';
import {ParentProject} from '@subql/types-core';
import {getAllEntitiesRelations} from '@subql/utils';
import {Sequelize, Transaction} from '@subql/x-sequelize';
import {findLast, last, parseInt} from 'lodash';
import {SchemaMigrationService} from '../db';
import {ISubqueryProject, StoreCacheService, StoreService} from '../indexer';
import {getLogger} from '../logger';
import {getStartHeight, mainThreadOnly} from '../utils';
import {BlockHeightMap} from '../utils/blockHeightMap';
import {NodeConfig} from './NodeConfig';

type OnProjectUpgradeCallback<P> = (height: number, project: P) => void | Promise<void>;

export interface IProjectUpgradeService<P extends ISubqueryProject = ISubqueryProject> {
  init: (
    storeService: StoreService,
    currentHeight: number,
    config: NodeConfig,
    sequelize: Sequelize,
    schema: string,
    onProjectUpgrade?: OnProjectUpgradeCallback<P>
  ) => Promise<number | undefined>;
  /**
   * This should only be called from within a worker thread as they dont have access to the store
   * */
  initWorker(currentHeight: number, onProjectUpgrade?: OnProjectUpgradeCallback<P>): void;
  updateIndexedDeployments: (id: string, blockHeight: number) => Promise<void>;
  readonly currentHeight: number;
  setCurrentHeight: (newHeight: number) => Promise<void>;
  isRewindable: boolean;
  currentProject: P;
  projects: Map<number, P>;
  getProject: (height: number) => P;
  rewind: (
    targetBlockHeight: number,
    lastProcessedHeight: number,
    transaction: Transaction,
    storeService: StoreService
  ) => Promise<void>;
}

const serviceKeys: Array<keyof IProjectUpgradeService> = [
  'getProject',
  'currentHeight',
  'currentProject',
  'projects',
  'init',
  'updateIndexedDeployments',
  'isRewindable',
];

function assertEqual<T>(valueA: T, valueB: T, name: string) {
  assert(valueA === valueB, `Expected ${name} to be equal. expected="${valueA}" parent has="${valueB}"`);
}

function getParentBlock(parent: ParentProject): number {
  return parent.untilBlock ?? parent.block;
}

const logger = getLogger('ProjectUpgradeSevice');

/*
  We setup a proxy here so that we can have a class that matches ISubquery project but will change when we set the current height to the correct project
*/
export function upgradableSubqueryProject<P extends ISubqueryProject>(
  upgradeService: ProjectUpgradeSevice<P>
): P & IProjectUpgradeService<P> {
  return new Proxy<P & IProjectUpgradeService<P>>(upgradeService as any, {
    set() {
      // Everything is read-only unless updated via function
      return false;
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
      if (prop in target /*(serviceKeys as Array<string | symbol>).includes(prop)*/) {
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
  #currentHeight: number;
  #currentProject: P;

  #storeCache?: StoreCacheService;
  #initialized = false;

  private config?: NodeConfig;
  private onProjectUpgrade?: OnProjectUpgradeCallback<P>;
  private migrationService?: SchemaMigrationService;

  private constructor(private _projects: BlockHeightMap<P>, currentHeight: number, private _isRewindable = true) {
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
  async init(
    storeService: StoreService,
    currentHeight: number,
    config: NodeConfig,
    sequelize: Sequelize,
    schema: string,
    onProjectUpgrade?: OnProjectUpgradeCallback<P>
  ): Promise<number | undefined> {
    if (this.#initialized) {
      logger.warn(`ProjectUpgradeService has already been initialized, this is a no-op`);
      return;
    }
    this.#initialized = true;
    this.#storeCache = storeService.storeCache;
    this.config = config;

    this.migrationService = new SchemaMigrationService(
      sequelize,
      storeService,
      storeService.storeCache._flushCache.bind(storeService.storeCache),
      schema,
      config
    );

    const indexedDeployments = await this.getDeploymentsMetadata();

    const lastProjectChange = this.validateIndexedData(indexedDeployments);

    this.#currentHeight = lastProjectChange || currentHeight;
    this.#currentProject = this.getProject(this.#currentHeight);

    // executed last to ensure that the correct project is set first
    this.onProjectUpgrade = onProjectUpgrade;
    return lastProjectChange;
  }

  initWorker(currentHeight: number, onProjectUpgrade?: OnProjectUpgradeCallback<P>): void {
    assert(!this.onProjectUpgrade, `onProjectUpgrade callback has already been set`);
    this.#currentHeight = currentHeight;
    this.#currentProject = this.getProject(this.#currentHeight);
    this.onProjectUpgrade = onProjectUpgrade;
  }

  get isRewindable(): boolean {
    return this._isRewindable;
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
  async rewind(
    targetBlockHeight: number,
    lastProcessedHeight: number,
    transaction: Transaction,
    storeService: StoreService
  ): Promise<void> {
    const projectsWithinRange = new BlockHeightMap(this.projects).getWithinRange(
      targetBlockHeight,
      lastProcessedHeight
    );
    const sortedProjectIds = Array.from(projectsWithinRange.keys());
    const iterator = sortedProjectIds[Symbol.iterator]();

    let currentId = iterator.next();
    let nextId = iterator.next();

    while (!nextId.done) {
      const currentProject = projectsWithinRange.get(currentId.value);
      const nextProject = projectsWithinRange.get(nextId.value);

      if (currentProject && nextProject) {
        if (this.config?.dbSchema) {
          await storeService.init(getAllEntitiesRelations(currentProject.schema), this.config.dbSchema);
        }
        await this.migrate(currentProject, nextProject, transaction);
      }

      currentId = nextId;
      this.#currentProject = nextProject as P;
      nextId = iterator.next();
    }
  }

  private async migrate(
    project: ISubqueryProject,
    newProject: ISubqueryProject,
    transaction: Transaction | undefined
  ): Promise<void> {
    assert(this.config, 'NodeConfig is undefined');
    if (!this.config.unfinalizedBlocks) {
      assert(this.migrationService, 'MigrationService is undefined');
      if (this.config.allowSchemaMigration) {
        const modifiedModels = await this.migrationService.run(project.schema, newProject.schema, transaction);
        if (modifiedModels) {
          this.#storeCache?.updateModels(modifiedModels);
        }
      }
    }
  }

  async setCurrentHeight(height: number): Promise<void> {
    this.#currentHeight = height;
    const newProjectDetails = this._projects.getDetails(height);
    assert(newProjectDetails, `Unable to find project for height ${height}`);
    const {startHeight, value: newProject} = newProjectDetails;

    const hasChanged = this.#currentProject !== newProject;
    // Need to set this so that operations under hasChanged use the new project
    const project = this.#currentProject;
    this.#currentProject = newProject;

    if (hasChanged) {
      if (isMainThread) {
        try {
          await this.updateIndexedDeployments(newProject.id, startHeight);
        } catch (e: any) {
          logger.error(e, 'Failed to update deployment');
          throw e;
        }
      }

      try {
        await this.onProjectUpgrade?.(startHeight, newProject);
        if (isMainThread) {
          await this.migrate(project, newProject, undefined);
        }
      } catch (e: any) {
        logger.error(e, `Failed to complete upgrading project`);
        process.exit(1);
      }

      logger.info(`Project upgraded to ${newProject.id} at height ${height}`);
    }
  }

  static async create<P extends ISubqueryProject>(
    startProject: P, // The project passed in via application start
    loadProject: (ipfsCid: string) => Promise<P>,
    startHeight?: number // How far back we need to load parent versions
  ): Promise<ProjectUpgradeSevice<P>> {
    const projects: Map<number, P> = new Map();

    let currentProject = startProject;
    let currentHeight: number | undefined;

    let nextProject = startProject;

    const addProject = (height: number, project: P) => {
      this.validateProject(startProject, project);
      projects.set(height, project);
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const projectStartHeight = getStartHeight(currentProject.dataSources);

      // Set the current height to the start of the startProject if not provided
      if (currentHeight === undefined) {
        currentHeight = (startProject.parent && getParentBlock(startProject.parent)) ?? projectStartHeight;
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
      if (currentProject.parent && getParentBlock(currentProject.parent)) {
        addProject(getParentBlock(currentProject.parent), currentProject);
      }
      // At the limit of the start height for Parent
      if (startHeight !== undefined && startHeight >= getParentBlock(currentProject.parent)) {
        break;
      }

      // Load the next project and repeat
      nextProject = await loadProject(currentProject.parent.reference).catch((e) => {
        throw new Error(`Failed to load parent project with cid: ${currentProject.parent?.reference}. ${e}`);
      });
      if (nextProject.parent && getParentBlock(nextProject.parent) > getParentBlock(currentProject.parent)) {
        throw new Error(
          `Parent project ${currentProject.parent.reference} has a block height that is greater than the current project`
        );
      }
      currentProject = nextProject;
    }

    if (!projects.size) {
      throw new Error('No valid projects found, this could be due to the startHeight.');
    }

    const isRewindable = this.rewindableCheck(projects);

    assert(currentHeight, 'Unable to determine current height from projects');
    return new ProjectUpgradeSevice(new BlockHeightMap(projects), currentHeight, isRewindable);
  }

  getProject(height: number): P {
    return this._projects.get(height);
  }

  private static rewindableCheck<P extends ISubqueryProject>(projects: Map<number, P>): boolean {
    const sortedProjects = new Map([...projects.entries()].sort((a, b) => a[0] - b[0]));
    const projectIterator = sortedProjects.values();
    let previousProject = projectIterator.next().value;
    for (const project of projectIterator) {
      if (!SchemaMigrationService.validateSchemaChanges(previousProject.schema, project.schema)) {
        return false;
      }
      previousProject = project;
    }
    return true;
  }

  private static validateProject<P extends ISubqueryProject>(startProject: P, parentProject: P): void {
    assertEqual(startProject.network.chainId, parentProject.network.chainId, 'chainId');
    assertEqual(startProject.runner?.node.name, parentProject.runner?.node.name, 'subquery node');

    // TODO validate schema
  }

  // Returns a height to rewind to if rewind is needed. Otherwise throws an error
  validateIndexedData(deploymentsMetadata: Record<number, string>): number | undefined {
    // Using project upgrades feature
    if (this.projects.size > 1) {
      const indexedEntries = Object.entries(deploymentsMetadata);
      const projectEntries: [number, string][] = [...this.projects.entries()].map(([height, project]) => [
        height,
        project.id,
      ]);

      // Nothing has been indexed
      if (!indexedEntries.length) {
        return undefined;
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
    assert(this.#storeCache?.metadata, 'Project Upgrades service has not been initialized, unable to update metadata');
    const deploymentsRaw = await this.#storeCache?.metadata.find('deployments');

    if (!deploymentsRaw) return {};

    return JSON.parse(deploymentsRaw);
  }

  @mainThreadOnly()
  async updateIndexedDeployments(id: string, blockHeight: number): Promise<void> {
    assert(this.#storeCache?.metadata, 'Project Upgrades service has not been initialized, unable to update metadata');
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

    this.#storeCache?.metadata.set('deployments', JSON.stringify(deployments));
  }
}
