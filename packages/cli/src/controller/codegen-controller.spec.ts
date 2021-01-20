// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import ejs from 'ejs';
import {makeSchema, renderTemplate, generateSchema} from './codegen-controller';
jest.mock('fs', () => {
  const fsMock = jest.createMockFromModule('fs') as any;
  fsMock.promises = {
    writeFile: jest.fn(),
    access: jest.fn(),
  };
  fsMock.readFileSync = jest.fn();
  return fsMock;
});

jest.mock('ejs', () => {
  const ejsMock = jest.createMockFromModule('ejs') as any;
  ejsMock.renderFile = jest.fn();
  return ejsMock;
});

const mockedTemplate = {
  props: {
    baseFolderPath: 'some_dir_path',
    className: 'randomClass',
    fields: ['field1', 'field2'],
  },
};

describe('Codegen can generate schema (mocked fs)', () => {
  it('write schema to a empty project directory should fail', async () => {
    (fs.promises.access as jest.Mock).mockImplementation(async () => Promise.reject(new Error()));
    await expect(makeSchema('classname', 'random data')).rejects.toThrow(
      'Write schema failed, not in project directory'
    );
  });

  it('should throw error when write schema file failed', async () => {
    (fs.promises.access as jest.Mock).mockImplementation(async () => Promise.resolve());
    (fs.promises.writeFile as jest.Mock).mockImplementation(async () => Promise.reject(new Error('write failed')));
    await expect(makeSchema('classname', 'random data')).rejects.toThrow(/write failed/);
  });

  it('write schema should pass', async () => {
    (fs.promises.access as jest.Mock).mockImplementation(async () => Promise.resolve());
    (fs.promises.writeFile as jest.Mock).mockImplementation(async () => Promise.resolve());
    await expect(makeSchema('classname', 'random data')).resolves.not.toThrow();
  });

  it('render ejs template with an incorrect format modelTemplate should throw', async () => {
    (ejs.renderFile as jest.Mock).mockImplementation(async () => Promise.reject(new Error('render template failed')));
    await expect(renderTemplate('renderTemplateTest', mockedTemplate)).rejects.toThrow(/render template failed/);
  });

  it('render ejs template with correct format modelTemplate should pass', async () => {
    (ejs.renderFile as jest.Mock).mockImplementation(async () => Promise.resolve());
    await expect(renderTemplate('renderTemplateTest', mockedTemplate)).resolves.not.toThrow();
  });

  it('generate schema should pass', async () => {
    const schemaString = 'type goodEntity @entity {id: ID!}';
    (fs.readFileSync as jest.Mock).mockReturnValue(schemaString);
    await expect(generateSchema()).resolves.not.toThrow();
  });
});
