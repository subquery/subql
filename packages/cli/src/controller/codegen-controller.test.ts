// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest6/src'));
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

  it('Should not fail, if ds does not have any assets', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest5');
    await expect(codegen(projectPath)).resolves.not.toThrow();
  });
  it('Codegen should be able to generate ABIs from customName datasources', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest6');
    await codegen(projectPath);
    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')
    ).resolves.toBeTruthy();
  });

  it('Should clean out existing types directory', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest6');
    await codegen(projectPath);
    await codegen(projectPath, ['project-no-abi.yaml']);

    // should not contain abi directory
    await expect(fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')).rejects.toThrow();
  });
  it('should generate contracts on different glob paths', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest6');
    await codegen(projectPath, ['typechain-test.yaml']);

    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')
    ).resolves.toBeTruthy();
    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Artifact.ts`, 'utf8')
    ).resolves.toBeTruthy();

    await expect(fs.promises.readFile(`${projectPath}/src/types/contracts/Erc721.ts`, 'utf8')).resolves.toBeTruthy();
    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Artifact.ts`, 'utf8')
    ).resolves.toBeTruthy();
  });
});
