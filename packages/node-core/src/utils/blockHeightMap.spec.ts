// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BlockHeightMap} from './blockHeightMap';

describe('Ensure correct logic on blockHeightMap', () => {
  it('getWithinRange should return projects within specified height range', () => {
    const blockHeightMap = new Map([
      [1, {projectName: 'Project A'}],
      [500, {projectName: 'Project B'}],
      [1000, {projectName: 'Project C'}],
    ]);

    const blockHeight = new BlockHeightMap(blockHeightMap as any);

    const projectsWithinRange = blockHeight.getWithinRange(499, 700);

    console.log(projectsWithinRange);
    expect(projectsWithinRange).toStrictEqual(
      new Map([
        [1, {projectName: 'Project A'}],
        [500, {projectName: 'Project B'}],
      ])
    );
  });
});
