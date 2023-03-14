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
  RuntimeDataSourceV0_3_0 as EthereumDs,
  CustomDatasourceV0_3_0 as EthereumCustomDs,
} from '@subql/common-ethereum';
import {
  isCustomDs as isCustomNearDs,
  isRuntimeDs as isRuntimeNearDs,
  RuntimeDatasourceTemplate as NearDsTemplate,
  CustomDatasourceTemplate as NearCustomDsTemplate,
} from '@subql/common-near';
import {
  isCustomDs as isCustomSubstrateDs,
  RuntimeDatasourceTemplate as SubstrateDsTemplate,
  CustomDatasourceTemplate as SubstrateCustomDsTemplate,
  CustomDatasourceV0_2_0 as SubstrateCustomDatasource,
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
import {runTypeChain, glob, parseContractPath} from 'typechain';

type TemplateKind =
  | SubstrateDsTemplate
  | SubstrateCustomDsTemplate
  | AvalancheDsTemplate
  | AvalancheCustomDsTemplate
  | CosmosDsTemplate
  | CosmosCustomDsTemplate
  | EthereumDsTemplate
  | EthereumCustomDsTemplate
  | NearDsTemplate
  | NearCustomDsTemplate
  | TerraDsTemplate
  | TerraCustomDsTemplate;

type DatasourceKind = SubstrateCustomDatasource | EthereumDs | EthereumCustomDs;

const MODEL_TEMPLATE_PATH = path.resolve(__dirname, '../template/model.ts.ejs');
const MODELS_INDEX_TEMPLATE_PATH = path.resolve(__dirname, '../template/models-index.ts.ejs');
const TYPES_INDEX_TEMPLATE_PATH = path.resolve(__dirname, '../template/types-index.ts.ejs');
const INTERFACE_TEMPLATE_PATH = path.resolve(__dirname, '../template/interface.ts.ejs');
const ABI_INTERFACE_TEMPLATE_PATH = path.resolve(__dirname, '../template/abi-interface.ts.ejs');
const ENUM_TEMPLATE_PATH = path.resolve(__dirname, '../template/enum.ts.ejs');
const DYNAMIC_DATASOURCE_TEMPLATE_PATH = path.resolve(__dirname, '../template/datasource-templates.ts.ejs');
const TYPE_ROOT_DIR = 'src/types';
const MODEL_ROOT_DIR = 'src/types/models';
const ABI_INTERFACES_ROOT_DIR = 'src/types/abi-interfaces';
const CONTRACTS_DIR = 'src/types/contracts'; //generated
const TYPECHAIN_TARGET = 'ethers-v5';

const RESERVED_KEYS = ['filter', 'filters'];

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

interface abiRenderProps {
  name: string;
  events: string[];
  functions: {typeName: string; functionName: string}[];
}
interface abiInterface {
  name: string;
  type: 'event' | 'function';
  inputs: {
    internalType: string;
    name: string;
    type: string;
  }[];
}
export async function generateAbis(datasources: DatasourceKind[], projectPath: string): Promise<void> {
  const sortedAssets = new Map<string, string>();
  datasources.map((d) => {
    if (!d?.assets) {
      return;
    }
    if (isRuntimeEthereumDs(d) || isCustomEthereumDs(d) || isCustomSubstrateDs(d)) {
      Object.entries(d.assets).map(([name, value]) => {
        const filePath = path.join(projectPath, value.file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Error: Asset ${name}, file ${value.file} does not exist`);
        }
        // We use actual abi file name instead on name provided in assets
        // This is aligning with files in './ethers-contracts'
        sortedAssets.set(parseContractPath(filePath).name, value.file);
      });
    }
  });
  if (sortedAssets.size !== 0) {
    await prepareDirPath(path.join(projectPath, ABI_INTERFACES_ROOT_DIR), true);
    try {
      const allFiles = glob(projectPath, [...sortedAssets.values()]);
      // Typechain generate interfaces under CONTRACTS_DIR
      await runTypeChain({
        cwd: projectPath,
        filesToProcess: allFiles,
        allFiles,
        outDir: CONTRACTS_DIR,
        target: TYPECHAIN_TARGET,
      });
      // Iterate here as we have to make sure type chain generated successful,
      // also avoid duplicate generate same abi interfaces
      const renderAbiJobs = processAbis(sortedAssets, projectPath);
      await Promise.all(
        renderAbiJobs.map((renderProps) => {
          console.log(`* Abi Interface ${renderProps.name} generated`);
          return renderTemplate(
            ABI_INTERFACE_TEMPLATE_PATH,
            path.join(projectPath, ABI_INTERFACES_ROOT_DIR, `${renderProps.name}.ts`),
            {
              props: {abi: renderProps},
              helper: {upperFirst},
            }
          );
        })
      );
    } catch (e) {
      throw new Error(`When render abi interface having problems.`);
    }
  }
}

function processAbis(sortedAssets: Map<string, string>, projectPath: string): abiRenderProps[] {
  const renderInterfaceJobs: abiRenderProps[] = [];
  sortedAssets.forEach((value, key) => {
    const renderProps: abiRenderProps = {name: key, events: [], functions: []};
    const readAbi = loadFromJsonOrYaml(path.join(projectPath, value)) as abiInterface[];
    // We need to use for loop instead of map, due to events/function name could be duplicate,
    // because they have different input, and following ether typegen rules, name also changed
    // we need to find duplicates, and update its name rather than just unify them.
    const duplicateEventNames = readAbi
      .filter((abiObject) => abiObject.type === 'event')
      .map((obj) => obj.name)
      .filter((name, index, arr) => arr.indexOf(name) !== index);
    const duplicateFunctionNames = readAbi
      .filter((abiObject) => abiObject.type === 'function')
      .map((obj) => obj.name)
      .filter((name, index, arr) => arr.indexOf(name) !== index);
    readAbi.map((abiObject) => {
      if (abiObject.type === 'function') {
        let typeName = abiObject.name;
        let functionName = abiObject.name;
        if (duplicateFunctionNames.includes(abiObject.name)) {
          functionName = `${abiObject.name}(${abiObject.inputs.map((obj) => obj.type.toLowerCase()).join(',')})`;
          typeName = joinInputAbiName(abiObject);
        }
        renderProps.functions.push({typeName, functionName});
      }
      if (abiObject.type === 'event') {
        let name = abiObject.name;
        if (duplicateEventNames.includes(abiObject.name)) {
          name = joinInputAbiName(abiObject);
        }
        renderProps.events.push(name);
      }
    });
    // avoid empty json
    if (!!renderProps.events || !!renderProps.functions) {
      renderInterfaceJobs.push(renderProps);
    }
  });
  return renderInterfaceJobs;
}

function joinInputAbiName(abiObject: abiInterface) {
  // example: "TextChanged_bytes32_string_string_string_Event", Event name/Function type name will be joined in ejs
  const inputToSnake: string = abiObject.inputs.map((obj) => obj.type.toLowerCase()).join('_');
  return `${abiObject.name}_${inputToSnake}_`;
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
    dataSources: DatasourceKind[];
  };
  if (plainManifest.templates && plainManifest.templates.length !== 0) {
    await generateDatasourceTemplates(projectPath, plainManifest.specVersion, plainManifest.templates);
  }

  const schemaPath = getSchemaPath(projectPath, fileName);

  await generateAbis(plainManifest.dataSources, projectPath);
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
export function validateEntityName(name: string): string {
  for (const reservedKey of RESERVED_KEYS) {
    if (name.toLowerCase().endsWith(reservedKey.toLowerCase())) {
      throw new Error(`EntityName: ${name} cannot end with reservedKey: ${reservedKey}`);
    }
  }
  return name;
}
// 2. Loop all entities and render it
export async function generateModels(projectPath: string, schema: string): Promise<void> {
  const extractEntities = getAllEntitiesRelations(schema);
  for (const entity of extractEntities.models) {
    const baseFolderPath = '.../../base';
    const className = upperFirst(entity.name);

    const entityName = validateEntityName(entity.name);

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
    isCustomTerraDs(t as TerraDsTemplate) ||
    isRuntimeNearDs(t as NearDsTemplate) ||
    isCustomNearDs(t as NearDsTemplate)
  );
}
