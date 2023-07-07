// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import {abiInterface, codegen, processAbis, validateEntityName} from './codegen-controller';

jest.mock('fs', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fsMock = jest.createMockFromModule('fs') as any;
  fsMock.promises = {
    mkdir: jest.fn(),
  };
  return fsMock;
});

jest.mock('rimraf', () => {
  return jest.createMockFromModule('rimraf') as unknown;
});

jest.setTimeout(30000);

describe('Codegen can generate schema (mocked)', () => {
  const projectPath = path.join(__dirname, '../../test/test1');
  it('throw error when make directory failed at beginning of codegen', async () => {
    (rimraf as unknown as jest.Mock).mockImplementation((path, cb) => cb());
    (fs.promises.mkdir as jest.Mock).mockImplementation(async () => Promise.reject(new Error()));
    await expect(codegen(projectPath)).rejects.toThrow(/Failed to prepare/);
  });

  it('test codegen reserved key validate', () => {
    const good_name = 'exampleFilterEntity';
    const good_result = validateEntityName(good_name);
    expect(good_result).toEqual(good_name);

    const bad_name = 'exampleEntityFilters';
    expect(() => validateEntityName(bad_name)).toThrow(
      'EntityName: exampleEntityFilters cannot end with reservedKey: filters'
    );
  });
  it('read artifact abis', () => {
    const projectPath = path.join(__dirname, '../../test/abiTest1');
    const abisAssetObj = {
      key: 'abis',
      value: './abis.json',
    };

    const artifactAssetObj = {
      key: 'artifact',
      value: './artifact.json',
    };
    const sortAssets_abis = new Map<string, string>();
    const sortAssets_artifact = new Map<string, string>();
    sortAssets_abis.set(abisAssetObj.key, abisAssetObj.value);
    sortAssets_artifact.set(artifactAssetObj.key, artifactAssetObj.value);
    const a = path.join(projectPath, './abis.json');
    const b = path.join(projectPath, './artifact.json');
    const arrayAbi = require(a);
    const objAbi = require(b);
    const mockLoadFromJsonOrYaml: jest.Mock<abiInterface[] | {abi: abiInterface[]}> = jest.fn();

    mockLoadFromJsonOrYaml.mockImplementation((filePath: string) => {
      if (filePath === a) {
        return arrayAbi;
      } else if (filePath === b) {
        return objAbi;
      }
      return [];
    });

    const abisRendered = processAbis(sortAssets_abis, projectPath, mockLoadFromJsonOrYaml);
    const artifactRendered = processAbis(sortAssets_artifact, projectPath, mockLoadFromJsonOrYaml);

    // exclude name field
    artifactRendered.map((e) => {
      e.name = expect.any(String);
    });
    expect(abisRendered).toStrictEqual(expect.objectContaining(artifactRendered));
  });
  it('json is object with abi field, should return empty', () => {
    const projectPath = path.join(__dirname, '../../test/abiTest2');
    const artifactAssetObj = {
      key: 'artifact',
      value: './artifact.json',
    };
    const sortAssets_artifact = new Map<string, string>();

    sortAssets_artifact.set(artifactAssetObj.key, artifactAssetObj.value);

    const mockLoadFromJsonOrYaml: jest.Mock<abiInterface[] | {abi: abiInterface[]}> = jest.fn();

    mockLoadFromJsonOrYaml.mockImplementation((filePath: string) => {
      return require(path.join(projectPath, artifactAssetObj.value));
    });

    const noAbiJsonRender = processAbis(sortAssets_artifact, projectPath, mockLoadFromJsonOrYaml);
    expect(noAbiJsonRender).toStrictEqual([{name: 'artifact', events: [], functions: []}]);
  });
});
