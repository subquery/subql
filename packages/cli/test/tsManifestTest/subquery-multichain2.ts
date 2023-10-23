import {MultichainProjectManifest} from '@subql/types-core';

const project: MultichainProjectManifest = {
  specVersion: '1.0.0',
  query: {
    name: '@subql/query',
    version: '*',
  },
  projects: ['project1.ts', 'project3.ts'],
};

export default project;
