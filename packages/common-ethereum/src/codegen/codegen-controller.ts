// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {Interface, EventFragment, FunctionFragment} from '@ethersproject/abi';
import {FileReference} from '@subql/types-core';
import {EthereumHandlerKind, SubqlRuntimeDatasource} from '@subql/types-ethereum';
import {Data} from 'ejs';
import {runTypeChain, glob, parseContractPath} from 'typechain';
import {isCustomDs, isRuntimeDs, NOT_NULL_FILTER} from '../project';
import {CUSTOM_EVM_HANDLERS} from './constants';
import {loadReadAbi} from './utils';

const RECONSTRUCTED_FACTORIES_TS = path.resolve(__dirname, '../../templates/factories-index.ts.ejs');
const RECONSTRUCTED_CONTRACTS_TS = path.resolve(__dirname, '../../templates/contracts-index.ts.ejs');
const ABI_INTERFACE_TEMPLATE_PATH = path.resolve(__dirname, '../../templates/abi-interface.ts.ejs');
const ABI_INTERFACES_ROOT_DIR = 'src/types/abi-interfaces';
const CONTRACTS_DIR = 'src/types/contracts'; //generated
const FACTORIES_DIR = path.join(CONTRACTS_DIR, 'factories'); // generated
const TYPECHAIN_TARGET = 'ethers-v5';

export interface AbiRenderProps {
  name: string;
  events: string[];
  functions: {typeName: string; functionName: string}[];
}
export interface AbiInterface {
  name: string;
  type: 'event' | 'function';
  inputs: AbiInput[];
}
type AbiInput = {
  internalType: string;
  components?: AbiInput[];
  name: string;
  type: string;
};

function validateCustomDsDs(d: {kind: string}): boolean {
  return CUSTOM_EVM_HANDLERS.includes(d.kind);
}

function validateAbi(datasources: SubqlRuntimeDatasource[], projectPath: string) {
  const issues: string[] = [];
  for (const datasource of datasources) {
    if (!datasource.options?.abi) {
      // No ABI to validate
      continue;
    }
    const abiName = datasource.options.abi;
    const topicIssues: string[] = [];
    const funcIssues: string[] = [];

    let data = '';
    try {
      const abi = datasource.assets?.get(abiName);
      if (!abi) {
        issues.push(`Asset: "${abiName}" not found in project`);
        continue;
      }
      data = fs.readFileSync(path.join(projectPath, abi.file), 'utf8');
    } catch (e) {
      issues.push(`Asset: "${abiName}" not found in project`);
      continue;
    }
    let abiObj = JSON.parse(data);
    if (!Array.isArray(abiObj) && abiObj.abi) {
      abiObj = (abiObj as {abi: string[]}).abi;
    }

    const iface = new Interface(abiObj);
    const abiFunctions = Object.values(iface.functions).map((func) => func.format());
    const abiEvents = Object.values(iface.events).map((event) => event.format());

    for (const mappingHandler of datasource.mapping.handlers) {
      if (!mappingHandler?.filter) continue;

      if (mappingHandler.kind === EthereumHandlerKind.Event) {
        if (!mappingHandler.filter.topics || !mappingHandler.filter.topics.length) continue;

        const notMatch = mappingHandler.filter.topics.find(
          (topic) => topic && topic !== NOT_NULL_FILTER && !abiEvents.includes(EventFragment.fromString(topic).format())
        );

        if (notMatch) topicIssues.push(notMatch);
      }

      if (mappingHandler.kind === EthereumHandlerKind.Call) {
        if (!mappingHandler.filter.function) continue;

        const functionFormat = FunctionFragment.fromString(mappingHandler.filter.function).format();
        if (!abiFunctions.includes(functionFormat)) funcIssues.push(mappingHandler.filter.function);
      }
    }

    if (topicIssues.length) {
      issues.push(
        `Topic: "${topicIssues.join(
          ', '
        )}" not found in ${abiName} contract interface, supported topics: ${abiEvents.join(', ')}`
      );
    }
    if (funcIssues.length) {
      issues.push(
        `Function: "${funcIssues.join(
          ', '
        )}" not found in ${abiName} contract interface, supported functions: ${abiFunctions.join(', ')}`
      );
    }
  }

  assert(issues.length === 0, issues.join('\n'));
}

export function joinInputAbiName(abiObject: AbiInterface): string {
  // example: "TextChanged_bytes32_string_string_string_Event", Event name/Function type name will be joined in ejs
  const inputToSnake = abiObject.inputs.map((obj) => obj.type.replace(/\[\]/g, '_arr').toLowerCase()).join('_');
  return `${abiObject.name}_${inputToSnake}_`;
}

function inputsToArgs(inputs: AbiInput[]): string {
  const args = inputs
    .map((input) => {
      if (input.components) {
        const inner = inputsToArgs(input.components);
        if (input.type === 'tuple[]') {
          return `${inner}[]`;
        }
        return inner;
      }

      return input.type.toLowerCase();
    })
    .join(',');
  return `(${args})`;
}

export function prepareSortedAssets(
  datasources: SubqlRuntimeDatasource[],
  projectPath: string
): Record<string, string> {
  const sortedAssets: Record<string, string> = {};

  const addAsset = (name: string, value: FileReference) => {
    // should do if covert to absolute
    // if value.file is not absolute, the
    const filePath = path.join(projectPath, value.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Error: Asset ${name}, file ${value.file} does not exist`);
    }
    // We use actual abi file name instead on name provided in assets
    // This is aligning with files in './ethers-contracts'
    sortedAssets[parseContractPath(filePath).name] = value.file;
  };

  for (const d of datasources) {
    if (!d.assets) continue;
    if (!isRuntimeDs(d) && !isCustomDs(d) && !validateCustomDsDs(d)) continue;

    for (const [name, value] of d.assets.entries()) {
      addAsset(name, value);
    }
  }

  return sortedAssets;
}

// maybe refactor to use fragments ? ( can do that after the v6 migrate
export function prepareAbiJob(
  sortedAssets: Record<string, string>,
  projectPath: string,
  loadReadAbi: (filePath: string) => AbiInterface[] | {abi: AbiInterface[]}
): AbiRenderProps[] {
  const renderInterfaceJobs: AbiRenderProps[] = [];
  Object.entries(sortedAssets).forEach(([key, value]) => {
    const renderProps: AbiRenderProps = {name: key, events: [], functions: []};
    const readAbi = loadReadAbi(path.join(projectPath, value));
    // We need to use for loop instead of map, due to events/function name could be duplicate,
    // because they have different input, and following ether typegen rules, name also changed
    // we need to find duplicates, and update its name rather than just unify them.

    let abiArray: AbiInterface[] = [];

    if (!Array.isArray(readAbi)) {
      if (!readAbi.abi) {
        throw new Error(`Provided ABI is not a valid ABI or Artifact`);
      }
      abiArray = readAbi.abi;
    } else {
      abiArray = readAbi;
    }

    if (!abiArray.length) {
      throw new Error(`Invalid abi is provided at asset: ${key}, ${value}, ${abiArray.length}`);
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
          functionName = `${abiObject.name}${inputsToArgs(abiObject.inputs)}`;
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

export function getAbiNames(files: string[]): string[] {
  return files
    .filter((filename) => filename !== 'index.ts')
    .map((fileName) => path.parse(fileName).name.replace('__factory', ''));
}

export async function generateAbis(
  datasources: SubqlRuntimeDatasource[],
  projectPath: string,
  prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
  upperFirst: (input?: string) => string,
  renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>
): Promise<void> {
  // @subql/cli package calls this function with datasources as an array of objects
  datasources = datasources.map((d) => ({
    ...d,
    assets: d?.assets ? (d.assets instanceof Map ? d.assets : new Map(Object.entries(d.assets))) : undefined,
  })) as SubqlRuntimeDatasource[];

  validateAbi(datasources, projectPath);

  const sortedAssets = prepareSortedAssets(datasources, projectPath);

  if (Object.keys(sortedAssets).length === 0) {
    return prepareDirPath(path.join(projectPath, ABI_INTERFACES_ROOT_DIR), false);
  }

  await prepareDirPath(path.join(projectPath, ABI_INTERFACES_ROOT_DIR), true);
  try {
    const allFiles = glob(projectPath, Object.values(sortedAssets));
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
    const factoryFiles = fs.readdirSync(path.join(projectPath, FACTORIES_DIR));
    const abiNames = getAbiNames(factoryFiles);
    // factories index
    await Promise.all([
      // Restructure factories/index.ts
      renderTemplate(RECONSTRUCTED_FACTORIES_TS, path.join(projectPath, FACTORIES_DIR, 'index.ts'), {
        props: {abiNames},
      }),
      // Restructure contracts/index.ts
      renderTemplate(RECONSTRUCTED_CONTRACTS_TS, path.join(projectPath, CONTRACTS_DIR, 'index.ts'), {
        props: {abiNames},
      }),
    ]);

    // Iterate here as we have to make sure type chain generated successful,
    // also avoid duplicate generate same abi interfaces
    const renderAbiJobs = prepareAbiJob(sortedAssets, projectPath, loadReadAbi);
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
  } catch (e: any) {
    console.error(`! Unable to generate abi interface. ${e.message}`);
  }
}
