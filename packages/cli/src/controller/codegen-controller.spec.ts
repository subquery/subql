// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import ejs from 'ejs';
import {renderTemplate, generateSchema} from './codegen-controller';
jest.mock('fs', () => {
  const fsMock = jest.createMockFromModule('fs') as any;
  fsMock.promises = {
    writeFile: jest.fn(),
    access: jest.fn(),
  };
  return fsMock;
});

jest.mock('ejs', () => {
  return jest.createMockFromModule('ejs') as any;
});

const mockedTemplate = {
  props: {
    baseFolderPath: 'some_dir_path',
    className: 'randomClass',
    fields: ['field1', 'field2'],
  },
};

describe('Codegen can generate schema (mocked)', () => {
  it('generate schema should pass', async () => {
    const schemaString = 'type goodEntity @entity {id: ID!}';
    (fs.readFileSync as jest.Mock).mockReturnValue(schemaString);
    await expect(generateSchema()).resolves.not.toThrow();
  });

  it('generate schema should fail', async () => {
    const schemaString = 'type badEntity @entity {id: Float!}';
    (fs.readFileSync as jest.Mock).mockReturnValue(schemaString);
    await expect(generateSchema()).rejects.toThrow();
  });

  it('throw error when render ejs template in a folder missing models directory', async () => {
    (fs.promises.access as jest.Mock).mockImplementation(async () => Promise.reject(new Error()));
    await expect(renderTemplate('renderTemplateTest', mockedTemplate)).rejects.toThrow(
      /Write schema failed, not in project directory/
    );
  });

  it('render ejs template with an incorrect format modelTemplate should throw', async () => {
    (fs.promises.access as jest.Mock).mockImplementation(async () => Promise.resolve());
    (ejs.renderFile as jest.Mock).mockImplementation(async () => Promise.reject(new Error('render template failed')));
    await expect(renderTemplate('renderTemplateTest', mockedTemplate)).rejects.toThrow(/render template failed/);
  });

  it('throw errors when write file failed in render template', async () => {
    (fs.promises.access as jest.Mock).mockImplementation(async () => Promise.resolve());
    (ejs.renderFile as jest.Mock).mockImplementation(async () => Promise.resolve());
    (fs.promises.writeFile as jest.Mock).mockImplementation(async () => Promise.reject(new Error()));
    await expect(renderTemplate('renderTemplateTest', mockedTemplate)).rejects.toThrow();
  });
});
