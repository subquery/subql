import {loadProjectManifest} from '../src/project/load';

describe('project.yaml', () => {
  it('can parse project.yaml to ProjectManifestImpl', () => {
    expect(() => loadProjectManifest(__dirname + '/project.yaml')).toBeTruthy();
  });
});
