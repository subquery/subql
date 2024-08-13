// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {rimraf} from 'rimraf';
import {codegen, generateModels} from './codegen-controller';

jest.setTimeout(30000);

describe('Codegen can generate schema', () => {
  afterEach(async () => {
    await rimraf(path.join(__dirname, '../../test/schemaTest/src'));
  });

  it('codegen with correct schema should pass', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await expect(codegen(projectPath)).resolves.not.toThrow();
  });

  it('codegen with incorrect schema field should fail', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await expect(codegen(projectPath, ['project-bad-schema.yaml'])).rejects.toThrow(/is not an valid type/);
  });

  it('codegen with entities that uses reserved names should throw', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await expect(codegen(projectPath, ['project-bad-entity.yaml'])).rejects.toThrow(
      'EntityName: exampleEntityFilter cannot end with reservedKey: filter'
    );
  });

  it('Codegen should be able to generate ABIs from template datasources', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await codegen(projectPath, ['project-templates-abi.yaml']);
    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')
    ).resolves.toBeTruthy();
  });

  it('Should not fail, if ds does not have any assets', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await expect(codegen(projectPath, ['project-no-assets.yaml'])).resolves.not.toThrow();
  });

  it('Codegen should be able to generate ABIs from customName datasources', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await codegen(projectPath);
    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')
    ).resolves.toBeTruthy();
  });

  it('Should clean out existing types directory', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await codegen(projectPath);
    await codegen(projectPath, ['project-no-abi.yaml']);

    // should not contain abi directory
    await expect(fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')).rejects.toThrow();
  });

  it('should generate contracts on different glob paths', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
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

  it('Should not generate ABI for non evm ds', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await codegen(projectPath, ['non-evm-project.yaml']);
    expect(fs.existsSync(`${projectPath}/src/types/abi-interfaces/`)).toBeFalsy();
  });

  it('Should not generate proto-interfaces if no chaintypes are provided', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await codegen(projectPath, ['project-cosmos.yaml']);
    expect(fs.existsSync(`${projectPath}/src/types/proto-interfaces/`)).toBeFalsy();
  });

  it('Should dedupe enums', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await codegen(projectPath, ['project-duplicate-enum.yaml']);

    const fooFile = await fs.promises.readFile(`${projectPath}/src/types/models/Foo.ts`, 'utf8');

    const fooFile2 = await fs.promises.readFile(`${projectPath}/src/types/models/index.ts`, 'utf8');
    console.log(fooFile2);
    expect(fooFile2).toContain(` `);
    expect(fooFile).toContain(
      `import {
    Bar,
} from '../enums';`
    );
  });

  // github issue #2211
  it('codegen file should import model files with correct case-sensitive names', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await codegen(projectPath, ['project-case-sensitive-import-entity.yaml']);

    const codegenFile = await fs.promises.readFile(`${projectPath}/src/types/models/index.ts`, 'utf8');

    expect(codegenFile).toContain(`export {ExampleField} from "./ExampleField"`);
  });
});
