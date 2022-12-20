// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {getManifestPath, getSchemaPath, loadFromJsonOrYaml} from '@subql/common';
import {
  isCustomDs as isCustomAvalancheDs,
  isRuntimeDs as isRuntimeAvalancheDs,
  RuntimeDatasourceTemplate as AvalancheDsTemplate,
  CustomDatasourceTemplate as AvalancheCustomDsTemplate,
} from '@subql/common-avalanche';
import {
  isCustomCosmosDs,
  isRuntimeCosmosDs,
  RuntimeDatasourceTemplate as CosmosDsTemplate,
  CustomDatasourceTemplate as CosmosCustomDsTemplate,
} from '@subql/common-cosmos';
import {
  isCustomDs as isCustomEthereumDs,
  isRuntimeDs as isRuntimeEthereumDs,
  RuntimeDatasourceTemplate as EthereumDsTemplate,
  CustomDatasourceTemplate as EthereumCustomDsTemplate,
} from '@subql/common-ethereum';
import {
  isCustomDs as isCustomSubstrateDs,
  RuntimeDatasourceTemplate as SubstrateDsTemplate,
  CustomDatasourceTemplate as SubstrateCustomDsTemplate,
} from '@subql/common-substrate';
import {
  isCustomTerraDs,
  isRuntimeTerraDs,
  RuntimeDatasourceTemplate as TerraDsTemplate,
  CustomDatasourceTemplate as TerraCustomDsTemplate,
} from '@subql/common-terra';
import {
  getAllEntitiesRelations,
  getAllJsonObjects,
  setJsonObjectType,
  getTypeByScalarName,
  GraphQLEntityField,
  GraphQLJsonFieldType,
  GraphQLEntityIndex,
  getAllEnums,
} from '@subql/utils';
import ejs from 'ejs';
import {upperFirst, uniq} from 'lodash';
import rimraf from 'rimraf';

type TemplateKind =
  | SubstrateDsTemplate
  | SubstrateCustomDsTemplate
  | AvalancheDsTemplate
  | AvalancheCustomDsTemplate
  | CosmosDsTemplate
  | CosmosCustomDsTemplate
  | EthereumDsTemplate
  | EthereumCustomDsTemplate
  | TerraDsTemplate
  | TerraCustomDsTemplate;
const MODEL_TEMPLATE_PATH = path.resolve(__dirname, '../template/model.ts.ejs');
const MODELS_INDEX_TEMPLATE_PATH = path.resolve(__dirname, '../template/models-index.ts.ejs');
const TYPES_INDEX_TEMPLATE_PATH = path.resolve(__dirname, '../template/types-index.ts.ejs');
const INTERFACE_TEMPLATE_PATH = path.resolve(__dirname, '../template/interface.ts.ejs');
const ENUM_TEMPLATE_PATH = path.resolve(__dirname, '../template/enum.ts.ejs');
const DYNAMIC_DATASOURCE_TEMPLATE_PATH = path.resolve(__dirname, '../template/datasource-templates.ts.ejs');
const TYPE_ROOT_DIR = 'src/types';
const MODEL_ROOT_DIR = 'src/types/models';
const exportTypes = {
  models: false,
  interfaces: false,
  enums: false,
  datasources: false,
};

// 4. Render entity data in ejs template and write it
export async function renderTemplate(templatePath: string, outputPath: string, templateData: ejs.Data): Promise<void> {
  const data = await ejs.renderFile(templatePath, templateData);
  await fs.promises.writeFile(outputPath, data);
}

// 3. Re-format the field of the entity
export interface ProcessedField {
  name: string;
  type: string;
  required: boolean;
  isEnum: boolean;
  indexed: boolean;
  unique?: boolean;
  isArray: boolean;
  isJsonInterface: boolean;
}

export async function generateJsonInterfaces(projectPath: string, schema: string): Promise<void> {
  const typesDir = path.join(projectPath, TYPE_ROOT_DIR);
  const jsonObjects = getAllJsonObjects(schema);
  const jsonInterfaces = jsonObjects.map((r) => {
    const object = setJsonObjectType(r, jsonObjects);
    const fields = processFields('jsonField', object.name, object.fields);
    return {
      interfaceName: object.name,
      fields,
    };
  });

  if (jsonInterfaces.length !== 0) {
    const interfaceTemplate = {
      props: {
        jsonInterfaces,
      },
      helper: {
        upperFirst,
      },
    };
    try {
      await renderTemplate(INTERFACE_TEMPLATE_PATH, path.join(typesDir, `interfaces.ts`), interfaceTemplate);
      exportTypes.interfaces = true;
    } catch (e) {
      throw new Error(`When render json interfaces having problems.`);
    }
  }
}

export async function generateEnums(projectPath: string, schema: string): Promise<void> {
  const typesDir = path.join(projectPath, TYPE_ROOT_DIR);
  const jsonObjects = getAllEnums(schema);
  const enums = jsonObjects.map((r) => {
    return {
      name: r.name,
      values: r.getValues().map((v) => v.name),
    };
  });

  if (enums.length !== 0) {
    const enumsTemplate = {
      props: {
        enums,
      },
    };
    try {
      await renderTemplate(ENUM_TEMPLATE_PATH, path.join(typesDir, `enums.ts`), enumsTemplate);
      exportTypes.enums = true;
    } catch (e) {
      throw new Error(`When render enums having problems.`);
    }
  }
}

export function processFields(
  type: 'entity' | 'jsonField',
  className: string,
  fields: (GraphQLEntityField | GraphQLJsonFieldType)[],
  indexFields: GraphQLEntityIndex[] = []
): ProcessedField[] {
  const fieldList: ProcessedField[] = [];
  for (const field of fields) {
    const injectField = {
      name: field.name,
      required: !field.nullable,
      isArray: field.isArray,
      isEnum: false,
    } as ProcessedField;
    if (type === 'entity') {
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
      injectField.indexed = indexed;
      injectField.unique = unique;
    }
    if ((field as GraphQLEntityField).isEnum) {
      injectField.type = field.type;
      injectField.isEnum = true;
      injectField.isJsonInterface = false;
    } else {
      switch (field.type) {
        default: {
          injectField.type = getTypeByScalarName(field.type).tsType;
          if (!injectField.type) {
            throw new Error(
              `Schema: undefined type "${field.type.toString()}" on field "${
                field.name
              }" in "type ${className} @${type}"`
            );
          }
          injectField.isJsonInterface = false;
          break;
        }
        case 'Json': {
          if (field.jsonInterface === undefined) {
            throw new Error(`On field ${field.name} type is Json but json interface is not defined`);
          }
          injectField.type = upperFirst(field.jsonInterface.name);
          injectField.isJsonInterface = true;
        }
      }
    }
    fieldList.push(injectField);
  }
  return fieldList;
}

async function prepareDirPath(path: string, recreate: boolean) {
  try {
    await promisify(rimraf)(path);
    if (recreate) {
      await fs.promises.mkdir(path, {recursive: true});
    }
  } catch (e) {
    throw new Error(`Failed to prepare ${path}`);
  }
}

//1. Prepare models directory and load schema
export async function codegen(projectPath: string, fileName?: string): Promise<void> {
  const modelDir = path.join(projectPath, MODEL_ROOT_DIR);
  const interfacesPath = path.join(projectPath, TYPE_ROOT_DIR, `interfaces.ts`);
  await prepareDirPath(modelDir, true);
  await prepareDirPath(interfacesPath, false);

  const plainManifest = loadFromJsonOrYaml(getManifestPath(projectPath, fileName)) as {
    specVersion: string;
    templates?: TemplateKind[];
  };
  if (plainManifest.templates && plainManifest.templates.length !== 0) {
    await generateDatasourceTemplates(projectPath, plainManifest.specVersion, plainManifest.templates);
  }
  const schemaPath = getSchemaPath(projectPath, fileName);

  await generateJsonInterfaces(projectPath, schemaPath);
  await generateModels(projectPath, schemaPath);
  await generateEnums(projectPath, schemaPath);

  if (exportTypes.interfaces || exportTypes.models || exportTypes.enums || exportTypes.datasources) {
    try {
      await renderTemplate(TYPES_INDEX_TEMPLATE_PATH, path.join(projectPath, TYPE_ROOT_DIR, `index.ts`), {
        props: {
          exportTypes,
        },
      });
    } catch (e) {
      throw new Error(`When render index in types having problems.`);
    }
    console.log(`* Types index generated !`);
  }
}

// 2. Loop all entities and render it
export async function generateModels(projectPath: string, schema: string): Promise<void> {
  const extractEntities = getAllEntitiesRelations(schema);
  for (const entity of extractEntities.models) {
    const baseFolderPath = '.../../base';
    const className = upperFirst(entity.name);
    const entityName = entity.name;
    const fields = processFields('entity', className, entity.fields, entity.indexes);
    const importJsonInterfaces = uniq(fields.filter((field) => field.isJsonInterface).map((f) => f.type));
    const importEnums = fields.filter((field) => field.isEnum).map((f) => f.type);
    const indexedFields = fields.filter((field) => field.indexed && !field.isJsonInterface);
    const modelTemplate = {
      props: {
        baseFolderPath,
        className,
        entityName,
        fields,
        importJsonInterfaces,
        importEnums,
        indexedFields,
      },
      helper: {
        upperFirst,
      },
    };
    try {
      await renderTemplate(
        MODEL_TEMPLATE_PATH,
        path.join(projectPath, MODEL_ROOT_DIR, `${className}.ts`),
        modelTemplate
      );
    } catch (e) {
      console.error(e);
      throw new Error(`When render entity ${className} to schema having problems.`);
    }
    console.log(`* Schema ${className} generated !`);
  }
  const classNames = extractEntities.models.map((entity) => entity.name);
  if (classNames.length !== 0) {
    try {
      await renderTemplate(MODELS_INDEX_TEMPLATE_PATH, path.join(projectPath, MODEL_ROOT_DIR, `index.ts`), {
        props: {
          classNames,
        },
        helper: {
          upperFirst,
        },
      });
      exportTypes.models = true;
    } catch (e) {
      throw new Error(`When render index in models having problems.`);
    }
    console.log(`* Models index generated !`);
  }
}

export async function generateDatasourceTemplates(
  projectPath: string,
  specVersion: string,
  templates: TemplateKind[]
): Promise<void> {
  const props = templates.map((t) => ({
    name: t.name,
    args: hasParameters(t) ? 'Record<string, unknown>' : undefined,
  }));
  try {
    await renderTemplate(DYNAMIC_DATASOURCE_TEMPLATE_PATH, path.join(projectPath, TYPE_ROOT_DIR, `datasources.ts`), {
      props,
    });
    exportTypes.datasources = true;
  } catch (e) {
    console.error(e);
    throw new Error(`Unable to generate datasource template constructors`);
  }
  console.log(`* Datasource template constructors generated !`);
}

function hasParameters(t: TemplateKind): boolean {
  return (
    isRuntimeAvalancheDs(t as AvalancheDsTemplate) ||
    isCustomAvalancheDs(t as AvalancheDsTemplate) ||
    isRuntimeCosmosDs(t as CosmosDsTemplate) ||
    isCustomCosmosDs(t as CosmosDsTemplate) ||
    isRuntimeEthereumDs(t as EthereumDsTemplate) ||
    isCustomEthereumDs(t as EthereumDsTemplate) ||
    isCustomSubstrateDs(t as SubstrateDsTemplate) ||
    isRuntimeTerraDs(t as TerraDsTemplate) ||
    isCustomTerraDs(t as TerraDsTemplate)
  );
}
