// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import telescope from '@cosmology/telescope';
import cosmwasmCodegen from '@cosmwasm/ts-codegen';
import {makeTempDir} from '@subql/common';
import {CosmosChaintypes, CustomModule, CosmosRuntimeDatasource} from '@subql/types-cosmos';
import {Data} from 'ejs';
import {copySync} from 'fs-extra';
import {upperFirst} from 'lodash';
import {IDLObject} from 'wasm-ast-types';
import {isRuntimeCosmosDs} from '../project';
import {COSMWASM_OPTS, TELESCOPE_OPTS} from './constants';
import {loadCosmwasmAbis, tmpProtoDir} from './util';

const TYPE_ROOT_DIR = 'src/types';

// Proto to ts
const PROTO_INTERFACES_ROOT_DIR = 'src/types/proto-interfaces';
const PROTO_INTERFACE_TEMPLATE_PATH = path.resolve(__dirname, '../../templates/proto-interface.ts.ejs');

// CosmWasm to ts
const COSMWASM_INTERFACES_ROOT_DIR = 'src/types/cosmwasm-interfaces';
const COSMWASM_INTERFACE_WRAPPER_PATH = '/src/types/cosmwasm-interface-wrappers';
const COSMWASM_INTERFACE_TEMPLATE_PATH = path.resolve(__dirname, '../../templates/cosmwasm-interfaces.ts.ejs');

interface ProtobufRenderProps {
  /**
   * The dot notation format of the path without PROTO dir
   * @exmaple
   * 'cosmos.auth.v1beta1.tx'
   * */
  namespace: string;
  /**
   * The camel case format of the path without PROTO dir
   * @example
   * 'CosmosAuthV1Beta1Tx'
   * */
  name: string;
  messageNames: string[]; // all messages
  path: string; // should process the file Path and concat with PROTO dir
}
type CosmosChainTypeDataType = CosmosChaintypes | Record<string, CustomModule>;

interface CosmwasmRenderJobType {
  contract: string;
  messages: Record<string, string>;
}

export function processProtoFilePath(path: string): string {
  // removes `./proto` and `.proto` suffix, converts all `.` to `/`
  // should be able to accept more paths, not just from `proto directory`
  return `./proto-interfaces/${path.replace(/^\.\/proto\/|\.proto$/g, '').replace(/\./g, '/')}`;
}

function pathToNamespace(path: string): string {
  return path
    .replace(/^\.\/proto\/|\.proto$/g, '')
    .split(/(?<=\\\\)\/|(?<!\\)\//)
    .join('.');
}

function pathToName(path: string): string {
  return pathToNamespace(path)
    .split('.')
    .map((p) => upperFirst(p))
    .join('');
}

export function isProtoPath(filePath: string, projectPath: string): boolean {
  // check if the protobuf files are under ./proto directory
  return !!path.join(projectPath, filePath).startsWith(path.join(projectPath, './proto/'));
}

export function prepareCosmwasmJobs(
  sortedAssets: Record<string, string>,
  loadReadAbi: (filePath: string) => IDLObject,
  upperFirst: (input?: string) => string
): CosmwasmRenderJobType[] {
  return Object.keys(sortedAssets).map((key) => {
    const value = sortedAssets[key];
    const readContract = loadReadAbi(value);
    const msgObject: Record<string, string> = {
      MsgInstantiateContract: upperFirst(readContract.instantiate?.title),
      MsgMigrateContract: upperFirst(readContract.migrate?.title),
      MsgExecuteContract: upperFirst(readContract.execute?.title),
    };

    const cleanObject: Record<string, string> = {};

    for (const key in msgObject) {
      if (msgObject[key]) {
        cleanObject[key] = msgObject[key];
      }
    }

    return {
      contract: upperFirst(key),
      messages: cleanObject,
    };
  });
}

export function prepareSortedAssets(
  datasources: CosmosRuntimeDatasource[],
  projectPath: string
): Record<string, string> {
  const sortedAssets: Record<string, string> = {};
  datasources
    .filter((d) => !!d?.assets && isRuntimeCosmosDs(d))
    .forEach((d) => {
      Object.entries(d.assets).map(([name, value]) => {
        const filePath = path.join(projectPath, value.file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Error: Asset ${name}, file ${value.file} does not exist`);
        }
        // using name provided in assets
        sortedAssets[name] = filePath;
      });
    });
  return sortedAssets;
}

export async function generateCosmwasm(
  datasources: CosmosRuntimeDatasource[],
  projectPath: string,
  prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
  upperFirst: (input?: string) => string,
  renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>
): Promise<void> {
  const sortedAssets = prepareSortedAssets(datasources, projectPath);

  if (Object.keys(sortedAssets).length === 0) {
    return prepareDirPath(path.join(projectPath, COSMWASM_INTERFACES_ROOT_DIR), false);
  }
  await Promise.all([
    prepareDirPath(path.join(projectPath, COSMWASM_INTERFACES_ROOT_DIR), true),
    prepareDirPath(path.join(projectPath, COSMWASM_INTERFACE_WRAPPER_PATH), true),
  ]);

  try {
    await cosmwasmCodegen(
      COSMWASM_OPTS(
        path.join(projectPath, COSMWASM_INTERFACES_ROOT_DIR),
        Object.entries(sortedAssets).map(([name, dir]) => ({name, dir: path.dirname(dir)}))
      )
    );
    const renderJobs = prepareCosmwasmJobs(sortedAssets, loadCosmwasmAbis, upperFirst);

    await Promise.all(
      renderJobs.map((job) => {
        console.log('Cosmwasm types generated');
        return renderTemplate(
          COSMWASM_INTERFACE_TEMPLATE_PATH,
          path.join(projectPath, COSMWASM_INTERFACE_WRAPPER_PATH, `${job.contract}MsgWrapper.ts`),
          {
            props: {abi: job},
            helper: {upperFirst},
          }
        );
      })
    );
  } catch (e) {
    console.error(
      `! Unable to generate from provided cosmwasm interface. ${e.message}\n` +
        'Please check the path of your abi path in the project.yaml'
    );
  }
}

export function prepareProtobufRenderProps(
  chaintypes: (CosmosChainTypeDataType | undefined)[] | undefined,
  projectPath: string
): ProtobufRenderProps[] {
  if (!chaintypes) {
    return [];
  }
  return chaintypes.filter(Boolean).flatMap((chaintype) => {
    return Object.entries(chaintype)
      .map(([key, value]) => {
        const filePath = path.join(projectPath, value.file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Error: chainType ${key}, file ${value.file} does not exist`);
        }
        if (!isProtoPath(value.file, projectPath)) {
          console.error(
            `Codegen will not apply for this file: ${value.file} Please ensure it is under the ./proto directory if you want to run codegen on it`
          );
        }

        // We only need to generate for RPC messages that are always prefixed with Msg
        const messages = value.messages.filter((m: string) => m.indexOf('Msg') === 0);
        if (!messages.length) return;

        return {
          messageNames: messages,
          namespace: pathToNamespace(value.file),
          name: pathToName(value.file),
          path: processProtoFilePath(value.file),
        };
      })
      .filter(Boolean);
  });
}

/**
 * Makes a temporaray directory and populates it with some core protobufs used by all projects, then copies over the projects protobufs
 * */
export async function tempProtoDir(projectPath: string): Promise<string> {
  const tmpDir = await makeTempDir();
  const userProto = path.join(projectPath, './proto');
  const commonProtoPaths = [
    require('@protobufs/amino'),
    require('@protobufs/confio'),
    require('@protobufs/cosmos'),
    require('@protobufs/cosmos_proto'),
    require('@protobufs/cosmwasm'),
    require('@protobufs/gogoproto'),
    require('@protobufs/google'),
    require('@protobufs/ibc'),
    require('@protobufs/tendermint'),
  ];

  commonProtoPaths.forEach((p) => {
    // ensure output format is a dir
    copySync(p, tmpProtoDir(tmpDir, p));
  });
  copySync(userProto, tmpDir, {overwrite: true});
  return tmpDir;
}

export async function generateProto(
  chaintypes: CosmosChainTypeDataType[],
  projectPath: string,
  prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
  renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>,
  upperFirst: (string?: string) => string,
  /** @deprecated */
  mkdirProto?: (projectPath: string) => Promise<string>
): Promise<void> {
  let tmpPath: string;
  try {
    tmpPath = await tempProtoDir(projectPath);
    const protobufRenderProps = prepareProtobufRenderProps(chaintypes, projectPath);
    const outputPath = path.join(projectPath, PROTO_INTERFACES_ROOT_DIR);
    await prepareDirPath(path.join(projectPath, PROTO_INTERFACES_ROOT_DIR), true);

    await telescope({
      protoDirs: [tmpPath],
      outPath: outputPath,
      options: TELESCOPE_OPTS,
    });
    console.log('* Protobuf types generated !');

    await renderTemplate(
      PROTO_INTERFACE_TEMPLATE_PATH,
      path.join(projectPath, TYPE_ROOT_DIR, 'CosmosMessageTypes.ts'),
      {
        props: {proto: protobufRenderProps},
        helper: {upperFirst},
      }
    );
    console.log('* Cosmos message wrappers generated !');
  } catch (e: any) {
    const errorMessage = e.message.startsWith('Dependency')
      ? `Please add the missing protobuf file to ./proto directory`
      : '';
    console.log('ERRROR', e);
    throw new Error(`Failed to generate from protobufs. ${e.message}, ${errorMessage}`);
  } finally {
    fs.rmSync(tmpPath, {recursive: true, force: true});
  }
}
