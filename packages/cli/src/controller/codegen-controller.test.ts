// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {promisify} from 'util';
import rimraf from 'rimraf';
import {codegen} from './codegen-controller';
import {transformTypes} from './types-mapping';

jest.setTimeout(30000);

describe('Codegen can generate schema', () => {
  afterEach(async () => {
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest1/src'));
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest2/src'));
  });

  it('can transform field into correct type', () => {
    const testClassName = 'transformTest;';
    expect(transformTypes(testClassName, 'ID')).toBe('string');
    expect(transformTypes(testClassName, 'Int')).toBe('number');
    expect(transformTypes(testClassName, 'BigInt')).toBe('bigint');
    expect(transformTypes(testClassName, 'String')).toBe('string');
    expect(transformTypes(testClassName, 'Date')).toBe('Date');
  });

  it('codegen with correct schema should pass', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest1');
    await codegen(projectPath);
  });

  it('codegen with incorrect schema field should fail', async () => {
    const projectPath = path.join(__dirname, '../../test/schemaTest2');
    await expect(codegen(projectPath)).rejects.toThrow(/Undefined type/);
  });
});
