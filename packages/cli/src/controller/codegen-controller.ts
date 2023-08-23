// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {DEFAULT_MANIFEST, getManifestPath, getSchemaPath, loadFromJsonOrYaml} from '@subql/common';
import {
  isCustomCosmosDs,
  isRuntimeCosmosDs,
  RuntimeDatasourceTemplate as CosmosDsTemplate,
  CustomDatasourceTemplate as CosmosCustomDsTemplate,
  generateProto,
  tempProtoDir,
  validateCosmosManifest,
  ProjectManifestImpls as CosmosManifest,
} from '@subql/common-cosmos';
import {
  isCustomDs as isCustomEthereumDs,
  isRuntimeDs as isRuntimeEthereumDs,
  RuntimeDatasourceTemplate as EthereumDsTemplate,
  CustomDatasourceTemplate as EthereumCustomDsTemplate,
} from '@subql/common-ethereum';
import {
  isCustomDs as isCustomNearDs,
  isRuntimeDs as isRuntimeNearDs,
  RuntimeDatasourceTemplate as NearDsTemplate,
  CustomDatasourceTemplate as NearCustomDsTemplate,
} from '@subql/common-near';
import {
  isCustomDs as isCustomStellarDs,
  isRuntimeDs as isRuntimeStellarDs,
  RuntimeDatasourceTemplate as StellarDsTemplate,
  CustomDatasourceTemplate as StellarCustomDsTemplate,
} from '@subql/common-stellar';
import {
  isCustomDs as isCustomSubstrateDs,
  RuntimeDatasourceTemplate as SubstrateDsTemplate,
  CustomDatasourceTemplate as SubstrateCustomDsTemplate,
  SubstrateCustomDataSource,
} from '@subql/common-substrate';
import {SubqlRuntimeDatasource as EthereumDs, SubqlCustomDatasource as EthereumCustomDs} from '@subql/types-ethereum';
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
import {upperFirst, uniq, uniqBy} from 'lodash';
import {runTypeChain, glob, parseContractPath} from 'typechain';
import {renderTemplate, prepareDirPath} from '../utils';

type TemplateKind =
  | SubstrateDsTemplate
  | SubstrateCustomDsTemplate
  | CosmosDsTemplate
  | CosmosCustomDsTemplate
  | EthereumDsTemplate
  | EthereumCustomDsTemplate
  | NearDsTemplate
  | NearCustomDsTemplate
  | StellarDsTemplate
  | StellarCustomDsTemplate;

export type DatasourceKind = SubstrateCustomDataSource | EthereumDs | EthereumCustomDs;

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
const CUSTOM_EVM_HANDLERS = [
  'cosmos/EthermintEvm',
  'substrate/FrontierEvm',
  'substrate/AcalaEvm',
  'substrate/Moonbeam',
];

const exportTypes = {
  models: false,
  interfaces: false,
  enums: false,
  datasources: false,
};

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

export interface abiRenderProps {
  name: string;
  events: string[];
  functions: {typeName: string; functionName: string}[];
}
export interface abiInterface {
  name: string;
  type: 'event' | 'function';
  inputs: {
    internalType: string;
    name: string;
    type: string;
  }[];
}
function validateCustomDs(d: DatasourceKind) {
  return CUSTOM_EVM_HANDLERS.includes(d.kind);
}

export async function generateAbis(datasources: DatasourceKind[], projectPath: string): Promise<void> {
  const sortedAssets = new Map<string, string>();
  datasources.map((d) => {
    if (!d?.assets) {
      return;
    }
    if (isRuntimeEthereumDs(d) || isCustomEthereumDs(d) || validateCustomDs(d)) {
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
  if (sortedAssets.size === 0) {
    return prepareDirPath(path.join(projectPath, ABI_INTERFACES_ROOT_DIR), false);
  }

  await prepareDirPath(path.join(projectPath, ABI_INTERFACES_ROOT_DIR), true);
  try {
    const allFiles = glob(projectPath, [...sortedAssets.values()]);
    // Typechain generate interfaces under CONTRACTS_DIR
    // Run typechain for individual paths, if provided glob paths are the same,
    // it will generate incorrect file structures, and fail to generate contracts for certain abis
    await Promise.all(
      allFiles.map((file) =>
        runTypeChain({
          cwd: projectPath,
          filesToProcess: [file],
          allFiles: [file],
          outDir: CONTRACTS_DIR,
          target: TYPECHAIN_TARGET,
        })
      )
    );
    // Iterate here as we have to make sure type chain generated successful,
    // also avoid duplicate generate same abi interfaces
    const renderAbiJobs = processAbis(sortedAssets, projectPath, loadFromJsonOrYamlWrapper);
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
    console.error(`! Unable to generate abi interface. ${e.message}`);
  }
}

function loadFromJsonOrYamlWrapper(filePath: string): abiInterface[] | {abi: abiInterface[]} {
  return loadFromJsonOrYaml(filePath) as abiInterface[] | {abi: abiInterface[]};
}

export function processAbis(
  sortedAssets: Map<string, string>,
  projectPath: string,
  loadReadAbi: (filePath: string) => abiInterface[] | {abi: abiInterface[]}
): abiRenderProps[] {
  const renderInterfaceJobs: abiRenderProps[] = [];
  sortedAssets.forEach((value, key) => {
    const renderProps: abiRenderProps = {name: key, events: [], functions: []};
    const readAbi = loadReadAbi(path.join(projectPath, value));
    // We need to use for loop instead of map, due to events/function name could be duplicate,
    // because they have different input, and following ether typegen rules, name also changed
    // we need to find duplicates, and update its name rather than just unify them.

    let abiArray: abiInterface[] = [];

    if (!Array.isArray(readAbi)) {
      if (!readAbi.abi) {
        throw new Error(`Provided ABI is not a valid ABI or Artifact`);
      }
      abiArray = readAbi.abi;
    } else {
      abiArray = readAbi;
    }

    if (!abiArray.length) {
      throw new Error(`Invalid abi is provided at asset: ${key}`);
    }

    const duplicateEventNames = abiArray
      .filter((abiObject) => abiObject.type === 'event')
      .map((obj) => obj.name)
      .filter((name, index, arr) => arr.indexOf(name) !== index);
    const duplicateFunctionNames = abiArray
      .filter((abiObject) => abiObject.type === 'function')
      .map((obj) => obj.name)
      .filter((name, index, arr) => arr.indexOf(name) !== index);
    abiArray.map((abiObject) => {
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
          if (indexField.fields.includes(field.name) && indexField.fields.length <= 1) {
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

//1. Prepare models directory and load schema
export async function codegen(projectPath: string, fileNames: string[] = [DEFAULT_MANIFEST]): Promise<void> {
  const modelDir = path.join(projectPath, MODEL_ROOT_DIR);
  const interfacesPath = path.join(projectPath, TYPE_ROOT_DIR, `interfaces.ts`);
  await prepareDirPath(modelDir, true);
  await prepareDirPath(interfacesPath, false);

  const plainManifests = fileNames.map(
    (fileName) =>
      loadFromJsonOrYaml(getManifestPath(projectPath, fileName)) as {
        specVersion: string;
        templates?: TemplateKind[];
        dataSources: DatasourceKind[];
      }
  );

  const expectKeys = ['datasources', 'templates'];

  const customDatasources = plainManifests.flatMap((plainManifest) => {
    return Object.keys(plainManifest)
      .filter((key) => !expectKeys.includes(key))
      .map((dsKey) => {
        const value = (plainManifest as any)[dsKey];
        if (typeof value === 'object' && value) {
          return !!Object.keys(value).find((d) => d === 'assets') && value;
        }
      })
      .filter(Boolean);
  });

  const schema = getSchemaPath(projectPath, fileNames[0]);
  await generateSchemaModels(projectPath, schema);

  let datasources = plainManifests.reduce((prev, current) => {
    return prev.concat(current.dataSources);
  }, []);

  const templates = plainManifests.reduce((prev, current) => {
    if (current.templates && current.templates.length !== 0) {
      return prev.concat(current.templates);
    }
    return prev;
  }, []);

  if (templates.length !== 0) {
    await generateDatasourceTemplates(projectPath, templates);
    datasources = datasources.concat(templates as DatasourceKind[]);
  }

  if (customDatasources.length !== 0) {
    datasources = datasources.concat(customDatasources);
  }

  const chainTypes = plainManifests
    .filter((m) => validateCosmosManifest(m))
    .map((m) => (m as CosmosManifest).network.chainTypes);

  if (chainTypes.length !== 0) {
    await generateProto(chainTypes, projectPath, prepareDirPath, renderTemplate, upperFirst, tempProtoDir);
  }

  await generateAbis(datasources, projectPath);

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

export async function generateSchemaModels(projectPath: string, schemaPath: string): Promise<void> {
  const modelDir = path.join(projectPath, MODEL_ROOT_DIR);
  const interfacesPath = path.join(projectPath, TYPE_ROOT_DIR, `interfaces.ts`);
  await prepareDirPath(modelDir, true);
  await prepareDirPath(interfacesPath, false);

  await generateJsonInterfaces(projectPath, schemaPath);
  await generateModels(projectPath, schemaPath);
  await generateEnums(projectPath, schemaPath);
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

export async function generateDatasourceTemplates(projectPath: string, templates: TemplateKind[]): Promise<void> {
  const props = templates.map((t) => ({
    name: t.name,
    args: hasParameters(t) ? 'Record<string, unknown>' : undefined,
  }));

  const propsWithoutDuplicates = uniqBy(props, (prop) => `${prop.name}-${prop.args}`);

  try {
    await renderTemplate(DYNAMIC_DATASOURCE_TEMPLATE_PATH, path.join(projectPath, TYPE_ROOT_DIR, `datasources.ts`), {
      props: propsWithoutDuplicates,
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
    isRuntimeCosmosDs(t as CosmosDsTemplate) ||
    isCustomCosmosDs(t as CosmosDsTemplate) ||
    isRuntimeEthereumDs(t as EthereumDsTemplate) ||
    isCustomEthereumDs(t as EthereumDsTemplate) ||
    isCustomSubstrateDs(t as SubstrateDsTemplate) ||
    isRuntimeNearDs(t as NearDsTemplate) ||
    isCustomNearDs(t as NearDsTemplate) ||
    isRuntimeStellarDs(t as StellarDsTemplate) ||
    isCustomStellarDs(t as StellarDsTemplate)
  );
}
