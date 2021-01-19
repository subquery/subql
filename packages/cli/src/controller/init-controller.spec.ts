//Test create starter project
import {createProject} from './init-controller';
import * as fs from 'fs';
const projectName = 'mockStarterProject';
import rimraf from 'rimraf';

// async
const fileExists = (file) => {
  return new Promise((resolve, reject) => {
    fs.access(file, fs.constants.F_OK, (err) => {
      err ? reject(err) : resolve(true);
    });
  });
};

describe('Cli can create project', () => {
  beforeEach(async () => {
    await new Promise((resolve) => rimraf(`${projectName}`, resolve));
  });

  afterEach(async () => {
    await new Promise((resolve) => rimraf(`${projectName}`, resolve));
  });

  it('should resolves when starter project successful created', async () => {
    await createProject(projectName);
    await expect(fileExists(`./${projectName}`)).resolves.toEqual(true);
  });

  it('throw error if same name directory exists', async () => {
    await fs.mkdirSync(`./${projectName}`);
    await expect(createProject(projectName)).rejects.toThrow();
  });

  it('throw error if .git exists in starter project', async () => {
    await createProject(projectName);
    await expect(fileExists(`./${projectName}/.git`)).rejects.toThrow();
  });
});
