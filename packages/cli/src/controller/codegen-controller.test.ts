// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {rimraf} from 'rimraf';
import {codegen} from './codegen-controller';

jest.setTimeout(30000);

const projectPath = path.join(__dirname, '../../test/schemaTest');

describe('Codegen can generate schema', () => {
  afterEach(async () => {
    await rimraf(path.join(__dirname, '../../test/schemaTest/src'));
  });

  it('codegen with correct schema should pass', async () => {
    await expect(codegen(projectPath)).resolves.not.toThrow();
  });

  it('codegen with incorrect schema field should fail', async () => {
    await expect(codegen(projectPath, ['project-bad-schema.yaml'])).rejects.toThrow(/is not a valid type/);
  });

  it('codegen with entities that uses reserved names should throw', async () => {
    await expect(codegen(projectPath, ['project-bad-entity.yaml'])).rejects.toThrow(
      'EntityName: exampleEntityFilter cannot end with reservedKey: filter'
    );
  });

  it('Codegen should be able to generate ABIs from template datasources', async () => {
    await codegen(projectPath, ['project-templates-abi.yaml']);
    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')
    ).resolves.toBeTruthy();
  });

  it('Should not fail, if ds does not have any assets', async () => {
    await expect(codegen(projectPath, ['project-no-assets.yaml'])).resolves.not.toThrow();
  });

  it('Codegen should be able to generate ABIs from customName datasources', async () => {
    await codegen(projectPath);
    await expect(
      fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/Erc721.ts`, 'utf8')
    ).resolves.toBeTruthy();
  });

  it('Should clean out existing types directory', async () => {
    await codegen(projectPath);
    await codegen(projectPath, ['project-no-abi.yaml']);

    // should not contain abi directory
    await expect(fs.promises.readFile(`${projectPath}/src/types/abi-interfaces/erc721.ts`, 'utf8')).rejects.toThrow();
  });

  it('should generate contracts on different glob paths', async () => {
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
    await codegen(projectPath, ['non-evm-project.yaml']);
    expect(fs.existsSync(`${projectPath}/src/types/abi-interfaces/`)).toBeFalsy();
  });

  it('Should not generate proto-interfaces if no chaintypes are provided', async () => {
    await codegen(projectPath, ['project-cosmos.yaml']);
    expect(fs.existsSync(`${projectPath}/src/types/proto-interfaces/`)).toBeFalsy();
  });

  it('Should dedupe enums', async () => {
    await codegen(projectPath, ['project-duplicate-enum.yaml']);

    const fooFile = await fs.promises.readFile(`${projectPath}/src/types/models/Foo.ts`, 'utf8');

    expect(fooFile).toContain(
      `import {
    Bar,
} from '../enums';`
    );
  });

  // github issue #2211
  it('codegen file should import model files with correct case-sensitive names', async () => {
    await codegen(projectPath, ['project-case-sensitive-import-entity.yaml']);

    const codegenFile = await fs.promises.readFile(`${projectPath}/src/types/models/index.ts`, 'utf8');

    expect(codegenFile).toContain(`export {ExampleField} from "./ExampleField"`);
  });

  it('correctly generates relations with different dbTypes', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest');
    await codegen(projectPath, ['project-id-type.yaml']);

    const blockEntity = await fs.promises.readFile(`${projectPath}/src/types/models/Block.ts`, 'utf8');

    expect(blockEntity).toContain('        metaId: bigint,');
    expect(blockEntity).toContain('public metaId: bigint;');
    expect(blockEntity).toContain(
      'static async getByMetaId(metaId: bigint, options: GetOptions<CompatBlockProps>): Promise<Block[]> {'
    );
  });
});
