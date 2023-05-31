// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';

import rimraf from 'rimraf';
import {codegen} from './codegen-controller';

jest.setTimeout(30000);

describe('Codegen can generate schema', () => {
  afterEach(async () => {
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest1/src'));
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest2/src'));
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest3/src'));
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest4/src'));
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest5/src'));
  });

  it('codegen with correct schema should pass', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest1');
    await codegen(projectPath);
  });

  it('codegen with incorrect schema field should fail', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest2');
    await expect(codegen(projectPath)).rejects.toThrow(/is not an valid type/);
  });
  it('codegen with entities that uses reserved names should throw', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest3');
    await expect(codegen(projectPath)).rejects.toThrow(
      'EntityName: exampleEntityFilter cannot end with reservedKey: filter'
    );
  });
  it('Codegen should be able to generate ABIs from template datasources', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest4');
    await codegen(projectPath);
    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')
    ).resolves.toBeTruthy();
  });

  it('Should not fail, if template Datasources dont have assets', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest5');
    await codegen(projectPath);
    await expect(fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')).rejects.toThrow();
  });
});
