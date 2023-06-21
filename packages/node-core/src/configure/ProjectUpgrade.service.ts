// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {ISubqueryProject} from '../indexer/types';
import {getStartHeight} from '../utils';
import {BlockHeightMap} from '../utils/blockHeightMap';

export interface IProjectUpgradeService<P extends ISubqueryProject = ISubqueryProject> {
  currentHeight: number;
  currentProject: P;
  projects: Map<number, P>;
  getProject: (height: number) => P;
}

const serviceKeys: Array<keyof IProjectUpgradeService> = ['getProject', 'currentHeight', 'projects'];

function assertEqual<T>(valueA: T, valueB: T, name: string) {
  assert(valueA === valueB, `Expected ${name} to be equal. expected="${valueA}" parent has="${valueB}"`);
}

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
      if ((serviceKeys as Array<string | symbol>).includes(prop)) {
        return target[prop as keyof IProjectUpgradeService<P>];
      }
      const project = target.currentProject;
      const value = project[prop as keyof P];

      if (value instanceof Function) {
        return value.bind(project);
      }

      return value;
    },
  });
}

export class ProjectUpgradeSevice<P extends ISubqueryProject = ISubqueryProject> implements IProjectUpgradeService<P> {
  // Mapping of the start height -> Project version
  // private projects: Record<number, P> = {};

  #currentHeight: number;
  #currentProject: P;

  private constructor(private _projects: BlockHeightMap<P>, currentHeight: number) {
    console.log('PROJECTS', [..._projects.getAll().keys()]);
    this.#currentHeight = currentHeight;
    this.#currentProject = this.getProject(this.currentHeight);
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
    const newProject = this.getProject(this.#currentHeight);

    if (this.#currentProject !== newProject) {
      console.log('Project upgraded');
    }
    this.#currentProject = newProject;
  }

  static async create<P extends ISubqueryProject>(
    startProject: P, // The project passed in via application start
    loadProject: (ipfsCid: string) => Promise<P>,
    currentHeight?: number,
    startHeight?: number // How far back we need to load parent versions
  ): Promise<ProjectUpgradeSevice<P>> {
    const projects: Map<number, P> = new Map();

    let currentProject = startProject;

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
}
