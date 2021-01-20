// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {getAllEntities, buildSchema} from '@subql/common';
import ejs from 'ejs';
import {isNonNullType, getNullableType} from 'graphql';
import {GraphQLFieldMap, GraphQLOutputType} from 'graphql/type/definition';
import {transformTypes} from './types-mapping';

const templatePath: string = path.resolve(__dirname, '../template/model.ts.ejs');

// 3. Render entity data in ejs template and write it
export async function renderTemplate(className: string, modelTemplate: ejs.Data): Promise<void> {
  const typesPath = path.resolve(`./src/types/models`);
  const filename = `${className}.ts`;
  const file = `${typesPath}/${filename}`;
  let data: string;

  try {
    await fs.promises.access(typesPath);
  } catch (err) {
    throw new Error('Write schema failed, not in project directory');
  }

  try {
    data = await ejs.renderFile(templatePath, modelTemplate);
  } catch (err) {
    throw new Error(err.message);
  }

  try {
    await fs.promises.writeFile(file, data);
  } catch (err) {
    throw new Error(err.message);
  } finally {
    console.log(`---> Schema ${className} generated !`);
  }
}

// 2. Re-format the field of the entity
export interface processedField {
  name: string;
  type: string;
  required: boolean;
}

export function processFields(className: string, fields: GraphQLFieldMap<unknown, unknown>): processedField[] {
  const fieldList: processedField[] = [];
  for (const k in fields) {
    if (Object.prototype.hasOwnProperty.call(fields, k)) {
      const type: GraphQLOutputType = isNonNullType(fields[k].type) ? getNullableType(fields[k].type) : fields[k].type;
      const newType = transformTypes(className, type.toString());
      if (!newType) {
        const errMsg = `Undefined type ${type.toString()} in Schema ${className}`;
        throw new Error(errMsg);
      }
      fieldList.push({
        name: fields[k].name,
        type: newType,
        required: isNonNullType(fields[k].type),
      });
    }
  }
  return fieldList;
}

// 1. Loop all entities and render it
export async function generateSchema(): Promise<void> {
  const schema = buildSchema('./schema.graphql');
  const extractEntities = getAllEntities(schema);
  for (const entity of extractEntities) {
    const baseFolderPath = '.../../base';
    const className = entity.name;
    const fields = entity.getFields();
    const processedFields: processedField[] = processFields(className, fields);
    const modelTemplate = {
      props: {
        baseFolderPath: baseFolderPath,
        className: className,
        fields: processedFields,
      },
    };
    console.log(`<--- Start generate schema ${modelTemplate.props.className}`);
    await renderTemplate(className, modelTemplate);
  }
}
