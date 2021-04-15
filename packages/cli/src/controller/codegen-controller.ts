// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {getAllEntitiesRelations, loadProjectManifest} from '@subql/common';
import {GraphQLEntityField, GraphQLEntityIndex} from '@subql/common/graphql/types';
import ejs from 'ejs';
import {upperFirst} from 'lodash';
import rimraf from 'rimraf';
import {transformTypes} from './types-mapping';

const TEMPLATE_PATH = path.resolve(__dirname, '../template/model.ts.ejs');

const MODEL_ROOT_DIR = 'src/types/models';

// 4. Render entity data in ejs template and write it
export async function renderTemplate(outputPath: string, templateData: ejs.Data): Promise<void> {
  const data = await ejs.renderFile(TEMPLATE_PATH, templateData);
  await fs.promises.writeFile(outputPath, data);
}

// 3. Re-format the field of the entity
export interface ProcessedField {
  name: string;
  type: string;
  required: boolean;
  indexed: boolean;
  unique?: boolean;
}

export function processFields(
  className: string,
  fields: GraphQLEntityField[],
  indexFields: GraphQLEntityIndex[]
): ProcessedField[] {
  const fieldList: ProcessedField[] = [];
  for (const field of fields) {
    const newType = transformTypes(className, field.type.toString());
    if (!newType) {
      throw new Error(`Undefined type ${field.type.toString()} in Schema ${className}`);
    }
    const [indexed, unique] = indexFields.reduce<[boolean, boolean]>(
      (acc, indexField) => {
        if (indexField.fields.includes(field.name)) {
          acc[0] = true;
          if (indexField.fields.length === 1 && indexField.unique) {
            acc[1] = true;
          } else if (indexField.unique === undefined) {
            acc[1] = false;
          }
        }
        return acc;
      },
      [false, undefined]
    );
    fieldList.push({
      name: field.name,
      type: newType,
      required: !field.nullable,
      indexed,
      unique,
    });
  }
  return fieldList;
}

//1. Prepare models directory and load schema
export async function codegen(projectPath: string): Promise<void> {
  const modelDir = path.join(projectPath, MODEL_ROOT_DIR);
  try {
    await promisify(rimraf)(modelDir);
    await fs.promises.mkdir(modelDir, {recursive: true});
  } catch (e) {
    throw new Error(`Failed to prepare ${modelDir}`);
  }
  const manifest = loadProjectManifest(projectPath);
  await generateModels(projectPath, path.join(projectPath, manifest.schema));
}

// 2. Loop all entities and render it
export async function generateModels(projectPath: string, schema: string): Promise<void> {
  const extractEntities = getAllEntitiesRelations(schema);
  for (const entity of extractEntities.models) {
    const baseFolderPath = '.../../base';
    const className = upperFirst(entity.name);
    const fields = processFields(className, entity.fields, entity.indexes);
    const indexedFields = fields.filter((field) => field.indexed);
    const modelTemplate = {
      props: {
        baseFolderPath,
        className,
        fields,
        indexedFields,
      },
      helper: {
        upperFirst,
      },
    };
    console.log(`| Start generate schema ${className}`);
    try {
      await renderTemplate(path.join(projectPath, MODEL_ROOT_DIR, `${className}.ts`), modelTemplate);
    } catch (e) {
      throw new Error(`When render entity ${className} to schema having problems.`);
    }
    console.log(`* Schema ${className} generated !`);
  }
}
