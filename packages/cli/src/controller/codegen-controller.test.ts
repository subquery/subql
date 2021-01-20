// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {getAllEntities, buildSchema} from '@subql/common';
import {processFields} from './codegen-controller';
import {transformTypes} from './types-mapping';

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
});
