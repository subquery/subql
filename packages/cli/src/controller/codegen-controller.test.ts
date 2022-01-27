// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {promisify} from 'util';

import rimraf from 'rimraf';
import {codegen} from './codegen-controller';

jest.setTimeout(30000);

describe('Codegen can generate schema', () => {
  afterEach(async () => {
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest1/src'));
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest2/src'));
  });

  it('codegen with correct schema should pass', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest1');
    await codegen(projectPath);
  });

  it('codegen with incorrect schema field should fail', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest2');
    await expect(codegen(projectPath)).rejects.toThrow(/is not an valid type/);
  });
});
