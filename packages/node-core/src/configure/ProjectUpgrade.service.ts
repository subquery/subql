// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {ISubqueryProject} from '../indexer/types';
import {getStartHeight} from '../utils';

export interface IProjectUpgradeService<P extends ISubqueryProject> {
  currentHeight: number;
  projects: Record<number, P>;
  getProject: (height: number) => P;
}

const serviceKeys: Array<keyof IProjectUpgradeService<ISubqueryProject>> = ['getProject', 'currentHeight', 'projects'];

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
        throw new Error('All properties except `currentHeight` are readonly');
        // TODO should this return false?
      }
      target.currentHeight = value;
      return true;
    },
    get(target, prop, receiver) {
      if ((serviceKeys as Array<string | symbol>).includes(prop)) {
        return Reflect.get(target, prop, receiver);
      }
      // TODO can we cache this?
      const project = target.getProject(target.currentHeight);
      return project[prop as keyof P];
    },
  });
}

export class ProjectUpgradeSevice<P extends ISubqueryProject> implements IProjectUpgradeService<P> {
  // Mapping of the start height -> Project version
  // private projects: Record<number, P> = {};

  currentHeight: number;

  private constructor(readonly projects: Record<number, P>, currentHeight: number) {
    this.currentHeight = currentHeight;
  }

  static async create<P extends ISubqueryProject>(
    startProject: P, // The project passed in via application start
    loadProject: (ipfsCid: string) => Promise<P>,
    currentHeight: number,
    startHeight?: number // How far back we need to load parent versions
  ): Promise<ProjectUpgradeSevice<P>> {
    const projects: Record<number, P> = {};

    let currentProject = startProject;

    const addProject = (height: number, project: P) => {
      this.validateProject(startProject, project);
      projects[height] = project;
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const projectStartHeight = getStartHeight(currentProject.dataSources);

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

    if (!Object.keys(projects).length) {
      throw new Error('No valid projects found, this could be due to the startHeight.');
    }

    return new ProjectUpgradeSevice(projects, currentHeight);
  }

  getProject(height: number): P {
    const heights = Object.keys(this.projects).map((k) => parseInt(k, 10));
    let matchingHeight: number | undefined;
    for (let i = 0; i < heights.length; i++) {
      const currentHeight = heights[i];

      if (currentHeight === height) {
        matchingHeight = currentHeight;
        break;
      }
      if (currentHeight <= height) {
        matchingHeight = currentHeight;
      }

      if (currentHeight > height) {
        break;
      }
    }

    if (matchingHeight === undefined) {
      throw new Error(`First project start is at ${heights[0]}`);
    }

    return this.projects[matchingHeight];
  }

  private static validateProject<P extends ISubqueryProject>(startProject: P, parentProject: P): void {
    assertEqual(startProject.network.chainId, parentProject.network.chainId, 'chainId');
    assertEqual(startProject.runner?.node.name, parentProject.runner?.node.name, 'subquery node');

    // TODO validate schema
  }
}
