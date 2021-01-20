import {getAllEntities, buildSchema} from '@subql/common';
import {transformTypes} from './types-mapping';
import {processFields, renderTemplate, makeSchema, generateSchema} from './codegen-controller';
import path from 'path';
import os from 'os';
import fs from 'fs';

async function makeTempDir(): Promise<string> {
  const sep = path.sep;
  const tmpDir = os.tmpdir();
  return fs.mkdtempSync(`${tmpDir}${sep}`);
}

describe('Codegen can generate schema', () => {
  const badschema = buildSchema(path.join(__dirname, '../../test/badschema.graphql'));
  const badextractEntities = getAllEntities(badschema);
  const goodschema = buildSchema(path.join(__dirname, '../../test/schema.graphql'));
  const goodextractEntities = getAllEntities(goodschema);
  const sep = path.sep;
  const tmpDir = os.tmpdir();
  const tempPath = fs.mkdtempSync(`${tmpDir}${sep}`);

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
    expect.assertions(1);
    for (const entity of badextractEntities) {
      const fields = entity.getFields();
      expect(() => processFields(testClassName, fields)).toThrow();
      //Float in badschema is not support, should throw error
    }
  });

  it('save schema to a empty project directory should fail', async () => {
    const testClassName = 'makeSchemaTest';
    const tempPath = await makeTempDir();
    process.chdir(tempPath);
    await expect(makeSchema('classname', 'random data')).rejects.toThrow(
      /Write schema to file failed, check project directory is correct/
    );
  });

  it('save schema to a correct project directory should pass', async () => {
    const testClassName = 'makeSchemaTest2';
    const tempPath = await makeTempDir();
    process.chdir(tempPath);
    fs.mkdir('src/types/models', {recursive: true}, (err) => {
      expect(makeSchema(testClassName, 'random text to add to schema')).resolves.not.toThrow();
    });
  });
});
