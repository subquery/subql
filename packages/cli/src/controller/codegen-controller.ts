// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {getAllEntitiesRelations, buildSchema, loadProjectManifest} from '@subql/common';
import {GraphQLEntityField} from "@subql/common/graphql/types";
import ejs from 'ejs';
import {GraphQLSchema} from 'graphql';
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
export interface processedField {
  name: string;
  type: string;
  required: boolean;
}

export function processFields(className: string, fields: GraphQLEntityField[]): processedField[] {
  const fieldList: processedField[] = [];
  for (const field of fields) {
    const newType = transformTypes(className, field.type.toString());
    if (!newType) {
      throw new Error(`Undefined type ${field.type.toString()} in Schema ${className}`);
    }
    fieldList.push({
      name: field.name,
      type: newType,
      required: !field.nullable,
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
  const schema = buildSchema(path.join(projectPath, manifest.schema));
  await generateModels(projectPath, schema);
}

// 2. Loop all entities and render it
export async function generateModels(projectPath: string, schema: GraphQLSchema): Promise<void> {
  const extractEntities = getAllEntitiesRelations(schema);
  for (const entity of extractEntities.models) {
    const baseFolderPath = '.../../base';
    const className = entity.name;
    const fields = processFields(className, entity.fields);
    const modelTemplate = {
      props: {
        baseFolderPath,
        className,
        fields,
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
