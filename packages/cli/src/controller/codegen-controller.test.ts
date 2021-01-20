// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {getAllEntities, buildSchema} from '@subql/common';
import {processFields, makeSchema} from './codegen-controller';
import {transformTypes} from './types-mapping';

async function makeTempDir() {
  const sep = path.sep;
  const tmpDir = os.tmpdir();
  const tempPath = await fs.promises.mkdtemp(`${tmpDir}${sep}`);
  return tempPath;
}

describe('Codegen can generate schema', () => {
  const badschema = buildSchema(path.join(__dirname, '../../test/badschema.graphql'));
  const badextractEntities = getAllEntities(badschema);
  const goodschema = buildSchema(path.join(__dirname, '../../test/schema.graphql'));
  const goodextractEntities = getAllEntities(goodschema);

  it('can transform field into correct type', () => {
    const testClassName = 'transformTest;';
    expect(transformTypes(testClassName, 'ID')).toBe('string');
    expect(transformTypes(testClassName, 'Int')).toBe('number');
    expect(transformTypes(testClassName, 'BigInt')).toBe('bigint');
    expect(transformTypes(testClassName, 'String')).toBe('string');
    expect(transformTypes(testClassName, 'Date')).toBe('Date');
  });

  it('process field with correct types should pass', () => {
    const testClassName = 'processFieldTest';
    expect.assertions(1);
    for (const entity of goodextractEntities) {
      const fields = entity.getFields();
      const fieldList = processFields(testClassName, fields);
      expect(fieldList).toBeDefined();
    }
  });

  it('process field with unknown type to throw', () => {
    const testClassName = 'processFieldTest';
    for (const entity of badextractEntities) {
      const fields = entity.getFields();
      expect(() => processFields(testClassName, fields)).toThrow();
      //Float in badschema is not support, should throw error
    }
  });

  it('save schema to a correct project directory should pass', async () => {
    const testClassName = 'makeSchemaTest2';
    const tempPath = await makeTempDir();
    process.chdir(tempPath);
    await fs.promises.mkdir('src/types/models', {recursive: true});
    await expect(makeSchema(testClassName, 'random text to add to schema')).resolves.not.toThrow();
  });
});
