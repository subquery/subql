// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import telescope from '@cosmology/telescope';
import {makeTempDir} from '@subql/common';
import {CustomModule} from '@subql/types-cosmos';
import {Data} from 'ejs';
import {copySync} from 'fs-extra';
import {TELESCOPE_OPTS} from './constants';

const PROTO_INTERFACES_ROOT_DIR = 'src/types/proto-interfaces';
const PROTO_INTERFACE_TEMPLATE_PATH = path.resolve(__dirname, '../../templates/proto-interface.ts.ejs');
const TYPE_ROOT_DIR = 'src/types';

interface ProtobufRenderProps {
  messageNames: string[]; // all messages
  path: string; // should process the file Path and concat with PROTO dir
}
type CosmosChainTypeDataType = Map<string, CustomModule> | Record<string, CustomModule>;

export function processProtoFilePath(path: string): string {
  // removes `./proto` and `.proto` suffix, converts all `.` to `/`
  // should be able to accept more paths, not just from `proto directory`
  return `./proto-interfaces/${path.replace(/^\.\/proto\/|\.proto$/g, '').replace(/\./g, '/')}`;
}

export function isProtoPath(filePath: string, projectPath: string): boolean {
  // check if the protobuf files are under ./proto directory
  return !!path.join(projectPath, filePath).startsWith(path.join(projectPath, './proto/'));
}

export function prepareProtobufRenderProps(
  chainTypes: CosmosChainTypeDataType[],
  projectPath: string
): ProtobufRenderProps[] {
  return chainTypes.flatMap((chainType) => {
    return Object.entries(chainType).map(([key, value]) => {
      const filePath = path.join(projectPath, value.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Error: chainType ${key}, file ${value.file} does not exist`);
      }
      if (!isProtoPath(value.file, projectPath)) {
        console.error(
          `Codegen will not apply for this file: ${value.file} Please ensure it is under the ./proto directory if you want to run codegen on it`
        );
      }
      return {
        messageNames: value.messages,
        path: processProtoFilePath(value.file),
      };
    });
  });
}

export async function tempProtoDir(projectPath: string): Promise<string> {
  const tmpDir = await makeTempDir();
  const userProto = path.join(projectPath, './proto');
  const commonProtoPaths = [
    require('@protobufs/amino'),
    require('@protobufs/confio'),
    require('@protobufs/cosmos'),
    require('@protobufs/cosmos_proto'),
    require('@protobufs/gogoproto'),
    require('@protobufs/google'),
    require('@protobufs/ibc'),
    require('@protobufs/tendermint'),
  ];

  commonProtoPaths.forEach((p) => {
    // ensure output format is a dir
    copySync(p, path.join(tmpDir, `${p.replace(path.dirname(p), '')}`));
  });
  copySync(userProto, tmpDir, {overwrite: true});
  return tmpDir;
}

export async function generateProto(
  chainTypes: CosmosChainTypeDataType[],
  projectPath: string,
  prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
  renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>,
  upperFirst: (string?: string) => string,
  mkdirProto: (projectPath: string) => Promise<string>
): Promise<void> {
  let tmpPath: string;
  try {
    tmpPath = await mkdirProto(projectPath);
    const protobufRenderProps = prepareProtobufRenderProps(chainTypes, projectPath);
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
    throw new Error(`Failed to generate from protobufs. ${e.message}, ${errorMessage}`);
  } finally {
    fs.rmSync(tmpPath, {recursive: true, force: true});
  }
}
