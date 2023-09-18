// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import ts from 'typescript';
import {NodeVM, VMScript} from 'vm2';

// Support .js .ts manifest
export async function loadProjectFromScript(
  filePath: string,
  requireRoot?: string,
  unsafe?: boolean
): Promise<unknown> {
  const {base, ext} = path.parse(filePath);
  const root = requireRoot ?? path.dirname(filePath);
  const vm = new NodeVM({
    // add compiler for ts, https://github.com/patriksimek/vm2/issues/323
    console: 'redirect',
    wasm: unsafe,
    sandbox: {},
    require: {
      builtin: unsafe ? ['*'] : ['assert', 'buffer', 'crypto', 'util', 'path', 'url'],
      external: true,
      context: 'sandbox',
      root,
      resolve: (moduleName: string) => {
        return require.resolve(moduleName, {paths: [root]});
      },
    },
    wrapper: 'commonjs',
    sourceExtensions: ['js', 'ts', 'cjs'],
    compiler: (code: string, filename: string) => ts.transpile(code, undefined, filename),
  });
  let rawContent: unknown;

  try {
    const script = new VMScript(
      `const project = require('${filePath}');
      module.exports = project.default;
    `,
      path.join(root, 'sandbox')
    ).compile();
    rawContent = (await vm.run(script)) as unknown;
  } catch (err) {
    throw new Error(`\n NodeVM error: ${err}`);
  }
  if (rawContent === undefined) {
    throw new Error(`There was no default export found from required ${base} file`);
  }
  return rawContent;
}
