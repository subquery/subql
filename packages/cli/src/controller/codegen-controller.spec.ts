// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {rimraf} from 'rimraf';
import {codegen, processFields, validateEntityName} from './codegen-controller';

jest.mock('fs', () => {
  const fs = jest.requireActual('fs');
  return {
    ...fs,
    promises: {
      ...fs.promises,
      mkdir: jest.fn(),
    },
  };
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

  it('throw error when processing unsupported type in json fields', () => {
    expect(() =>
      processFields(
        'jsonField',
        'TypeNotSupported',
        [
          // Ignoring to test unsupported scalar type
          // @ts-ignore
          {
            name: 'notSupported',
            type: 'UnsupportedScalar',
            nullable: false,
            isArray: false,
          },
        ],
        []
      )
    ).toThrow(
      'Schema: undefined type "UnsupportedScalar" on field "notSupported" in "type TypeNotSupported @jsonField"'
    );
  });
});
