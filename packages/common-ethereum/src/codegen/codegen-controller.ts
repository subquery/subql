// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {isCustomDs, isRuntimeDs} from '@subql/common-ethereum';
import {SubqlRuntimeDatasource} from '@subql/types-ethereum';
import {Data} from 'ejs';
import {runTypeChain, glob, parseContractPath} from 'typechain';
import {CUSTOM_EVM_HANDLERS} from './constants';
import {loadReadAbi} from './utils';

const ABI_INTERFACE_TEMPLATE_PATH = path.resolve(__dirname, '../../templates/abi-interface.ts.ejs');
const ABI_INTERFACES_ROOT_DIR = 'src/types/abi-interfaces';
const CONTRACTS_DIR = 'src/types/contracts'; //generated
const TYPECHAIN_TARGET = 'ethers-v5';

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

function validateCustomDsDs(d: {kind: string}): boolean {
  return CUSTOM_EVM_HANDLERS.includes(d.kind);
}

export function joinInputAbiName(abiObject: abiInterface): string {
  // example: "TextChanged_bytes32_string_string_string_Event", Event name/Function type name will be joined in ejs
  const inputToSnake = abiObject.inputs.map((obj) => obj.type.replace(/\[\]/g, '_arr').toLowerCase()).join('_');
  return `${abiObject.name}_${inputToSnake}_`;
}

export function prepareSortedAssets(
  datasources: SubqlRuntimeDatasource[],
  projectPath: string
): Record<string, string> {
  const sortedAssets: Record<string, string> = {};
  datasources
    .filter((d) => !!d?.assets && (isRuntimeDs(d) || isCustomDs(d) || validateCustomDsDs(d)))
    .forEach((d) => {
      Object.entries(d.assets).map(([name, value]) => {
        // should do a if covert to absolute
        // if value.file is not absolute, the
        const filePath = path.join(projectPath, value.file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Error: Asset ${name}, file ${value.file} does not exist`);
        }
        // We use actual abi file name instead on name provided in assets
        // This is aligning with files in './ethers-contracts'
        sortedAssets[parseContractPath(filePath).name] = value.file;
      });
    });
  return sortedAssets;
}

// maybe refactor to use fragments ? ( can do that after the v6 migrate
export function prepareAbiJob(
  sortedAssets: Record<string, string>,
  projectPath: string,
  loadReadAbi: (filePath: string) => abiInterface[] | {abi: abiInterface[]}
): abiRenderProps[] {
  const renderInterfaceJobs: abiRenderProps[] = [];
  Object.entries(sortedAssets).forEach(([key, value]) => {
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
      throw new Error(`Invalid abi is provided at asset: ${key}, ${value}, ${(readAbi as any).length}`);
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

export async function generateAbis(
  datasources: SubqlRuntimeDatasource[],
  projectPath: string,
  prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
  upperFirst: (input?: string) => string,
  renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>
): Promise<void> {
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
  } catch (e) {
    console.error(`! Unable to generate abi interface. ${e.message}`);
  }
}
