import fs from 'fs';
import { prepareProjectDir } from './project';

let projectPath = __dirname + '/../../test/projectFixture';
let tarPath =
  __dirname + '/../../test/projectFixture/mockedSubqueryProject.tgz';
let badFormatPath = __dirname + '/../../test/projectFixture/bad.json';

it('Test path is a directory, outcome is same directory', async () => {
  const finalPath = await prepareProjectDir(projectPath);
  expect(finalPath).toEqual(projectPath);
});

it('Test path is a tar, outcome is a directory', async () => {
  const finalPath = await prepareProjectDir(tarPath);
  expect(fs.existsSync(finalPath)).toBeTruthy();
});

it('Test path is in incorrect format/extension, expect error', async () => {
  await expect(prepareProjectDir(badFormatPath)).rejects.toThrow();
});
