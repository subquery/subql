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

// 4. Save the rendered schema
export async function makeSchema(className: string, data: string): Promise<void> {
  const typesPath = `${process.cwd()}/src/types/models`;
  const filename = `${className}.ts`;
  const file = `${typesPath}/${filename}`;

  try {
    await fs.promises.access(typesPath);
  } catch (err) {
    throw new Error('Write schema to file failed, check project directory is correct');
  }

  try {
    await fs.promises.writeFile(file, data);
  } catch (err) {
    throw new Error(err.message);
  }
  console.log(`>--- Schema ${className} generated !`);
}

// 3. Render entity data in ejs template
export async function renderTemplate(className: string, modelTemplate: ejs.Data): Promise<void> {
  try {
    const renderedFilePath = await ejs.renderFile(templatePath, modelTemplate);
    await makeSchema(className, renderedFilePath);
  } catch (err) {
    throw new Error(err.message);
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
        const errMsg = 'Undefined type ' + type.toString() + ' in Schema ' + className;
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
