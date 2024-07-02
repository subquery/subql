// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import { LocalReader, loadFromJsonOrYaml } from '@subql/common';
import {
  ChainTypes,
  parseChainTypes,
  SubstrateRuntimeHandler,
  SubstrateCustomHandler,
  SubstrateHandler,
  SubstrateHandlerKind,
  isRuntimeDs,
  isCustomDs,
} from '@subql/common-substrate';
import { SANDBOX_DEFAULT_BUILTINS, saveFile } from '@subql/node-core';
import { Reader } from '@subql/types-core';
import yaml from 'js-yaml';
import { NodeVM, VMScript } from 'vm2';
import {
  SubqueryProject,
  SubstrateProjectDs,
} from '../configure/SubqueryProject';

export function isBaseHandler(
  handler: SubstrateHandler,
): handler is SubstrateRuntimeHandler {
  return Object.values<string>(SubstrateHandlerKind).includes(handler.kind);
}

export function isCustomHandler(
  handler: SubstrateHandler,
): handler is SubstrateCustomHandler {
  return !isBaseHandler(handler);
}

export async function getChainTypes(
  reader: Reader,
  root: string,
  file: string,
): Promise<ChainTypes> {
  // If the project is load from local, we will direct load them
  let raw: unknown;
  if (reader instanceof LocalReader) {
    raw = loadChainTypes(file, root);
  } else {
    // If it is stored in ipfs or other resources, we will use the corresponding reader to read the file
    // Because ipfs not provide extension of the file, it is difficult to determine its format
    // We will use yaml.load to try to load the script and parse them to supported chain types
    // if it failed, we will give it another attempt, and assume the script written in js
    // we will download it to a temp folder, and load them within sandbox
    const res = await reader.getFile(file);
    try {
      raw = yaml.load(res);
    } catch (e) {
      const chainTypesPath = await saveFile(reader, root, file, res);
      raw = loadChainTypesFromJs(chainTypesPath); //root not required, as it been packed in single js
    }
  }
  return parseChainTypes(raw);
}

export function loadChainTypes(file: string, projectRoot: string): unknown {
  const { ext } = path.parse(file);
  const filePath = path.resolve(projectRoot, file);
  if (fs.existsSync(filePath)) {
    if (ext === '.js' || ext === '.cjs') {
      //load can be self contained js file, or js depend on node_module which will require project root
      return loadChainTypesFromJs(filePath, projectRoot);
    } else if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
      return loadFromJsonOrYaml(filePath);
    } else {
      throw new Error(`Extension ${ext} not supported`);
    }
  } else {
    throw new Error(`Load from file ${file} not exist`);
  }
}

export function loadChainTypesFromJs(
  filePath: string,
  requireRoot?: string,
): unknown {
  const { base, ext } = path.parse(filePath);
  const root = requireRoot ?? path.dirname(filePath);
  const vm = new NodeVM({
    console: 'redirect',
    wasm: false,
    sandbox: {},
    require: {
      context: 'sandbox',
      external: true,
      builtin: SANDBOX_DEFAULT_BUILTINS,
      root: root,
      resolve: (moduleName: string) => {
        return require.resolve(moduleName, { paths: [root] });
      },
    },
    wrapper: 'commonjs',
    sourceExtensions: ['js', 'cjs'],
  });
  let rawContent: unknown;
  try {
    const script = new VMScript(
      `module.exports = require('${filePath}').default;`,
      path.join(root, 'sandbox'),
    ).compile();
    rawContent = vm.run(script) as unknown;
  } catch (err) {
    throw new Error(`\n NodeVM error: ${err}`);
  }
  if (rawContent === undefined) {
    throw new Error(
      `There was no default export found from required ${base} file`,
    );
  }
  return rawContent;
}

function dsContainsNonEventHandlers(ds: SubstrateProjectDs): boolean {
  if (isRuntimeDs(ds)) {
    return !!ds.mapping.handlers.find(
      (handler) => handler.kind !== SubstrateHandlerKind.Event,
    );
  } else if (isCustomDs(ds)) {
    // TODO this can be improved upon in the future.
    return true;
  }
  return true;
}

export function isOnlyEventHandlers(project: SubqueryProject): boolean {
  const hasNonEventHandler = !!project.dataSources.find((ds) =>
    dsContainsNonEventHandlers(ds),
  );
  const hasNonEventTemplate = !!project.templates.find((ds) =>
    dsContainsNonEventHandlers(ds as SubstrateProjectDs),
  );

  return !hasNonEventHandler && !hasNonEventTemplate;
}
