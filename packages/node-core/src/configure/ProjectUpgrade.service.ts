// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ISubqueryProject} from '../indexer/types';
import {getStartHeight} from '../utils';

export class ProjectUpgradeSevice<P extends ISubqueryProject> {
  // Mapping of the start height -> Project version
  // private projects: Record<number, P> = {};

  private constructor(readonly projects: Record<number, P>) {}

  static async create<P extends ISubqueryProject>(
    startProject: P, // The project passed in via application start
    loadProject: (ipfsCid: string) => Promise<P>,
    startHeight?: number // How far back we need to load parent versions
  ): Promise<ProjectUpgradeSevice<P>> {
    const projects: Record<number, P> = {};

    let currentProject = startProject;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const projectStartHeight = getStartHeight(currentProject.dataSources);

      // At the end of the chain
      if (!currentProject.parent) {
        // At the limit of the start height for DS
        if (startHeight !== undefined && startHeight >= projectStartHeight) {
          break;
        }
        projects[projectStartHeight] = currentProject;
        break;
      }
      if (currentProject.parent.block) {
        projects[currentProject.parent.block] = currentProject;
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

    return new ProjectUpgradeSevice(projects);
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
}
