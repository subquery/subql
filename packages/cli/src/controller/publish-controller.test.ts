import fs from 'fs';
import path from 'path';
import os from 'os';
import childProcess from 'child_process';
import {createProject} from './init-controller';
import {uploadToIpfs} from './publish-controller';
import Build from '../commands/build';
import Codegen from '../commands/codegen';

const projectSpec = {
  name: 'mocked_starter',
  repository: '',
  endpoint: 'wss://rpc.polkadot.io/public-ws',
  author: 'jay',
  description: 'this is test for init controller',
  version: '',
  license: '',
};

jest.setTimeout(90000);

describe('Cli publish', () => {
  let projectDir: string;

  beforeEach(async () => {
    const tmpdir = await fs.promises.mkdtemp(`${os.tmpdir()}${path.sep}`);
    projectDir = path.join(tmpdir, projectSpec.name);

    await createProject(tmpdir, projectSpec);

    // Install dependencies
    childProcess.execSync('npm i', {cwd: projectDir});

    await Codegen.run(['-l', projectDir]);
    await Build.run(['-l', projectDir]);
  });

  afterEach(() => {
    childProcess.execSync(`rm -rf ${projectDir}`);
  });

  it('should upload appropriate files to IPFS', async () => {
    const results = await uploadToIpfs('http://localhost:5001/api/v0', projectDir);

    expect(results.length).toBe(6);

    expect(results.find((result) => result.path === 'project.yaml')).toBeDefined();
    expect(results.find((result) => result.path === 'schema.graphql')).toBeDefined();
    expect(results.find((result) => result.path === 'dist/index.js')).toBeDefined();

    // Expect a result for the directory
    const dir = results[results.length - 1];
    expect(dir.path).toBe('');
    expect(dir.cid.toString()).toBeDefined();
  });
});
