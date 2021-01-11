import * as fs from 'fs';
import {prepareProjectDir} from '../../src/utils/project'

let projectPath = './test/tarball/mockedProjectPath';
let tarPath = './test/tarball/mockedProjectPath/mockedSubqueryProject.tgz';
let badFormatPath = './test/tarball/mockedProjectPath/bad.json';


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


